// dsh-deepseek-balance - Host half.
// Real-time DeepSeek account balance + official top-up entry.
// Static dual-face plugin: browser calls arrive as same-origin HTTP routes on the
// local dsh web server (no Remote service, no dynamic harness RPC, no shell/curl).

const BALANCE_URL = 'https://api.deepseek.com/user/balance'
const TOPUP_URL = 'https://platform.deepseek.com/top_up'
const API_KEYS_URL = 'https://platform.deepseek.com/api_keys'
const KEY_REF_STORED = 'DEEPSEEK_BALANCE_API_KEY'
const KEY_REF_ENV = 'DEEPSEEK_API_KEY'
const KEY_PATTERN = /^sk-[A-Za-z0-9]{8,64}$/

let sessionKey = ''

export const name = 'dsh-deepseek-balance'
export const inject = []

function maskKey(key) {
  if (typeof key !== 'string' || key.length < 8) return ''
  const dots = '·'.repeat(Math.min(8, key.length - 7))
  return key.slice(0, 3) + dots + key.slice(-4)
}

export function apply(ctx) {
  if (typeof ctx.inject !== 'function') return
  ctx.inject(['webServer'], (scope) => {
    const webServer = scope.webServer
    if (!webServer || typeof webServer.register !== 'function') {
      console.error('[dsh-deepseek-balance] webServer unavailable; routes skipped')
      return
    }
    registerRoutes(webServer, ctx)
  })
}

async function resolveKey(ctx) {
  // 快速路径：同步读进程环境变量并缓存，请求路径零异步依赖，
  // 避免启动高峰期事件循环拥塞导致浏览器端超时；凭证库仅作后备。
  if (sessionKey !== '') return { key: sessionKey, source: 'session' }
  try {
    const env = process.env[KEY_REF_ENV]
    if (typeof env === 'string' && env !== '' && KEY_PATTERN.test(env)) {
      sessionKey = env
      return { key: env, source: 'env' }
    }
  } catch (err) {}
  const creds = ctx.get('credentials')
  if (creds && typeof creds.resolve === 'function') {
    for (const ref of [KEY_REF_STORED, KEY_REF_ENV]) {
      try {
        const resolved = await creds.resolve(ref)
        if (resolved && typeof resolved.value === 'string' && resolved.value !== '') {
          return { key: resolved.value, source: ref === KEY_REF_STORED ? 'stored' : 'env' }
        }
      } catch (err) {}
    }
  }
  try {
    const env = process.env[KEY_REF_ENV]
    if (typeof env === 'string' && env !== '') return { key: env, source: 'env' }
  } catch (err) {}
  return { key: '', source: 'none' }
}

async function fetchBalance(key) {
  let res
  try {
    res = await fetch(BALANCE_URL, {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + key },
      signal: AbortSignal.timeout(20000),
    })
  } catch (err) {
    return { ok: false, error: '余额请求失败: ' + String(err && err.message ? err.message : err) }
  }
  const text = await res.text()
  if (!res.ok) {
    if (/Authentication Fails/i.test(text)) {
      return { ok: false, error: '官方接口拒绝认证: ' + text.trim().slice(0, 160), needKey: true }
    }
    return { ok: false, error: '余额请求失败（HTTP ' + res.status + '）: ' + text.trim().slice(0, 160) }
  }
  let data
  try {
    data = JSON.parse(text)
  } catch (err) {
    return { ok: false, error: '官方接口返回异常: ' + text.trim().slice(0, 160) }
  }
  if (!data || !Array.isArray(data.balance_infos)) {
    return { ok: false, error: '余额接口返回格式异常' }
  }
  return {
    ok: true,
    balance: {
      isAvailable: data.is_available === true,
      infos: data.balance_infos.map((info) => ({
        currency: typeof info.currency === 'string' ? info.currency : '',
        total: info.total_balance === undefined || info.total_balance === null ? '' : String(info.total_balance),
        granted: info.granted_balance === undefined || info.granted_balance === null ? '' : String(info.granted_balance),
        toppedUp: info.topped_up_balance === undefined || info.topped_up_balance === null ? '' : String(info.topped_up_balance),
      })),
    },
  }
}

