# 政治安全地图恢复与蓝色视觉优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 恢复政治安全页面稳定可见的交互式西城区街道地图，并优化识别口径布局与蓝色视觉层级。

**Architecture:** 保留 `risk-map-panel.vue` 的数据获取、GeoJSON 注册、筛选和详情联动，仅将街道边界主渲染从 WebGL `map3D` 切回标准 ECharts `map` 系列。政治安全专题卡片只调整模板层级与 scoped 样式，不改变接口、数据模型或权限逻辑。

**Tech Stack:** Vue 3、TypeScript、ECharts 5、Arco Design、Node.js 内置测试运行器、Vite

---

## 文件结构

- Create: `tests/political-security-ui.test.mjs` — 对地图渲染类型、WebGL 依赖移除、识别口径层级和重复提示移除建立静态回归断言。
- Modify: `src/components/risk-map-panel.vue` — 恢复标准 ECharts 地图系列，保留交互并调整地图、四维研判、专题复核筛选的蓝色样式。
- Modify: `src/views/political-security.vue` — 将识别口径移出指标网格，合并重复提示并调整响应式布局。
- Modify: `package.json` — 增加可重复执行的 `test:political-security-ui` 命令。
- Modify: `package-lock.json` — 仅由 npm 同步脚本元数据，不增加依赖。

### Task 1: 建立政治安全页面结构回归测试

**Files:**
- Create: `tests/political-security-ui.test.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: 写入失败的静态回归测试**

创建 `tests/political-security-ui.test.mjs`：

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const mapPanel = await readFile(new URL('../src/components/risk-map-panel.vue', import.meta.url), 'utf8')
const politicalPage = await readFile(new URL('../src/views/political-security.vue', import.meta.url), 'utf8')

test('街道地图使用标准 ECharts map 系列且不依赖 echarts-gl', () => {
  assert.match(mapPanel, /type:\s*['"]map['"]/)
  assert.doesNotMatch(mapPanel, /type:\s*['"]map3D['"]/)
  assert.doesNotMatch(mapPanel, /import\s+['"]echarts-gl['"]/)
})

test('识别口径独立于两项统计指标且没有重复提示', () => {
  assert.match(politicalPage, /class="review-metrics"[\s\S]*class="recognition-scope"/)
  assert.match(politicalPage, /class="recognition-scope"[\s\S]*识别口径/)
  assert.doesNotMatch(politicalPage, /class="review-metric-note"/)
  assert.doesNotMatch(politicalPage, /class="method-alert"/)
})

test('研判卡片与专题筛选区具有蓝色主题覆盖', () => {
  assert.match(mapPanel, /\.xrm-method-card\s*\{[\s\S]*linear-gradient/)
  assert.match(mapPanel, /\.xrm-political-filter-bar\s*\{[\s\S]*linear-gradient/)
})
```

- [ ] **Step 2: 在 `package.json` 增加测试脚本并同步锁文件**

在 `scripts` 中加入：

```json
"test:political-security-ui": "node --test tests/political-security-ui.test.mjs"
```

运行：

```bash
npm install --package-lock-only --ignore-scripts
```

预期：`package-lock.json` 仅同步根包脚本元数据，不新增依赖版本。

- [ ] **Step 3: 运行测试确认失败**

运行：

```bash
npm run test:political-security-ui
```

预期：测试失败，报告仍存在 `map3D`/`echarts-gl`，以及缺少 `.recognition-scope`。

- [ ] **Step 4: 提交测试基线**

```bash
git add tests/political-security-ui.test.mjs package.json package-lock.json
git commit -m "test: cover political security map and layout"
```

### Task 2: 恢复稳定的标准 ECharts 街道地图

**Files:**
- Modify: `src/components/risk-map-panel.vue`
- Test: `tests/political-security-ui.test.mjs`

- [ ] **Step 1: 移除 WebGL 运行时依赖**

删除：

```ts
import 'echarts-gl'
```

删除 `map3DDistance`、`height`、`regionHeight`、`viewControl`、`light`、`groundPlane` 和 `boxHeight` 等仅供三维系列使用的配置。

- [ ] **Step 2: 将街道模式改为标准 `map` 系列**

在 `mapBoundaryMode.value === 'street'` 分支中使用：

