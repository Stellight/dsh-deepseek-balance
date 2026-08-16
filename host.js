// dsh-deepseek-balance — Host half (code.host for cordis_define)
// DeepSeek Harness dynamic Cordis plugin: real-time DeepSeek account balance + official top-up entry.
//
// 使用方式：将本文件内容作为 cordis_define 的 code.host 传入（配合 client.js 作为 code.client）。
// 安全说明：本插件不包含、不存储任何 API Key。密钥按以下顺序从运行时获取：
//   1) 会话内存（用户在面板中输入的密钥）
//   2) DSH 凭证库 ref `DEEPSEEK_BALANCE_API_KEY`
//   3) 凭证库/环境中的 `DEEPSEEK_API_KEY`
// 密钥仅经子进程环境变量传给 curl，不写入命令行、不落盘。

const KEY_REF_STORED = 'DEEPSEEK_BALANCE_API_KEY'
const KEY_REF_ENV = 'DEEPSEEK_API_KEY'
const KEY_PATTERN = /^sk-[A-Za-z0-9]{8,64}$/
const BALANCE_URL = 'https://api.deepseek.com/user/balance'
const TOPUP_URL = 'https://platform.deepseek.com/top_up'
const API_KEYS_URL = 'https://platform.deepseek.com/api_keys'

let memoryKey = ''

function maskKey(key) {
  if (typeof key !== 'string' || key.length < 8) return ''
  const dots = '·'.repeat(Math.min(8, key.length - 7))
  return key.slice(0, 3) + dots + key.slice(-4)
}

