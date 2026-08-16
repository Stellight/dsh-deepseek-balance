// dsh-deepseek-balance — Client half (code.client for cordis_define)
// DeepSeek Harness dynamic Cordis plugin: real-time DeepSeek account balance + official top-up entry.
//
// 使用方式：将本文件内容作为 cordis_define 的 code.client 传入（配合 host.js 作为 code.host）。
// UI 注册在 sidebar.footer.action（左侧边栏底部、设置上方）；侧边栏收起（rail）时显示金额图标。

const TOPUP_FALLBACK = 'https://platform.deepseek.com/top_up'
const API_KEYS_FALLBACK = 'https://platform.deepseek.com/api_keys'

const CSS = `
div:has(> div[data-slot="sidebar.footer.action"]) { flex-wrap: wrap; row-gap: 8px; }
.dsb-card { width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 10px; border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.08)); background: var(--dsw-alias-bg-layer-1, rgba(255, 255, 255, 0.04)); color: var(--dsw-alias-label-primary, #e8e8ea); font-family: inherit; font-size: 12px; line-height: 1.5; }
.dsb-header { display: flex; align-items: center; gap: 6px; }
.dsb-title { flex: 1; font-weight: 600; font-size: 12px; }
.dsb-status-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; background: var(--dsw-alias-label-secondary, #9a9aa3); }
.dsb-status-loading { background: var(--dsw-alias-state-warn-primary, #e8b339); animation: dsb-pulse 1s ease infinite; }
.dsb-status-idle { background: var(--dsw-alias-state-success-primary, #3fb950); }
.dsb-status-error { background: var(--dsw-alias-state-error-primary, #f85149); }
@keyframes dsb-pulse { 50% { opacity: 0.3; } }
.dsb-icon-btn { border: none; background: transparent; color: inherit; cursor: pointer; font-size: 12px; padding: 2px 6px; border-radius: 6px; line-height: 1.2; }
.dsb-icon-btn:hover { background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.1)); }
.dsb-icon-btn:disabled { opacity: 0.4; cursor: default; }
.dsb-tiny { font-size: 11px; opacity: 0.85; }
.dsb-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.16)); background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.08)); color: inherit; border-radius: 8px; padding: 6px 10px; cursor: pointer; font-size: 12px; text-decoration: none; font-family: inherit; }
.dsb-btn:hover { filter: brightness(1.1); }
.dsb-btn:disabled { opacity: 0.5; cursor: default; }
.dsb-btn-primary { background: var(--dsw-alias-brand-primary, #4d6bfe); border-color: transparent; color: #fff; font-weight: 600; }
.dsb-actions { display: flex; gap: 8px; }
.dsb-actions .dsb-btn { flex: 1; }
.dsb-input { flex: 1; min-width: 0; box-sizing: border-box; background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.08)); border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.16)); color: inherit; border-radius: 8px; padding: 7px 10px; font-size: 12px; outline: none; font-family: inherit; }
.dsb-input:focus { border-color: var(--dsw-alias-brand-primary, #4d6bfe); }
.dsb-input-row { display: flex; gap: 6px; align-items: center; }
.dsb-hint { color: var(--dsw-alias-label-secondary, #9a9aa3); font-size: 11px; }
.dsb-hint-sub { font-size: 10px; opacity: 0.9; }
.dsb-link { color: var(--dsw-alias-brand-primary, #6b8aff); text-decoration: none; font-size: 11px; }
.dsb-link:hover { text-decoration: underline; }
.dsb-key-line { display: flex; align-items: center; gap: 6px; }
.dsb-key { flex: 1; font-size: 11px; color: var(--dsw-alias-label-secondary, #9a9aa3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsb-badge { font-size: 10px; padding: 1px 6px; border-radius: 999px; border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.16)); color: var(--dsw-alias-label-secondary, #9a9aa3); flex: none; }
.dsb-badge-warn { color: var(--dsw-alias-state-warn-primary, #e8b339); border-color: var(--dsw-alias-state-warn-primary, #e8b339); }
.dsb-balance-row { border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.08)); border-radius: 10px; padding: 8px 10px; background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.04)); display: flex; flex-direction: column; gap: 3px; }
.dsb-balance-main { display: flex; align-items: baseline; gap: 8px; }
.dsb-balance-total { font-size: 19px; font-weight: 700; letter-spacing: 0.2px; }
.dsb-balance-currency { font-size: 11px; color: var(--dsw-alias-label-secondary, #9a9aa3); }
.dsb-balance-sub { display: flex; gap: 12px; font-size: 11px; color: var(--dsw-alias-label-secondary, #9a9aa3); }
.dsb-empty { color: var(--dsw-alias-label-secondary, #9a9aa3); padding: 4px 2px; }
.dsb-error { color: var(--dsw-alias-state-error-primary, #f85149); font-size: 11px; word-break: break-all; white-space: pre-wrap; }
.dsb-updated { color: var(--dsw-alias-label-secondary, #9a9aa3); font-size: 10px; text-align: right; }
.dsb-rail { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; margin: 2px auto; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.16)); background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.08)); color: var(--dsw-alias-label-primary, #e8e8ea); font-size: 14px; font-weight: 700; cursor: default; }
`