```ts
series: [{
  id: 'xrm-street-map-series',
  type: 'map',
  map: STREET_MAP_NAME,
  nameProperty: 'name',
  roam: true,
  scaleLimit: { min: 0.9, max: 5 },
  zoom: mapZoom.value,
  layoutCenter: ['52%', '51%'],
  layoutSize: '104%',
  selectedMode: 'single',
  data: streetData,
  itemStyle: {
    areaColor: QUANTITY_COLORS[0],
    borderColor: chartTheme.mapBorder,
    borderWidth: 1.3,
    shadowBlur: 16,
    shadowOffsetY: 8,
    shadowColor: chartTheme.mapShadow
  },
  emphasis: {
    label: {
      color: chartTheme.selectedLabelText,
      backgroundColor: chartTheme.selectedLabelBg,
      borderColor: chartTheme.selectedLabelBorder,
      textBorderColor: chartTheme.selectedLabelStroke,
      fontWeight: 700
    },
    itemStyle: { borderColor: '#ffffff', borderWidth: 2.4 }
  },
  select: {
    label: {
      color: chartTheme.selectedLabelText,
      backgroundColor: chartTheme.selectedLabelBg,
      borderColor: chartTheme.selectedLabelBorder,
      textBorderColor: chartTheme.selectedLabelStroke,
      fontWeight: 700
    },
    itemStyle: { borderColor: '#ffffff', borderWidth: 3, shadowBlur: 24 }
  },
  label: {
    show: true,
    color: chartTheme.labelText,
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 15,
    textBorderColor: chartTheme.labelStroke,
    textBorderWidth: isLightTheme.value ? 2 : 3,
    backgroundColor: chartTheme.labelBg,
    borderColor: chartTheme.labelBorder,
    borderWidth: 1,
    borderRadius: 5,
    padding: [4, 6],
    formatter: (params: any) => getShortStreetName(String(params.name || ''))
  },
  labelLayout: { hideOverlap: true, moveOverlap: 'shiftY' }
}]
```

每条 `streetData` 只保留 ECharts 二维地图支持的 `name`、`value`、`selected`、`itemStyle`、`emphasis` 和 `select`，选中项使用 `chartTheme.selectedLabelBg`，未选中项在存在选中项时降低透明度。

- [ ] **Step 3: 让缩放按钮驱动标准地图缩放**

保留现有 `mapZoom` 状态、`applyMapZoom`、`zoomIn`、`zoomOut` 和 `resetMap`，确认重新执行 `renderMap()` 后 `series.zoom` 使用最新值；地图原生滚轮/拖动由 `roam: true` 提供。

- [ ] **Step 4: 调整浅色地图舞台与图例为参考图风格**

在浅色主题覆盖中使用淡蓝白渐变和柔和投影：

```css
.xrm-card.xrm-theme-light .xrm-map-stage {
  background:
    radial-gradient(circle at 50% 38%, rgba(255, 255, 255, 0.98), rgba(232, 243, 255, 0.92) 54%, #dceafb 100%) !important;
  box-shadow: inset 0 0 42px rgba(62, 124, 190, 0.10), 0 18px 38px rgba(49, 96, 151, 0.14);
}
```

保留深色主题现有蓝色舞台，但将 `.xrm-map-box` 的投影调整为蓝黑柔光，避免地图与背景融为一体。

- [ ] **Step 5: 运行地图回归测试、类型检查和构建**

运行：

```bash
npm run test:political-security-ui
npm run type-check
npm run build
```

预期：静态测试中的地图断言通过；类型检查与生产构建无错误。

- [ ] **Step 6: 提交地图修复**

```bash
git add src/components/risk-map-panel.vue
git commit -m "fix: restore interactive political security map"
```

### Task 3: 重排识别口径并统一蓝色视觉

**Files:**
- Modify: `src/views/political-security.vue`
- Modify: `src/components/risk-map-panel.vue`
- Test: `tests/political-security-ui.test.mjs`

- [ ] **Step 1: 将识别口径移出指标网格并合并提示**

把 `.review-metric-note` 和原 `a-alert.method-alert` 替换为指标网格后的独立区块：

