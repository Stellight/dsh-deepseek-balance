# dsh-deepseek-balance

DeepSeek Harness 静态 dual-face 插件：在页面内**实时显示 DeepSeek 账户余额**，并提供**官方充值入口**。

![dsh-plugin](https://img.shields.io/badge/dsh-plugin-blue)

## 功能

- **实时余额**：调用官方接口 `api.deepseek.com/user/balance`，展示可用总额 / 充值余额 / 赠送余额（支持多币种 CNY/USD）；
- **自动刷新**：每 60 秒自动刷新，支持手动「立即刷新」，状态灯（绿/黄/红）与「更新于 HH:MM:SS」时间戳；
- **官方充值**：「官方充值 ↗」一键直达 DeepSeek 官方充值页 `platform.deepseek.com/top_up`（新标签页），附 API Key 创建入口；
- **嵌入式 UI**：显示在左侧边栏底部、Cordis Plugin 选项上方（`sidebar.footer.action` 插槽），随明暗主题自适应；侧边栏收起（rail）时显示金额图标；
- **密钥管理**：支持手动输入 / 更换 / 清除 API Key，界面只显示掩码（`sk-···xxxx`）。

## 架构（dual-face，无构建步骤）

| 文件 | 半区 | 说明 |
| --- | --- | --- |
| `dsh/index.js` | Host | ESM 插件：Node 原生 `fetch` 调用官方余额接口；在本地 dsh web 服务器上注册同源 HTTP 路由（`/dsh-balance/config`、`/dsh-balance/key`、`/dsh-balance/key/clear`、`/dsh-balance/fetch`、`/dsh-balance/topup`）供浏览器半区调用 |
| `dsh/client.js` | Client | 手写 lazy-CJS bundle（`window.__ModuleLoader__.load` 协议，与内置 client 插件同格式）：React UI、主题 token 样式、静默重试连接宿主 |

客户端与宿主的通信走**同源 HTTP 路由**（页面由 dsh 的本地 web 服务器提供），不依赖动态插件专属的 `host.call` 机制。

## 安全说明

- **仓库代码中不包含任何 API Key**。密钥按以下顺序从运行时获取：
  1. 会话内存（用户在面板中输入的密钥）；
  2. 进程环境变量 `DEEPSEEK_API_KEY`（同步快路径，避免启动期拥塞）；
  3. DSH 凭证库 ref `DEEPSEEK_BALANCE_API_KEY`（`~/.dsh/.credentials.yaml`）。
- 密钥仅在本机进程内用于调用官方余额接口，不出网、不落盘。

## 安装（dsh profile 插件）

本包通过 dsh 的 **profile bundle 机制**持久挂载（与 modlens 等外置插件同机制；注意：直接写 profile 的 `cordis.patch.yml` 插入行会在启动时被消费清空、重启后丢失，请使用下面的 bundle 方式）：

1. 找到你的 dsh profile 目录（默认 `~/.dsh/profiles/web/`）；
2. 把本包放入 profile 的 `node_modules`：
   - 方式 A：在 profile 目录内执行 `npm install dsh-deepseek-balance`；
   - 方式 B：手动复制本包到 `~/.dsh/profiles/web/node_modules/dsh-deepseek-balance/`；
3. 编辑 profile 的 `package.json`，加入依赖与 bundle 条目：
   ```json
   {
     "dependencies": {
       "dsh-deepseek-balance": "1.1.1"
     },
     "dsh": {
       "profile": {
         "bundles": [
           "dsh-deepseek-balance"
         ]
       }
     }
   }
   ```
   （包内的 `cordis.patch.yml` 作为 bundle 自举补丁在每次启动时自动应用，不会被消费。）
4. 重启 harness（`dsh web`）。卡片自动出现在左侧边栏底部，无需批准、无需每次重装。

## 版本历史

- 1.1.1 — 持久挂载修复：改为 profile bundle 机制（依赖 + bundles 列表 + 包内自举补丁），重启不再丢失；
- 1.1.0 — 静态 dual-face 重构：Node 原生 fetch + 同源 HTTP 路由（不再依赖 shell/curl）；嵌入式侧边栏卡片置顶（Cordis Plugin 上方）；
- 1.0.x — 动态 Cordis 插件原型（`cordis_define` + `cordis_run`，见 git 历史）。

## License

[MIT](LICENSE)
