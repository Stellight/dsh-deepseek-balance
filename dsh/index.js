// dsh-deepseek-balance - Host half (v1.3.0).
// Real-time DeepSeek account balance + official top-up entry.
// v1.2: model-aware credential resolution (selected provider -> apiKeyEnv ref
// from the settings providers table) and a per-day consumption baseline
// persisted under ~/.dsh/dsh-balance-state.json.

import { homedir } from 'node:os'
import { join } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'

const BALANCE_URL = 'https://api.deepseek.com/user/balance'
const TOPUP_URL = 'https://platform.deepseek.com/top_up'
const API_KEYS_URL = 'https://platform.deepseek.com/api_keys'
const KEY_REF_STORED = 'DEEPSEEK_BALANCE_API_KEY'
const KEY_REF_ENV = 'DEEPSEEK_API_KEY'
const KEY_PATTERN = /^sk-[A-Za-z0-9]{8,64}$/

let sessionKey = ''
let envCache = ''

export const name = 'dsh-deepseek-balance'
export const inject = []

function statePath() {
  try {
    return join(homedir(), '.dsh', 'dsh-balance-state.json')
  } catch (err) {
    return ''
  }
}

async function loadState() {
  const p = statePath()
  if (p === '') return { date: '', start: {}, toppedUp: {}, prev: {} }
  try {
    const parsed = JSON.parse(await readFile(p, 'utf8'))
    if (parsed && typeof parsed === 'object') {
      return {
        date: typeof parsed.date === 'string' ? parsed.date : '',
        start: parsed.start && typeof parsed.start === 'object' ? parsed.start : {},
        toppedUp: parsed.toppedUp && typeof parsed.toppedUp === 'object' ? parsed.toppedUp : {},
        prev: parsed.prev && typeof parsed.prev === 'object' ? parsed.prev : {},
      }
    }
  } catch (err) {}
  return { date: '', start: {}, toppedUp: {}, prev: {} }
}

async function saveState(state) {
  const p = statePath()
  if (p === '') return
  try {
    await writeFile(p, JSON.stringify(state), 'utf8')
  } catch (err) {}
}

function localDate() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return d.getFullYear() + '-' + m + '-' + day
}

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
    armMidnightSnapshot(ctx)
  })
}


async function resolveCredentialValue(ctx, ref) {
  const creds = ctx.get('credentials')
  if (creds && typeof creds.resolve === 'function') {
    try {
      const resolved = await creds.resolve(ref)
      if (resolved && typeof resolved.value === 'string' && resolved.value !== '') return resolved.value
    } catch (err) {}
  }
  try {
    const env = process.env[ref]
    if (typeof env === 'string' && env !== '') return env
  } catch (err) {}
  return ''
}

async function resolveKey(ctx) {
  // 仅使用 DeepSeek 官方账户的密钥：手动输入 > 环境变量 > 凭证库保存值。
  // （按所选模型渠道切换余额的功能已移除。）
  if (sessionKey !== '') return { key: sessionKey, source: 'session' }
  if (envCache === '') {
    try {
      const env = process.env[KEY_REF_ENV]
      if (typeof env === 'string' && env !== '' && KEY_PATTERN.test(env)) envCache = env
    } catch (err) {}
  }
  if (envCache !== '') return { key: envCache, source: 'env' }
  const stored = await resolveCredentialValue(ctx, KEY_REF_STORED)
  if (stored !== '') return { key: stored, source: 'stored' }
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

function updateTodayState(state, balance) {
  const today = localDate()
  if (state.date !== today) {
    // 新的一天：无午夜快照（进程白天才启动，昨夜无消耗）时以当前余额为新基线；
    // 若进程跨夜运行，午夜快照定时器已把 state.date 置为今天并记录快照基准，此处不重置。
    state.date = today
    state.start = {}
    state.toppedUp = {}
    state.prev = {}
    for (const info of balance.infos) {
      if (info.total !== '') {
        state.start[info.currency] = info.total
        state.toppedUp[info.currency] = '0'
        state.prev[info.currency] = info.total
      }
    }
  }
  const list = []
  for (const info of balance.infos) {
    const cur = parseFloat(info.total)
    const prevRaw = typeof state.prev[info.currency] === 'string' ? state.prev[info.currency] : (typeof state.start[info.currency] === 'string' ? state.start[info.currency] : '0')
    const prev = parseFloat(prevRaw)
    if (Number.isFinite(prev) && Number.isFinite(cur) && cur > prev) {
      // 余额回升：视为充值，累计进 toppedUp，不清零当日消耗
      const topped = parseFloat(typeof state.toppedUp[info.currency] === 'string' ? state.toppedUp[info.currency] : '0')
      state.toppedUp[info.currency] = ((Number.isFinite(topped) ? topped : 0) + (cur - prev)).toFixed(2)
    }
    if (info.total !== '') state.prev[info.currency] = info.total
    const start = parseFloat(typeof state.start[info.currency] === 'string' ? state.start[info.currency] : '0')
    const topped = parseFloat(typeof state.toppedUp[info.currency] === 'string' ? state.toppedUp[info.currency] : '0')
    let consumed = 0
    if (Number.isFinite(start) && Number.isFinite(topped) && Number.isFinite(cur)) {
      consumed = Math.max(0, start + topped - cur)
    }
    list.push({ currency: info.currency, consumed: consumed.toFixed(2) })
  }
  return list
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

let midnightTimer = null
function armMidnightSnapshot(ctx) {
  if (midnightTimer !== null) return
  const now = Date.now()
  const d = new Date(now)
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 2)
  const delay = Math.max(1000, next.getTime() - now)
  midnightTimer = setTimeout(async () => {
    midnightTimer = null
    let ok = false
    try {
      const found = await resolveKey(ctx)
      if (found.key !== '' && KEY_PATTERN.test(found.key)) {
        const outcome = await fetchBalance(found.key)
        if (outcome.ok) {
          const state = await loadState()
          const today = localDate()
          state.date = today
          state.start = {}
          state.toppedUp = {}
          state.prev = {}
          for (const info of outcome.balance.infos) {
            if (info.total !== '') {
              state.start[info.currency] = info.total
              state.toppedUp[info.currency] = '0'
              state.prev[info.currency] = info.total
            }
          }
          await saveState(state)
          ok = true
        }
      }
    } catch (err) {}
    if (ok) {
      armMidnightSnapshot(ctx)
    } else {
      midnightTimer = setTimeout(() => {
        midnightTimer = null
        armMidnightSnapshot(ctx)
      }, 60000)
    }
  }, delay)
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
        return json(res, 200, {
          hasKey: found.key !== '',
          masked: maskKey(found.key),
          source: found.source,
        })
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
        if (found.key === '') {
          return json(res, 200, { ok: false, error: '尚未配置 DeepSeek API Key', needKey: true, source: found.source })
        }
        const outcome = await fetchBalance(found.key)
        outcome.source = found.source
        if (outcome.ok) {
          const state = await loadState()
          outcome.today = updateTodayState(state, outcome.balance)
          await saveState(state)
        }
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