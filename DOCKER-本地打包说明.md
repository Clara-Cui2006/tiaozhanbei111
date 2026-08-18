# Docker 本地打包与导入

本机已经使用 WSL 2 的 `Ubuntu-22.04` 运行 Docker Engine，不依赖 Docker Desktop，也不需要从 GitHub 下载二次压缩的构建产物。

## 构建并导出

在项目根目录打开 PowerShell，运行：

```powershell
.\scripts\build-docker-tar.ps1
```

脚本会自动启动 WSL 内的 Docker，并在 `artifacts` 目录生成：

- `tiaozhanbei-platform-<版本>-linux-amd64.tar`：可直接使用 `docker load` 导入；
- `tiaozhanbei-platform-<版本>-linux-amd64.tar.gz`：体积更小，也可直接导入；
- 两个对应的 `.sha256` 完整性校验文件。

需要指定名称或版本时：

```powershell
.\scripts\build-docker-tar.ps1 -ImageName tiaozhanbei-platform -Tag v1
```

## 校验、解压并导入

`.tar` 和 `.tar.gz` 都支持。脚本会先校验 SHA-256，再自动解压并执行 `docker load`：

```powershell
.\scripts\load-docker-tar.ps1 -Archive .\artifacts\tiaozhanbei-platform-v1-linux-amd64.tar.gz
```

导入后可以查看镜像：

```powershell
wsl -d Ubuntu-22.04 -- docker images
```

## 运行项目

首次运行前复制环境变量模板并修改密码：

```powershell
Copy-Item docker.env.template .env
docker compose up -d
```

如果 Windows 没有安装 Docker CLI，可直接在 WSL 中运行 Compose：

```powershell
wsl -d Ubuntu-22.04 -- bash -lc "cd '/mnt/c/Users/崔馨月/Documents/挑战杯项目' && docker compose up -d"
```

默认访问地址为 `http://127.0.0.1:8080`。
