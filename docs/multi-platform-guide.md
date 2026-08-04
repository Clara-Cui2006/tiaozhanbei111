# 西城区法治风险平台 — 多端部署与适配指南

> 本文档覆盖：服务器部署、桌面程序打包、移动端适配、微信小程序四个方向。
> 按推荐顺序排列，前置依赖标注清楚。

---

## 目录

1. [租服务器 & 线上部署](#1-租服务器--线上部署)
2. [桌面程序打包（Electron）](#2-桌面程序打包electron)
3. [移动端适配（响应式 + PWA）](#3-移动端适配响应式--pwa)
4. [微信小程序](#4-微信小程序)
5. [各方案对比总结](#5-各方案对比总结)

---

## 1. 租服务器 & 线上部署

### 1.1 服务器选择

| 平台 | 推荐配置 | 价格 | 备注 |
|---|---|---|---|
| **阿里云 轻量应用服务器** | 2核2G | ~50元/月 | 学生认证更便宜 |
| **腾讯云 轻量应用服务器** | 2核2G | ~45元/月 | 新用户有优惠 |
| **华为云 HECS** | 2核2G | ~40元/月 | 也可以 |

**操作系统选 Ubuntu 22.04 / 24.04**（不要选 Windows）。

### 1.2 购买后的初始配置

```bash
# 1. 用 SSH 连接服务器（替换为你的服务器公网 IP）
ssh root@你的服务器IP

# 2. 安装 Node.js（推荐用 nvm）
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
node -v  # 应显示 v20.x.x

# 3. 安装 nginx（用于托管前端静态文件）
apt update && apt install -y nginx

# 4. 安装 git
apt install -y git
```

### 1.3 部署前端

```bash
# ===== 在你自己的电脑上操作 =====

# 1. 构建生产版本
cd ~/Desktop/claudecode/Tiaozhanbei
npm run build
# 会生成 dist/ 文件夹

# 2. 上传 dist/ 到服务器
scp -r dist/ root@你的服务器IP:/var/www/legal-platform/
```

```bash
# ===== 在服务器上操作 =====

# 3. 配置 nginx
cat > /etc/nginx/sites-available/legal-platform << 'EOF'
server {
    listen 80;
    server_name _;  # 如果有域名就写域名，没有就用 _

    root /var/www/legal-platform;
    index index.html;

    # SPA 路由支持（所有路径都返回 index.html）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 4. 启用站点
ln -sf /etc/nginx/sites-available/legal-platform /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 5. 验证
curl http://localhost  # 应返回 HTML 内容
```

现在浏览器访问 `http://你的服务器IP` 就能看到平台了。

### 1.4 配置域名 & HTTPS（可选，微信小程序必需）

```bash
# 1. 买域名（阿里云/腾讯云，.cn 域名约 30 元/年）
# 2. 域名解析：添加 A 记录指向服务器 IP
# 3. 域名备案（国内服务器必须备案，约 7-15 个工作日）

# 4. 安装免费 HTTPS 证书（Let's Encrypt）
apt install -y certbot python3-certbot-nginx
certbot --nginx -d 你的域名.cn

# 完成后自动配置 HTTPS，访问 https://你的域名.cn 即可
```

### 1.5 部署飞书机器人（可选）

```bash
# 在服务器上
cd /opt
git clone https://github.com/aleafofwutong/Tiaozhanbei.git
cd Tiaozhanbei/feishu-bot
npm install

# 创建环境变量文件
cat > .env << 'EOF'
FEISHU_APP_ID=cli_a96e37bbddf8dbc4
FEISHU_APP_SECRET=你的AppSecret
LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
LLM_API_KEY=你的智谱APIKey
LLM_MODEL=glm-4.5
PLATFORM_URL=http://你的服务器IP
EOF

# 用 pm2 守护进程运行
npm install -g pm2
pm2 start "npx tsx src/index.ts" --name feishu-bot
pm2 save
pm2 startup  # 开机自启
```

---

## 2. 桌面程序打包（Electron）

把现有网站打包成 `.app`（macOS）或 `.exe`（Windows）桌面应用。

### 2.1 安装依赖

```bash
cd ~/Desktop/claudecode/Tiaozhanbei
npm install -D electron electron-builder concurrently wait-on
```

### 2.2 创建 Electron 入口文件

创建 `electron/main.js`：

```bash
mkdir -p electron
```

写入以下内容到 `electron/main.js`：

```javascript
const { app, BrowserWindow } = require('electron')
const path = require('path')

// 判断是开发模式还是生产模式
const isDev = !app.isPackaged

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    title: '西城区社区法治风险智能研判与治理平台',
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (isDev) {
    // 开发模式：加载 Vite 开发服务器
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    // 生产模式：加载打包后的文件
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // 隐藏菜单栏
  win.setMenuBarVisibility(false)
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
```

### 2.3 修改 package.json

在 `package.json` 中添加以下字段：

```json
{
  "main": "electron/main.js",
  "scripts": {
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && electron .\"",
    "electron:build": "npm run build && electron-builder"
  },
  "build": {
    "appId": "com.xicheng.legal-platform",
    "productName": "西城法治风险平台",
    "directories": {
      "output": "electron-dist"
    },
    "files": [
      "dist/**/*",
      "electron/**/*"
    ],
    "mac": {
      "target": "dmg",
      "icon": "public/favicon.ico"
    },
    "win": {
      "target": "nsis",
      "icon": "public/favicon.ico"
    }
  }
}
```

### 2.4 运行 & 打包

```bash
# 开发模式（边改边看）
npm run electron:dev

# 打包成安装包
npm run electron:build
# macOS → electron-dist/ 下生成 .dmg
# Windows → electron-dist/ 下生成 .exe 安装包
```

> **注意：** macOS 上只能打包 .dmg，Windows 上只能打包 .exe。
> 如需跨平台打包，需要用 GitHub Actions 或在对应系统上打包。

---

## 3. 移动端适配（响应式 + PWA）

### 3.1 响应式适配

在 `src/App.vue` 的 `<style>` 中添加移动端媒体查询：

```css
/* ===== 移动端适配 ===== */
@media (max-width: 768px) {
  .header {
    height: auto;
    grid-template-columns: 1fr;
    padding: 10px 16px;
    gap: 8px;
  }

  .brand {
    justify-content: center;
    font-size: 14px;
  }

  .top-menu :deep(.arco-menu-inner) {
    flex-wrap: wrap;
    justify-content: center;
  }

  .top-menu :deep(.arco-menu-item) {
    font-size: 12px;
    padding: 4px 8px;
  }

  .header-right {
    justify-content: center;
  }

  .content {
    padding: 12px;
  }

  .content :deep(.arco-page-header-title) {
    font-size: 18px;
  }
}
```

每个页面也需要类似的适配，主要改：
- `flex` 布局改为 `flex-wrap: wrap` 或纵向排列
- 图表高度降低
- 字号适当缩小

### 3.2 PWA（可安装到手机桌面）

**第一步：** 创建 `public/manifest.json`：

```json
{
  "name": "西城区社区法治风险智能研判与治理平台",
  "short_name": "西城法治",
  "description": "社区法治风险预警与智能研判",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a1225",
  "theme_color": "#0d1e38",
  "orientation": "any",
  "icons": [
    {
      "src": "/images/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/images/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**第二步：** 在 `index.html` 的 `<head>` 中添加：

```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#0d1e38">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```

**第三步：** 安装 Vite PWA 插件：

```bash
npm install -D vite-plugin-pwa
```

在 `vite.config.ts` 中添加：

```typescript
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}']
      }
    })
  ]
})
```

**第四步：** 准备图标

需要两个尺寸的 PNG 图标放在 `public/images/`：
- `icon-192.png`（192×192）
- `icon-512.png`（512×512）

可以用在线工具把天平 SVG 转成 PNG。

**使用方式：**
- **iPhone：** Safari 打开网站 → 点分享按钮 → "添加到主屏幕"
- **Android：** Chrome 打开网站 → 浏览器会提示"安装应用" → 点击安装
- 安装后从桌面打开，全屏无浏览器地址栏，和原生 App 体验一致

---

## 4. 微信小程序

### 4.1 前置条件（缺一不可）

| 条件 | 说明 | 获取方式 |
|---|---|---|
| **服务器** | 小程序后端 API 必须有线上地址 | 上面第 1 节已解决 |
| **域名 + HTTPS** | 微信要求所有请求走 HTTPS | 上面 1.4 节已解决 |
| **域名备案** | 国内服务器 + 域名必须备案 | 在云服务商后台提交，7-15 个工作日 |
| **小程序账号** | 需要企业/组织主体（个人也可以但有限制） | [mp.weixin.qq.com](https://mp.weixin.qq.com) 注册 |

> ⚠️ **域名备案**是最大的时间瓶颈，建议尽早启动。

### 4.2 技术方案选择

| 方案 | 优点 | 缺点 | 推荐度 |
|---|---|---|---|
| **uni-app** | 一套代码编译到小程序+H5+App | 生态好，文档全 | ⭐⭐⭐⭐⭐ |
| 原生小程序 (WXML) | 性能最好 | 不能复用 Vue 代码 | ⭐⭐⭐ |
| Taro (React) | 适合 React 团队 | 你们用 Vue，不匹配 | ⭐⭐ |

**推荐 uni-app**（Vue 3 语法，和你们现有代码最接近）。

### 4.3 uni-app 搭建步骤

```bash
# 1. 安装 HBuilderX（uni-app 官方 IDE）
# 下载地址：https://www.dcloud.io/hbuilderx.html

# 或者用 CLI 方式：
npx degit dcloudio/uni-preset-vue#vite-ts xicheng-miniapp
cd xicheng-miniapp
npm install
```

### 4.4 项目结构

```
xicheng-miniapp/
  src/
    pages/
      index/index.vue        # 首页（对应 home.vue）
      dashboard/index.vue    # 态势盘
      risk/index.vue         # 风险分析
      suggestion/index.vue   # 检察建议
      legal/index.vue        # 普法方案
      effect/index.vue       # 效果评估
      news/index.vue         # 新闻动态
    api/
      http.ts               # 网络请求（uni.request 替代 axios）
      platform.ts           # API 函数（复用逻辑，改请求方式）
    pages.json              # 页面路由配置
    manifest.json           # 小程序配置（AppID 等）
```

### 4.5 核心改动点

**网络请求**：axios → uni.request

```typescript
// src/api/http.ts
const BASE_URL = 'https://你的域名.cn/api'

export function request<T>(options: { url: string; method?: string; data?: any }): Promise<T> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + options.url,
      method: (options.method || 'GET') as any,
      data: options.data,
      success: (res) => resolve(res.data as T),
      fail: reject,
    })
  })
}
```

**图表**：ECharts → 使用小程序版 echarts 组件

```bash
npm install echarts-for-weixin
# 或使用 ucharts（更轻量）
npm install @qiun/ucharts
```

**地图**：AMap JS API → 小程序 `<map>` 组件

```vue
<map
  :latitude="39.915"
  :longitude="116.366"
  :markers="markers"
  :scale="14"
  style="width: 100%; height: 400px;"
/>
```

### 4.6 开发 & 预览

```bash
# CLI 方式运行
npm run dev:mp-weixin
# 生成 dist/dev/mp-weixin/ 目录

# 用微信开发者工具打开该目录预览
# 下载地址：https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html
```

### 4.7 上线流程

1. 微信开发者工具中点击「上传」
2. 登录 [小程序管理后台](https://mp.weixin.qq.com) → 版本管理 → 提交审核
3. 审核通过后点击「发布」
4. 审核周期：通常 1-3 个工作日

---

## 5. 各方案对比总结

| 方案 | 开发量 | 费用 | 需要服务器 | 需要备案 | 适合场景 |
|---|---|---|---|---|---|
| 服务器部署 | 1天 | ~50元/月 | ✅ | 需要（如用域名） | 所有人都能访问 |
| Electron 桌面 | 2小时 | 0 | ❌ | ❌ | 现场演示、离线使用 |
| 移动端适配 | 半天 | 0 | ❌ | ❌ | 手机浏览器访问 |
| PWA | 2小时 | 0 | ❌ | ❌ | 手机安装到桌面 |
| 微信小程序 | 3-5天 | ~50元/月 | ✅ | ✅ 必须 | 微信生态分发 |

### 推荐执行顺序

```
第一步：租服务器 + 部署上线（让所有人能访问）
   ↓
第二步：移动端 CSS 适配 + PWA（手机可用 + 可安装）
   ↓
第三步：Electron 桌面打包（答辩现场演示加分项）
   ↓
第四步：微信小程序（如果时间允许 + 备案完成）
```

---

## 附：常见问题

**Q: 没有域名可以部署吗？**
A: 可以，直接用服务器 IP 访问（`http://123.45.67.89`），但没法上 HTTPS，微信小程序用不了。

**Q: 备案要多久？**
A: 首次备案 7-15 个工作日。个人备案简单，企业备案需要营业执照。

**Q: Electron 打包后文件多大？**
A: 约 80-150MB（Chromium 内核自带），可以用 electron-builder 压缩。

**Q: 小程序能用 mock 数据吗？**
A: 开发阶段可以在微信开发者工具中勾选「不校验合法域名」，用 mock 数据调试。上线审核时必须用真实 HTTPS 接口。

**Q: 演示时手机怎么访问？**
A: `npm run dev -- --host`，手机和电脑连同一 WiFi，手机浏览器输入局域网 IP 即可。
