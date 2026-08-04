# 西城区社区法治风险预警平台

本仓库包含 Vue 3 前端与 FastAPI 内网后端。当前版本已完成第一轮落地化改造：生产环境关闭 Mock、案件批量导入、院内模型适配、登录分级权限、操作审计、本地 GeoJSON 地图和离线部署。

## 明确边界

- 第一阶段部署在检察院内网，不直连办案系统 2.0。
- 真实案件通过院内批准的 XLSX、CSV 或 JSON 文件离线导入。
- 浏览器只访问平台后端；数据库和院内统一模型均由后端连接。
- AI仅生成辅助草稿，不能自动定性、评级或替代检察官判断。
- 真实案件、模型地址、数据库口令和证书不得进入本仓库。
- 飞书、小程序、Android 和 Electron 不纳入第一阶段内网交付包。

## 本地开发

```sh
npm install
npm run dev
```

开发环境只有在显式设置 `VITE_USE_MOCK=true` 时才使用演示数据。生产构建始终调用真实后端，接口失败不会回退到 Mock。

后端配置参考 `config/runtime.env.example`。本地启动示例：

```sh
export APP_ENV=development
export DATABASE_PATH=./var/platform.db
export JWT_SECRET=local-development-secret-at-least-32-chars
export BOOTSTRAP_ADMIN_PASSWORD='请使用至少12位强密码'
uvicorn server.main:app --host 127.0.0.1 --port 8090
```

首次启动只在用户表为空且配置了 `BOOTSTRAP_ADMIN_PASSWORD` 时创建初始系统管理员。

## 验证

```sh
npm run type-check
npm run build
python3 -m py_compile server/*.py
npm run security:scan
```

## 离线部署

外网构建机执行：

```sh
bash scripts/build_offline_bundle.sh
```

该命令生成 `offline-bundle`，其中只有前端成品、后端源码、固定版本 Python wheel、Nginx/systemd 配置和校验清单。内网服务器不运行 `npm install`、`apt update` 或公网下载命令。

院方运维先按照 `config/runtime.env.example` 创建：

`/etc/community-legal-risk-platform/runtime.env`

并设为 `root:root`、权限 `600`，再在离线交付目录执行：

```sh
sudo bash scripts/deploy_server.sh
```

完整部署、权限和数据口径见 `docs/intranet-deployment.md`。
