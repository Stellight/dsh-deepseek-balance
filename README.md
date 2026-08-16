# dsh-deepseek-balance

DeepSeek Harness 动态 Cordis 插件：在页面内**实时显示 DeepSeek 账户余额**，并提供**官方充值入口**。

![dsh-plugin](https://img.shields.io/badge/dsh-plugin-blue)

## 功能

- **实时余额**：调用官方接口 `api.deepseek.com/user/balance`，展示可用总额 / 充值余额 / 赠送余额（支持多币种 CNY/USD）；
- **自动刷新**：每 60 秒自动刷新，支持手动「立即刷新」，状态灯（绿/黄/红）与「更新于 HH:MM:SS」时间戳；
- **官方充值**：「官方充值 ↗」一键直达 DeepSeek 官方充值页 `platform.deepseek.com/top_up`（新标签页），附 API Key 创建入口；
- **嵌入式 UI**：显示在左侧边栏底部、设置按钮上方（`sidebar.footer.action` 插槽），随明暗主题自适应；侧边栏收起（rail）时显示金额图标；
- **密钥管理**：支持手动输入 / 更换 / 清除 API Key，界面只显示掩码（`sk-···xxxx`），可持久化到 DSH 凭证库。

## 安全说明

- **仓库代码中不包含任何 API Key**。密钥按以下顺序从运行时获取：
  1. 会话内存（用户在面板中输入的密钥）；
  2. DSH 凭证库 ref `DEEPSEEK_BALANCE_API_KEY`（`~/.dsh/.credentials.yaml`）；
  3. 凭证库 / 环境中的 `DEEPSEEK_API_KEY`。
- 密钥仅经**子进程环境变量**传给 curl，不写入命令行、不落盘、不进入会话日志；
- 余额请求只发往官方接口 `api.deepseek.com/user/balance`。

## 安装（动态 Cordis 插件）

在 DeepSeek Harness 会话中：

1. `cordis_define`：
   - `plugin.kind: "new"`，`idPrefix` 自定义（如 `dsbal`）；
   - `code.host` = 本仓库 [`host.js`](host.js) 的文件内容；
   - `code.client` = 本仓库 [`client.js`](client.js) 的文件内容；
2. `cordis_run` 激活返回的 `pluginId` / `packageId`；
3. 在页面运行卡片上批准。

## 平台说明

- Host 半区通过宿主 `shell` 服务执行 curl 请求余额接口（动态插件沙箱禁止直接 `fetch`，而 `web` 服务不支持自定义请求头）；
- 本机部署的 `shell` 服务若为 PowerShell 执行器（Windows），命令已按 PowerShell 5.1 语法编写；若为 bash 执行器，请将 `fetchBalance` 中的命令替换为 bash 语法（见 `host.js` 注释）；
- 沙箱策略按执行器指引声明 `danger-full-access`：部分 Windows 主机的 ACL 沙箱后端因工作区覆盖系统临时目录而不可用，受限模式一律拒绝执行。命令为静态构造（无用户可控内容），密钥经环境变量传递。

## 文件

| 文件 | 说明 |
| --- | --- |
| `host.js` | `code.host`：余额请求、密钥管理、RPC 处理器 |
| `client.js` | `code.client`：侧边栏 UI、自动刷新、官方充值入口 |
| `package.json` | npm 元信息（keywords 含 `dsh-plugin`） |

## License

[MIT](LICENSE)
