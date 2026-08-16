// dsh-deepseek-balance - Browser half.
// Hand-written lazy-CJS bundle (window.__ModuleLoader__.load), no build step.
// Renders the balance card into sidebar.footer.action (above Cordis Plugin).
window.__ModuleLoader__.load({
  id: 'dsh-deepseek-balance',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    var TOPUP_FALLBACK = 'https://platform.deepseek.com/top_up'
    var API_KEYS_FALLBACK = 'https://platform.deepseek.com/api_keys'

    var CSS = `
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

    function jsonRequest(url, options) {
      var opts = options || {}
      var init = { method: opts.method || 'GET', headers: {} }
      if (opts.body !== undefined) {
        init.headers['Content-Type'] = 'application/json'
        init.body = JSON.stringify(opts.body)
      }
      var controller = typeof AbortController === 'function' ? new AbortController() : null
      if (controller) {
        init.signal = controller.signal
        setTimeout(function () {
          controller.abort()
        }, opts.timeoutMs || 15000)
      }
      return fetch(url, init).then(function (res) {
        return res.json().then(
          function (body) {
            if (!res.ok && body && typeof body.error === 'string') throw new Error(body.error)
            return body
          },
          function () {
            if (!res.ok) throw new Error('HTTP ' + res.status)
            return {}
          },
        )
      })
    }

    function symbolOf(currency) {
      if (currency === 'CNY') return '¥'
      if (currency === 'USD') return '$'
      return currency === '' ? '' : currency + ' '
    }

    function apply(ctx) {
      var React
      try {
        React = require('react')
      } catch (error) {
        console.error('[dsh-deepseek-balance] react unavailable: ' + error)
        return
      }
      var tag = document.createElement('style')
      tag.dataset.plugin = 'dsh-deepseek-balance'
      tag.textContent = CSS
      document.head.appendChild(tag)
      if (typeof ctx.effect === 'function') {
        ctx.effect(function () {
          return function () {
            tag.remove()
          }
        }, 'dsb: styles')
      }
      if (typeof ctx.inject !== 'function') return
      ctx.inject(['slots'], function (scope) {
        scope.slots.inject('sidebar.footer.action', function* () {
          yield scope.slots.register(
            { name: 'sidebar.footer.action', id: 'deepseek-balance-widget', order: -10, label: 'DeepSeek 余额' },
            function (props) {
              return React.createElement(BalanceWidget(React), { wide: props !== undefined && props.wide === true })
            },
          )
        })
      })
    }

    function BalanceWidget(react) {
      var h = react.createElement

      return function BalanceWidget(props) {
        var wide = props !== undefined && props.wide === true
        var configState = react.useState(null)
        var config = configState[0]
        var setConfig = configState[1]
        var keyInputState = react.useState('')
        var keyInput = keyInputState[0]
        var setKeyInput = keyInputState[1]
        var busyState = react.useState(false)
        var busy = busyState[0]
        var setBusy = busyState[1]
        var balanceState = react.useState(null)
        var balance = balanceState[0]
        var setBalance = balanceState[1]
        var statusState = react.useState('idle')
        var status = statusState[0]
        var setStatus = statusState[1]
        var errorState = react.useState('')
        var error = errorState[0]
        var setError = errorState[1]
        var updatedAtState = react.useState(null)
        var updatedAt = updatedAtState[0]
        var setUpdatedAt = updatedAtState[1]
        var tickState = react.useState(0)
        var tick = tickState[0]
        var setTick = tickState[1]
        var topupUrlState = react.useState(TOPUP_FALLBACK)
        var topupUrl = topupUrlState[0]
        var setTopupUrl = topupUrlState[1]

        function loadConfig() {
          return jsonRequest('/dsh-balance/config')
            .then(function (cfg) {
              setConfig(cfg && typeof cfg === 'object' ? cfg : { hasKey: false, masked: '', source: 'none' })
            })
            .catch(function (err) {
              setConfig({ hasKey: false, masked: '', source: 'none' })
              setStatus('error')
              setError('无法连接插件宿主: ' + err)
            })
        }

        function refresh() {
          setStatus('loading')
          setError('')
          return jsonRequest('/dsh-balance/fetch', { timeoutMs: 25000 })
            .then(function (res) {
              if (res && res.ok === true && res.balance) {
                setBalance(res.balance)
                setStatus('idle')
                setUpdatedAt(Date.now())
              } else {
                setStatus('error')
                setError((res && res.error) || '获取余额失败')
                if (res && res.needKey === true) setConfig({ hasKey: false, masked: '', source: 'none' })
              }
            })
            .catch(function (err) {
              setStatus('error')
              setError('请求余额失败: ' + err)
            })
        }

        function saveKey() {
          var value = keyInput.trim()
          if (value === '') {
            setStatus('error')
            setError('请输入 API Key')
            return
          }
          setBusy(true)
          setStatus('loading')
          setError('')
          jsonRequest('/dsh-balance/key', { method: 'POST', body: { apiKey: value } })
            .then(function (res) {
              if (res && res.ok === true) {
                setConfig({ hasKey: true, masked: res.masked || '', source: res.persisted ? 'stored' : 'session' })
                setKeyInput('')
              } else {
                setStatus('error')
                setError((res && res.error) || '保存失败')
              }
            })
            .catch(function (err) {
              setStatus('error')
              setError('保存失败: ' + err)
            })
            .then(function () {
              setBusy(false)
            })
        }

        function clearKey() {
          setBusy(true)
          jsonRequest('/dsh-balance/key/clear', { method: 'POST' })
            .then(function () {
              setBalance(null)
              setUpdatedAt(null)
              setStatus('idle')
              setError('')
              return loadConfig()
            })
            .catch(function (err) {
              setStatus('error')
              setError('清除失败: ' + err)
            })
            .then(function () {
              setBusy(false)
            })
        }



        react.useEffect(function () {
          jsonRequest('/dsh-balance/topup')
            .then(function (res) {
              if (res && typeof res.topup === 'string' && res.topup !== '') setTopupUrl(res.topup)
            })
            .catch(function () {})
        }, [])

        react.useEffect(function () {
          if (config !== null && config.hasKey === true && config.timedOut !== true) refresh()
        }, [config, tick])

        react.useEffect(function () {
          var timer = setInterval(function () {
            setTick(function (t) {
              return t + 1
            })
          }, 60000)
          return function () {
            clearInterval(timer)
          }
        }, [])



        react.useEffect(function () {
          var cancelled = false
          var attempt = 0
          var timer = null
          function tryOnce() {
            attempt += 1
            jsonRequest('/dsh-balance/config', { timeoutMs: 8000 })
              .then(function (cfg) {
                if (cancelled) return
                if (cfg && typeof cfg === 'object' && typeof cfg.hasKey === 'boolean') {
                  setConfig(cfg)
                  setStatus('idle')
                  setError('')
                } else {
                  timer = setTimeout(tryOnce, 4000)
                }
              })
              .catch(function (err) {
                if (cancelled) return
                setStatus('idle')
                setError('')
                var delay = attempt < 3 ? 8000 : 30000
                timer = setTimeout(tryOnce, delay)
              })
          }
          tryOnce()
          return function () {
            cancelled = true
            if (timer !== null) clearTimeout(timer)
          }
        }, [])

        if (config === null) {
          if (!wide) return h('div', { className: 'dsb-rail', title: 'DeepSeek 余额' }, '¥')
          return h(
            'div',
            { className: 'dsb-card' },
            h(
              'div',
              { className: 'dsb-header' },
              h('span', { className: 'dsb-title' }, 'DeepSeek 余额'),
              h('span', { className: 'dsb-status-dot dsb-status-' + status }),
            ),
            h('div', { className: 'dsb-empty' }, '正在连接宿主…'),
            h(
              'button',
              { className: 'dsb-btn', onClick: function () { loadConfig() } },
              '重试',
            ),
          )
        }
        if (!wide) {
          var firstInfo = balance && Array.isArray(balance.infos) && balance.infos.length > 0 ? balance.infos[0] : null
          var railText = firstInfo && firstInfo.total !== '' ? symbolOf(firstInfo.currency) + firstInfo.total : '¥'
          return h('div', { className: 'dsb-rail', title: railText }, railText.slice(0, 6))
        }

        var header = h(
          'div',
          { className: 'dsb-header' },
          h('span', { className: 'dsb-title' }, 'DeepSeek 余额'),
          h('span', { className: 'dsb-status-dot dsb-status-' + status }),
          h(
            'button',
            {
              className: 'dsb-icon-btn',
              title: '立即刷新',
              disabled: config.hasKey !== true,
              onClick: function () {
                refresh()
              },
            },
            '刷新',
          ),
        )

        if (config.hasKey !== true) {
          return h(
            'div',
            { className: 'dsb-card' },
            header,
            h('div', { className: 'dsb-hint' }, '输入 DeepSeek API Key 以查询账户余额'),
            h(
              'div',
              { className: 'dsb-input-row' },
              h('input', {
                className: 'dsb-input',
                type: 'password',
                placeholder: 'sk-…',
                value: keyInput,
                autoComplete: 'off',
                spellCheck: false,
                onChange: function (e) {
                  setKeyInput(e.target.value)
                },
                onKeyDown: function (e) {
                  if (e.key === 'Enter') saveKey()
                },
              }),
              h(
                'button',
                { className: 'dsb-btn dsb-btn-primary', disabled: busy, onClick: saveKey },
                busy ? '…' : '保存',
              ),
            ),
            h(
              'div',
              { className: 'dsb-hint dsb-hint-sub' },
              '密钥仅用于官方余额接口 api.deepseek.com/user/balance；保存后持久化到 DSH 凭证库',
            ),
            h('a', { className: 'dsb-link', href: API_KEYS_FALLBACK, target: '_blank', rel: 'noopener noreferrer' }, '创建 API Key ↗'),
            h(
              'div',
              { className: 'dsb-actions' },
              h(
                'a',
                { className: 'dsb-btn dsb-btn-primary', href: topupUrl, target: '_blank', rel: 'noopener noreferrer' },
                '官方充值 ↗',
              ),
            ),
          )
        }

        var children = [header]
        if (status === 'error' && error !== '') {
          children.push(h('div', { key: 'err', className: 'dsb-error' }, '! ' + error))
        }
        if (balance === null) {
          children.push(
            h('div', { key: 'empty', className: 'dsb-empty' }, status === 'loading' ? '正在查询余额…' : '点击「刷新」查询余额'),
          )
        } else {
          var infos = Array.isArray(balance.infos) ? balance.infos : []
          if (infos.length === 0) {
            children.push(h('div', { key: 'empty', className: 'dsb-empty' }, '暂无余额信息'))
          } else {
            infos.forEach(function (info, idx) {
              var sym = symbolOf(info.currency)
              children.push(
                h(
                  'div',
                  { key: 'row' + idx, className: 'dsb-balance-row' },
                  h(
                    'div',
                    { className: 'dsb-balance-main' },
                    h('span', { className: 'dsb-balance-total' }, sym + info.total),
                    h('span', { className: 'dsb-balance-currency' }, info.currency),
                  ),
                  h(
                    'div',
                    { className: 'dsb-balance-sub' },
                    h('span', null, '充值余额 ' + (info.toppedUp === '' ? '—' : sym + info.toppedUp)),
                    h('span', null, '赠送余额 ' + (info.granted === '' ? '—' : sym + info.granted)),
                  ),
                ),
              )
            })
            if (balance.isAvailable === false) {
              children.push(h('div', { key: 'unavail', className: 'dsb-badge dsb-badge-warn' }, '! 账户当前不可用'))
            }
          }
        }
        var sourceLabel = config.source === 'env' ? '环境变量' : config.source === 'stored' ? '已保存' : '本会话'
        children.push(
          h(
            'div',
            { key: 'keyline', className: 'dsb-key-line' },
            h('span', { className: 'dsb-key' }, 'Key ' + (config.masked || '')),
            h('span', { className: 'dsb-badge' }, sourceLabel),
            h(
              'button',
              {
                className: 'dsb-icon-btn dsb-tiny',
                title: '更换密钥',
                onClick: function () {
                  setConfig(Object.assign({}, config, { hasKey: false }))
                  setKeyInput('')
                  setError('')
                },
              },
              '更换',
            ),
            config.source === 'env'
              ? null
              : h(
                  'button',
                  { className: 'dsb-icon-btn dsb-tiny', title: '清除密钥', disabled: busy, onClick: clearKey },
                  '清除',
                ),
          ),
        )
        if (updatedAt !== null) {
          children.push(h('div', { key: 'upd', className: 'dsb-updated' }, '更新于 ' + new Date(updatedAt).toLocaleTimeString()))
        }
        children.push(
          h(
            'div',
            { key: 'actions', className: 'dsb-actions' },
            h(
              'button',
              {
                className: 'dsb-btn',
                onClick: function () {
                  refresh()
                },
              },
              '立即刷新',
            ),
            h(
              'a',
              { className: 'dsb-btn dsb-btn-primary', href: topupUrl, target: '_blank', rel: 'noopener noreferrer' },
              '官方充值 ↗',
            ),
          ),
        )
        return h('div', { className: 'dsb-card' }, children)
      }
    }

    exports.apply = apply
    exports.inject = []
    return module.exports
  },
})