function json(res, code, body) {
  res.writeHead(code, { 'content-type': 'application/json' })
  res.end(JSON.stringify(body))
}

async function readJsonBody(req) {
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > 65536) throw new Error('body too large')
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function registerRoutes(webServer, ctx) {
  webServer.register({
    name: 'dsh-balance-config',
    kind: 'exact',
    path: '/dsh-balance/config',
    handler: async (req, res) => {
      try {
        if (req.method !== 'GET') return json(res, 405, { error: 'method not allowed' })
        const found = await resolveKey(ctx)
        return json(res, 200, { hasKey: found.key !== '', masked: maskKey(found.key), source: found.source })
      } catch (err) {
        return json(res, 500, { error: String(err && err.message ? err.message : err) })
      }
    },
  })

  webServer.register({
    name: 'dsh-balance-key',
    kind: 'exact',
    path: '/dsh-balance/key',
    handler: async (req, res) => {
      try {
        if (req.method !== 'POST') return json(res, 405, { error: 'method not allowed' })
        const body = await readJsonBody(req)
        const raw = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
        if (!KEY_PATTERN.test(raw)) return json(res, 400, { error: 'API Key 格式不正确：应以 sk- 开头' })
        sessionKey = raw
        let persisted = false
        const creds = ctx.get('credentials')
        if (creds && typeof creds.set === 'function') {
          try {
            await creds.set(KEY_REF_STORED, raw)
            persisted = true
          } catch (err) {
            console.error('[dsh-deepseek-balance] persist key failed:', err)
          }
        }
        return json(res, 200, { ok: true, masked: maskKey(raw), persisted })
      } catch (err) {
        return json(res, 500, { error: String(err && err.message ? err.message : err) })
      }
    },
  })

  webServer.register({
    name: 'dsh-balance-key-clear',
    kind: 'exact',
    path: '/dsh-balance/key/clear',
    handler: async (req, res) => {
      try {
        if (req.method !== 'POST') return json(res, 405, { error: 'method not allowed' })
        sessionKey = ''
        const creds = ctx.get('credentials')
        if (creds && typeof creds.unset === 'function') {
          try {
            await creds.unset(KEY_REF_STORED)
          } catch (err) {
            console.error('[dsh-deepseek-balance] clear stored key failed:', err)
          }
        }
        return json(res, 200, { ok: true })
      } catch (err) {
        return json(res, 500, { error: String(err && err.message ? err.message : err) })
      }
    },
  })

  webServer.register({
    name: 'dsh-balance-fetch',
    kind: 'exact',
    path: '/dsh-balance/fetch',
    handler: async (req, res) => {
      try {
        if (req.method !== 'GET') return json(res, 405, { error: 'method not allowed' })
        const found = await resolveKey(ctx)
        if (found.key === '') return json(res, 200, { ok: false, error: '尚未配置 DeepSeek API Key', needKey: true })
        if (!KEY_PATTERN.test(found.key)) return json(res, 200, { ok: false, error: '检测到已配置的密钥格式异常，请在面板中重新输入 API Key', needKey: true })
        const outcome = await fetchBalance(found.key)
        return json(res, 200, outcome)
      } catch (err) {
        return json(res, 500, { error: String(err && err.message ? err.message : err) })
      }
    },
  })

  webServer.register({
    name: 'dsh-balance-topup',
    kind: 'exact',
    path: '/dsh-balance/topup',
    handler: async (req, res) => {
      try {
        if (req.method !== 'GET') return json(res, 405, { error: 'method not allowed' })
        return json(res, 200, { topup: TOPUP_URL, apiKeys: API_KEYS_URL })
      } catch (err) {
        return json(res, 500, { error: String(err && err.message ? err.message : err) })
      }
    },
  })
}
