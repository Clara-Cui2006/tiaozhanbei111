# 项目维护说明

这是检察内网部署方向的社区法治风险预警平台，包含 Vue 3 前端和 FastAPI 后端。界面、代码注释和文档使用简体中文。

## 必须保持的生产约束

- Mock仅限开发环境显式开启；生产接口失败不得回退演示数据。
- 浏览器不得直接访问模型、数据库或持有密钥。
- 真实案件、内网地址、账号、证书和日志不得提交到仓库。
- 普通用户只看所属业务条线；部门主管和院领导看全院；系统管理员不默认看案件正文。
- 政治安全使用独立权限；AI只作辅助，输出必须人工审核。
- 不恢复高德、智谱公网、飞书、微信或其他外网生产依赖。
- 不恢复C++高中低风险评分引擎，不用随机数冒充真实统计。
- 内网服务器不在线安装依赖，统一使用离线交付包。

## 检查命令

```bash
npm run type-check
npm run build
python3 -m py_compile server/*.py
bash -n scripts/deploy_server.sh scripts/build_offline_bundle.sh
npm run security:scan
```

架构、权限、数据口径与部署路径见 `docs/intranet-deployment.md`。