return {
  inject: ['timer'],
  apply(ctx) {
    const slots = ctx.get('slots')
    if (slots === undefined) return
    styles.insert(CSS)

    const symbolOf = function (currency) {
      if (currency === 'CNY') return '¥'
      if (currency === 'USD') return '$'
      return currency === '' ? '' : currency + ' '
    }

    function BalanceWidget(props) {
      const wide = props !== undefined && props.wide === true
      const [config, setConfig] = React.useState(null)
      const [keyInput, setKeyInput] = React.useState('')
      const [busy, setBusy] = React.useState(false)
      const [balance, setBalance] = React.useState(null)
      const [status, setStatus] = React.useState('idle')
      const [error, setError] = React.useState('')
      const [updatedAt, setUpdatedAt] = React.useState(null)
      const [tick, setTick] = React.useState(0)
      const [topupUrl, setTopupUrl] = React.useState(TOPUP_FALLBACK)

      const loadConfig = React.useCallback(async function () {
        try {
          const cfg = await host.call('config.get')
          setConfig(cfg || { hasKey: false, masked: '', source: 'none', persistCapable: false })
        } catch (err) {
          setConfig({ hasKey: false, masked: '', source: 'none', persistCapable: false })
          setStatus('error')
          setError('无法连接插件宿主: ' + String(err))
        }
      }, [])

      const refresh = React.useCallback(async function () {
        setStatus('loading')
        setError('')
        try {
          const res = await host.call('balance.fetch')
          if (res && res.ok === true && res.balance) {
            setBalance(res.balance)
            setStatus('idle')
            setUpdatedAt(Date.now())
          } else {
            const message = res && typeof res.error === 'string' ? res.error : '获取余额失败'
            const detail = res && typeof res.detail === 'string' && res.detail !== '' ? '\n【诊断】' + res.detail : ''
            setStatus('error')
            setError(message + detail)
            if (res && res.needKey === true) setConfig({ hasKey: false, masked: '', source: 'none', persistCapable: true })
          }
        } catch (err) {
          setStatus('error')
          setError('请求余额失败: ' + String(err))
        }
      }, [])

      const saveKey = React.useCallback(async function () {
        const value = keyInput.trim()
        if (value === '') {
          setStatus('error')
          setError('请输入 API Key')
          return
        }
        setBusy(true)
        setStatus('loading')
        setError('')
        try {
          const res = await host.call('key.set', { apiKey: value })
          if (res && res.ok === true) {
            setConfig({ hasKey: true, masked: res.masked || '', source: res.persisted ? 'stored' : 'session', persistCapable: true })
            setKeyInput('')
          } else {
            setStatus('error')
            setError((res && res.error) || '保存失败')
          }
        } catch (err) {
          setStatus('error')
          setError('保存失败: ' + String(err))
        } finally {
          setBusy(false)
        }
      }, [keyInput])

      const clearKey = React.useCallback(async function () {
        setBusy(true)
        try {
          await host.call('key.clear')
          setBalance(null)
          setUpdatedAt(null)
          setStatus('idle')
          setError('')
          await loadConfig()
        } catch (err) {
          setStatus('error')
          setError('清除失败: ' + String(err))
        } finally {
          setBusy(false)
        }
      }, [loadConfig])

      React.useEffect(function () { loadConfig() }, [loadConfig])

      React.useEffect(function () {
        return ctx.timeout(function () {
          setConfig(function (c) {
            if (c !== null) return c
            return { hasKey: false, masked: '', source: 'none', persistCapable: true, timedOut: true }
          })
          setStatus('error')
          setError('配置加载超时（宿主 RPC 未响应）')
        }, 5000)
      }, [])

      React.useEffect(function () {
        host.call('topup.url').then(function (res) {
          if (res && typeof res.topup === 'string' && res.topup !== '') setTopupUrl(res.topup)
        }).catch(function () {})
      }, [])

      React.useEffect(function () {
        if (config !== null && config.hasKey === true && config.timedOut !== true) refresh()
      }, [config, tick, refresh])

      React.useEffect(function () {
        return ctx.interval(function () { setTick(function (t) { return t + 1 }) }, 60000)
      }, [])

      if (!wide) {
        const firstInfo = balance && Array.isArray(balance.infos) && balance.infos.length > 0 ? balance.infos[0] : null
        const text = firstInfo && firstInfo.total !== '' ? symbolOf(firstInfo.currency) + firstInfo.total : (balance === null ? '¥' : '—')
        return React.createElement('div', { className: 'dsb-rail', title: text }, text.slice(0, 6))
      }

      const header = React.createElement(
        'div',
        { className: 'dsb-header' },
        React.createElement('span', { className: 'dsb-title' }, 'DeepSeek 余额'),
        React.createElement('span', { className: 'dsb-status-dot dsb-status-' + status }),
        React.createElement('button', { className: 'dsb-icon-btn', title: '立即刷新', disabled: config === null || config.hasKey !== true, onClick: function () { refresh() } }, '刷新'),
      )

      let body
      if (config === null) {
        body = React.createElement('div', { className: 'dsb-card' }, header, React.createElement('div', { className: 'dsb-empty' }, '加载中…'))
      } else if (config.hasKey !== true) {
        body = React.createElement(
          'div',
          { className: 'dsb-card' },
          header,
          React.createElement('div', { className: 'dsb-hint' }, '输入 DeepSeek API Key 以查询账户余额'),
          React.createElement(
            'div',
            { className: 'dsb-input-row' },
            React.createElement('input', {
              className: 'dsb-input',
              type: 'password',
              placeholder: 'sk-…',
              value: keyInput,
              autoComplete: 'off',
              spellCheck: false,
              onChange: function (e) { setKeyInput(e.target.value) },
              onKeyDown: function (e) { if (e.key === 'Enter') saveKey() },
            }),
            React.createElement('button', { className: 'dsb-btn dsb-btn-primary', disabled: busy, onClick: saveKey }, busy ? '…' : '保存'),
          ),
          React.createElement('div', { className: 'dsb-hint dsb-hint-sub' },
            '密钥仅用于官方余额接口 api.deepseek.com/user/balance；'
            + (config.persistCapable ? '保存后持久化到 DSH 凭证库' : '仅保存在当前插件内存')),
          React.createElement('a', { className: 'dsb-link', href: API_KEYS_FALLBACK, target: '_blank', rel: 'noopener noreferrer' }, '创建 API Key ↗'),
          React.createElement(
            'div',
            { className: 'dsb-actions' },
            React.createElement('a', { className: 'dsb-btn dsb-btn-primary', href: topupUrl, target: '_blank', rel: 'noopener noreferrer' }, '官方充值 ↗'),
          ),
        )
      } else {
        const children = [header]
        if (status === 'error' && error !== '') {
          children.push(React.createElement('div', { key: 'err', className: 'dsb-error' }, '! ' + error))
        }
        if (balance === null) {
          children.push(React.createElement('div', { key: 'empty', className: 'dsb-empty' }, status === 'loading' ? '正在查询余额…' : '点击「刷新」查询余额'))
        } else {
          const infos = Array.isArray(balance.infos) ? balance.infos : []
          if (infos.length === 0) {
            children.push(React.createElement('div', { key: 'empty', className: 'dsb-empty' }, '暂无余额信息'))
          } else {
            infos.forEach(function (info, idx) {
              const sym = symbolOf(info.currency)
              children.push(React.createElement(
                'div',
                { key: 'row' + idx, className: 'dsb-balance-row' },
                React.createElement(
                  'div',
                  { className: 'dsb-balance-main' },
                  React.createElement('span', { className: 'dsb-balance-total' }, sym + info.total),
                  React.createElement('span', { className: 'dsb-balance-currency' }, info.currency),
                ),
                React.createElement(
                  'div',
                  { className: 'dsb-balance-sub' },
                  React.createElement('span', null, '充值余额 ' + (info.toppedUp === '' ? '—' : sym + info.toppedUp)),
                  React.createElement('span', null, '赠送余额 ' + (info.granted === '' ? '—' : sym + info.granted)),
                ),
              ))
            })
            if (balance.isAvailable === false) {
              children.push(React.createElement('div', { key: 'unavail', className: 'dsb-badge dsb-badge-warn' }, '! 账户当前不可用'))
            }
          }
        }
        const sourceLabel = config.source === 'env' ? '环境变量' : config.source === 'stored' ? '已保存' : '本会话'
        children.push(React.createElement(
          'div',
          { key: 'keyline', className: 'dsb-key-line' },
          React.createElement('span', { className: 'dsb-key' }, 'Key ' + (config.masked || '')),
          React.createElement('span', { className: 'dsb-badge' }, sourceLabel),
          React.createElement('button', { className: 'dsb-icon-btn dsb-tiny', title: '更换密钥', onClick: function () { setConfig(Object.assign({}, config, { hasKey: false })); setKeyInput(''); setError('') } }, '更换'),
          config.source === 'env' ? null : React.createElement('button', { className: 'dsb-icon-btn dsb-tiny', title: '清除密钥', disabled: busy, onClick: clearKey }, '清除'),
        ))
        if (updatedAt !== null) {
          children.push(React.createElement('div', { key: 'upd', className: 'dsb-updated' }, '更新于 ' + new Date(updatedAt).toLocaleTimeString()))
        }
        children.push(React.createElement(
          'div',
          { key: 'actions', className: 'dsb-actions' },
          React.createElement('button', { className: 'dsb-btn', onClick: refresh }, '立即刷新'),
          React.createElement('a', { className: 'dsb-btn dsb-btn-primary', href: topupUrl, target: '_blank', rel: 'noopener noreferrer' }, '官方充值 ↗'),
        ))
        body = React.createElement('div', { className: 'dsb-card' }, children)
      }

      return body
    }

    slots.inject('sidebar.footer.action', function () {
      return slots.register(
        { name: 'sidebar.footer.action', id: 'deepseek-balance-widget', order: 10, label: 'DeepSeek 余额' },
        function (props) { return React.createElement(BalanceWidget, { wide: props !== undefined && props.wide === true }) },
      )
    })
  },
}
