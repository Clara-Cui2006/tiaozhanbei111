# 挑战杯项目 Docker 交付说明

## 第一次运行

在项目目录复制环境变量模板：

```powershell
Copy-Item docker.env.template .env
```

编辑 `.env`，至少修改 `JWT_SECRET` 和初始管理员密码。然后执行：

```bash
docker compose up -d --build
```

浏览器访问 `http://部署电脑IP:8080`，本机访问 `http://127.0.0.1:8080`。

## 常用命令

```bash
docker compose ps
docker compose logs -f
docker compose down
```

数据库保存在 Docker volume `tiaozhanbei-data`。不要执行 `docker compose down -v`，除非明确需要清空数据。

AI 模型地址、模型名和 API Key 可通过 `.env` 或系统设置页面配置。真实密钥不得提交到 Git 仓库。