return {
  apply(ctx) {
    const shell = ctx.get('shell')
    const creds = ctx.get('credentials')
    const sandboxPolicy = ctx.get('sandboxPolicy')
    const workspaceRoot = sandboxPolicy !== undefined && typeof sandboxPolicy.workspaceRoot === 'string' ? sandboxPolicy.workspaceRoot : ''

    async function resolveCredential(ref) {
      if (creds === undefined) return ''
      try {
        const resolved = await creds.resolve(ref)
        if (resolved !== undefined && resolved !== null && typeof resolved === 'object' && typeof resolved.value === 'string' && resolved.value !== '') {
          return resolved.value
        }
      } catch (err) {
        console.error('[dsbal] read credential ' + ref + ' failed:', String(err))
      }
      return ''
    }

    async function currentKey() {
      if (memoryKey !== '') return { key: memoryKey, source: 'session' }
      const stored = await resolveCredential(KEY_REF_STORED)
      if (stored !== '') return { key: stored, source: 'stored' }
      const envKey = await resolveCredential(KEY_REF_ENV)
      if (envKey !== '') return { key: envKey, source: 'env' }
      return { key: '', source: 'none' }
    }

    // 本部署的 shell 服务可能是 PowerShell 执行器（dsh-pwsh-sandbox，Windows PowerShell 5.1），
    // 因此命令必须用 PowerShell 语法。密钥经环境变量传入（$env:DSB_API_KEY），不写命令行、不落盘。
    // 沙箱策略按执行器指引声明 danger-full-access（部分 Windows 主机 ACL 后端因工作区覆盖临时目录而不可用）。
    async function fetchBalance(key) {
      if (shell === undefined) {
        return { ok: false, error: '宿主环境没有 shell 服务，无法请求余额接口' }
      }
      const header = "('Authorization: Bearer ' + $env:DSB_API_KEY)"
      const body = "curl.exe -sS -m 20 -H " + header + " '" + BALANCE_URL + "'; exit $LASTEXITCODE"
      const bodyFallback = "curl -sS -m 20 -H " + header + " '" + BALANCE_URL + "'; exit $LASTEXITCODE"
      const command = "if (Get-Command curl.exe -ErrorAction SilentlyContinue) { " + body + " } else { " + bodyFallback + " }"
      const spec = shell.resolve({
        command: command,
        env: { DSB_API_KEY: key },
        timeoutMs: 30000,
        stdoutMaxBytes: 16384,
        sandboxPolicy: { mode: 'danger-full-access', workspaceRoot: workspaceRoot },
      })
      let result
      try {
        result = await shell.run(spec)
      } catch (err) {
        return { ok: false, error: 'shell 执行失败: ' + String(err && err.message ? err.message : err) }
      }
      const out = (result.stdout && result.stdout.text) || ''
      const errOut = (result.stderr && result.stderr.text) || ''
      if (result.exitCode !== 0 || out.trim() === '') {
        return { ok: false, error: '余额请求失败（exit ' + result.exitCode + '）: ' + (errOut.trim() || out.trim() || '无响应内容') }
      }
      if (/Authentication Fails/i.test(out)) {
        return { ok: false, error: '官方接口拒绝认证: ' + out.trim().slice(0, 160) }
      }
      let data
      try {
        data = JSON.parse(out.trim())
      } catch (err) {
        return { ok: false, error: '官方接口返回异常: ' + out.trim().slice(0, 160) }
      }
      if (data && typeof data === 'object' && data.error) {
        const msg = data.error && typeof data.error.message === 'string' ? data.error.message : '接口返回错误'
        return { ok: false, error: msg }
      }
      if (!data || !Array.isArray(data.balance_infos)) {
        return { ok: false, error: '余额接口返回格式异常' }
      }
      return {
        ok: true,
        balance: {
          isAvailable: data.is_available === true,
          infos: data.balance_infos.map(function (info) {
            return {
              currency: typeof info.currency === 'string' ? info.currency : '',
              total: info.total_balance === undefined || info.total_balance === null ? '' : String(info.total_balance),
              granted: info.granted_balance === undefined || info.granted_balance === null ? '' : String(info.granted_balance),
              toppedUp: info.topped_up_balance === undefined || info.topped_up_balance === null ? '' : String(info.topped_up_balance),
            }
          }),
        },
      }
    }

    async function diagnoseAuth(key) {
      if (shell === undefined) return ''
      const parts = [
        "'PS=' + $PSVersionTable.PSVersion.ToString()",
        "$c = Get-Command curl.exe -ErrorAction SilentlyContinue; if ($c) { 'CURLEXE=' + $c.Source } else { 'CURLEXE=MISSING' }",
        "$c2 = Get-Command curl -ErrorAction SilentlyContinue; if ($c2) { 'CURL=' + $c2.Source } else { 'CURL=MISSING' }",
        "$X = [Console]::In.ReadToEnd().Trim()",
        "'KEYLEN=' + $X.Length",
        "if ($X.Length -ge 3) { 'KEYHEAD=' + $X.Substring(0, 3) }",
        "curl.exe -sS -m 20 -w \"`nHTTP_EXE=%{http_code}\" -H ('Authorization: Bearer ' + $X) '" + BALANCE_URL + "' 2>$null; 'EXIT_EXE=' + $LASTEXITCODE",
      ]
      try {
        const spec = shell.resolve({
          command: parts.join('; '),
          stdin: key,
          timeoutMs: 60000,
          stdoutMaxBytes: 8192,
          sandboxPolicy: { mode: 'danger-full-access', workspaceRoot: workspaceRoot },
        })
        const result = await shell.run(spec)
        const out = (result.stdout && result.stdout.text) || ''
        const errOut = (result.stderr && result.stderr.text) || ''
        const combined = (out.trim() + (errOut.trim() !== '' ? ' | stderr: ' + errOut.trim() : '')).slice(0, 900)
        return combined === '' ? '(empty)' : combined
      } catch (err) {
        return 'probe failed: ' + String(err && err.message ? err.message : err)
      }
    }

    harness.handle('config.get', async function () {
      const found = await currentKey()
      return {
        hasKey: found.key !== '',
        masked: maskKey(found.key),
        source: found.source,
        persistCapable: creds !== undefined,
      }
    })

    harness.handle('key.set', async function (args) {
      const raw = args && typeof args.apiKey === 'string' ? args.apiKey.trim() : ''
      if (!KEY_PATTERN.test(raw)) {
        return { ok: false, error: 'API Key 格式不正确：应以 sk- 开头（可在开放平台创建）' }
      }
      memoryKey = raw
      let persisted = false
      if (creds !== undefined) {
        try {
          await creds.set(KEY_REF_STORED, raw)
          persisted = true
        } catch (err) {
          console.error('[dsbal] persist key failed:', String(err))
        }
      }
      return { ok: true, masked: maskKey(raw), persisted: persisted }
    })

    harness.handle('key.clear', async function () {
      memoryKey = ''
      if (creds !== undefined) {
        try {
          await creds.unset(KEY_REF_STORED)
        } catch (err) {
          console.error('[dsbal] clear stored key failed:', String(err))
        }
      }
      return { ok: true }
    })

    harness.handle('balance.fetch', async function () {
      const found = await currentKey()
      if (found.key === '') return { ok: false, error: '尚未配置 DeepSeek API Key', needKey: true }
      if (!KEY_PATTERN.test(found.key)) {
        return { ok: false, error: '检测到已配置的密钥格式异常，请在面板中重新输入 API Key', needKey: true }
      }
      const outcome = await fetchBalance(found.key)
      if (!outcome.ok) {
        const diag = await diagnoseAuth(found.key)
        if (diag !== '') outcome.detail = diag
      }
      return outcome
    })

    harness.handle('topup.url', async function () {
      return { topup: TOPUP_URL, apiKeys: API_KEYS_URL }
    })
  },
}