```vue
<div class="recognition-scope" role="note" aria-label="识别口径">
  <span class="recognition-scope-icon" aria-hidden="true">i</span>
  <div>
    <strong>识别口径</strong>
    <p>结合案件分类标签、风险规则匹配和人工复核结果综合判断。“高风险/高关注”不单纯依据案件数量判断；高发风险类型可按案件数量排序。</p>
  </div>
</div>
```

`.review-metrics` 只包含“人工复核案件总量”和“重点专题案件总量”两个直接子项。

- [ ] **Step 2: 调整专题卡布局与响应式行为**

使用：

```css
.review-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.recognition-scope {
  grid-column: 1 / -1;
  display: flex;
  gap: 12px;
  margin-top: 14px;
  padding: 14px 16px;
  border: 1px solid rgba(88, 177, 235, 0.34);
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(24, 92, 151, 0.32), rgba(9, 39, 77, 0.58));
}
```

浅色主题将其覆盖为淡蓝背景与深蓝文字；现有移动端断点中将 `.topic-card-layout` 和 `.review-metrics` 改为单列。

- [ ] **Step 3: 将四维研判卡改为统一蓝色层级**

深色主题：

```css
.xrm-method-card {
  border-color: rgba(79, 181, 244, 0.42);
  background: linear-gradient(145deg, rgba(26, 102, 169, 0.62), rgba(8, 42, 86, 0.88));
  box-shadow: inset 0 1px 0 rgba(174, 225, 255, 0.12), 0 8px 20px rgba(2, 20, 48, 0.18);
}
```

浅色主题：

```css
.xrm-card.xrm-theme-light .xrm-method-card {
  border-color: rgba(70, 145, 207, 0.38);
  background: linear-gradient(145deg, #f7fbff, #dcebfa) !important;
}
```

- [ ] **Step 4: 将专题复核筛选区改为蓝色分组区**

深色主题：

```css
.xrm-political-filter-bar {
  border-color: rgba(75, 178, 238, 0.36);
  background: linear-gradient(135deg, rgba(20, 79, 137, 0.56), rgba(7, 35, 73, 0.76));
}
```

浅色主题改为 `linear-gradient(135deg, #edf7ff, #dcecf9)`，保持输入框白底和深蓝文字。

- [ ] **Step 5: 运行回归测试、类型检查和构建**

```bash
npm run test:political-security-ui
npm run type-check
npm run build
```

预期：3个 UI 回归测试全部通过；类型检查与生产构建通过。

- [ ] **Step 6: 提交布局和配色优化**

```bash
git add src/views/political-security.vue src/components/risk-map-panel.vue
git commit -m "style: refine political security dashboard hierarchy"
```

### Task 4: 浏览器验证与最终检查

**Files:**
- Verify: `src/views/political-security.vue`
- Verify: `src/components/risk-map-panel.vue`
- Verify: `tests/political-security-ui.test.mjs`

- [ ] **Step 1: 启动本地开发服务器**

```bash
npm run dev -- --host 127.0.0.1
```

预期：Vite 输出本地访问地址，页面无启动错误。

- [ ] **Step 2: 在浏览器验证政治安全页面**

使用开发环境允许的演示数据配置进入政治安全页面，逐项确认：地图可见、15个街道标签可见、街道点击打开详情、放大/缩小/复位有效、图例开合有效、专题与复核状态筛选可触发地图刷新。

- [ ] **Step 3: 验证浅色与深色主题**

浅色主题确认地图接近参考图的淡蓝白视觉；深色主题确认地图边界、标签、四维卡片、筛选区和识别口径均具有足够对比度。将视口缩窄到移动端宽度，确认两项指标与四维卡片按断点重排且无横向溢出。

- [ ] **Step 4: 执行完整验证**

```bash
npm run test:political-security-ui
npm run type-check
npm run build
python3 -m py_compile server/*.py
bash -n scripts/deploy_server.sh scripts/build_offline_bundle.sh
npm run security:scan
git diff --check
git status --short
```

预期：所有命令成功；`git diff --check` 无输出；工作区只包含计划内文件。

- [ ] **Step 5: 提交最终验证修正（仅当浏览器验证产生修正时）**

```bash
git add src/views/political-security.vue src/components/risk-map-panel.vue tests/political-security-ui.test.mjs package.json package-lock.json
git commit -m "fix: complete political security dashboard qa"
```

若浏览器验证未产生代码修正，则跳过此提交。
