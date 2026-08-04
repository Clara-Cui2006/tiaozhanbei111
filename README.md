# Community Legal Risk Platform

社区法治风险预警平台（Vue 3 + Vite + ECharts）。

## 快速开始

```sh
npm install
npm run dev
```

## 构建

```sh
npm run build
```

## 服务器部署（Linux）

1) 初始化依赖

```sh
npm run server:setup
```

2) 准备敏感信息（必须加密）

```sh
bash scripts/encrypt_server_secrets.sh /path/to/runtime.env
npm run secrets:verify
```

3) 部署

```sh
npm run server:deploy
```

## 安全基线

- `systemd` 为必选项，部署脚本会强制安装并启动原生引擎服务。
- 敏感信息只允许密文落盘：
  - 密文：`/etc/community-legal-risk-platform/secrets/runtime.env.enc`
  - 密钥：`/etc/community-legal-risk-platform/secrets/runtime.key`
- 运行期仅在 `/run/community-legal-risk-platform/runtime.env` 解密，服务停止后自动清理。
- 前端仅暴露 `VITE_` 前缀变量；严禁将密钥或后端敏感配置写入前端代码。

## 提交与CI门禁

```sh
npm run hooks:install
npm run security:scan
```

- `pre-commit` 会扫描暂存区并阻断明文敏感信息提交。
- GitHub Actions `Secrets Guard` 会在 `push/pull_request` 触发同样扫描。

## 主要脚本

- `npm run env:setup`：安装 Linux 服务器依赖
- `npm run env:check`：检查运行/构建环境
- `npm run native:build`：构建 C++ 原生模块
- `npm run native:bench`：执行 C++ 压测
- `npm run server:deploy`：构建并部署站点 + systemd 服务
