# Platform Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul 6 pages of the Community Legal Risk Early Warning Platform per the requirements in `产品需求/修改条目_图文版.docx` and `附件1`.

**Architecture:** Modify types and API mock layer first (foundation), then update each page independently. Each page task is self-contained. Preserve the existing dark navy/cyan visual theme — no style changes.

**Tech Stack:** Vue 3.5 + TypeScript 6 + Vite 8 + ECharts 5 + Arco Design

---

### Task 1: Foundation — Types & API Mock Data

**Files:**
- Modify: `src/types/platform.ts`
- Modify: `src/api/platform.ts`

This task extends the type system and mock data layer to support all new features across all pages.

- [ ] **Step 1: Add new types to `src/types/platform.ts`**

Add these interfaces/types after the existing ones:

```typescript
// === Dashboard (态势盘) new types ===
export interface DashboardOverviewV2 {
  totalCasesThisYear: number
  highIncidenceType: string
  riskAlertPushCount: number
  procuratorateSuggestionCount: number
  legalPlanDeliveryCount: number
}

export interface MultiTrendData {
  date: string
  totalCases: number
  highIncidenceCount: number
  riskAlertPush: number
  procuratorateSuggestion: number
  legalPlanDelivery: number
}

// === Risk Analysis new types ===
export interface CaseCategory {
  name: string          // 一级分类 (法定大类)
  children: { name: string; value: number }[]  // 二级分类 (具体罪名)
  value: number         // total
}

export interface CaseSubject {
  id: number
  name: string
  age: number
  gender: '男' | '女'
  occupation: string
  specialIdentity: string   // 如"党员"、"人大代表"、空字符串
  isResident: boolean
  crime: string
  summary: string           // ≤100字案情梗概
}

export interface CaseTimeTrend {
  period: string          // e.g. "2025-Q1", "2026-01"
  count: number
  category: string        // 案件类型
}

export interface CaseFeatureWord {
  name: string
  value: number
}

export interface CaseDetail {
  id: number
  caseName: string
  procedureType: string   // 一审/二审/再审/死刑复核
  caseNumber: string      // 案号
  keywords: string
  judgmentReason: string
  category: string        // 所属一级分类
}

// === Procuratorate Suggestion new types ===
export type ProcuratorateCategory = '刑事检察' | '民事检察' | '行政检察' | '公益诉讼检察'

export interface ProcuratorateSuggestion {
  id: number
  title: string
  type: ProcuratorateCategory
  content: string
  target: string
  issueDate: string
  status: '待处理' | '处理中' | '已反馈' | '已驳回'
}

export interface ProcuratorateFeedItem {
  time: string
  content: string
}

export interface ProcuratorateMonthlyTrend {
  month: string
  count: number
}

// === Legal Recommend (普法方案) new types ===
export interface LegalRecommendationV2 {
  id: number
  title: string
  group: string
  scene: string
  type: string
  planId?: number
  tags: string[]
  autoGenNote: string
  coverageTarget: number
  durationDays: number
  approvalRate?: number
  pilotCommunities?: number
  resources: { icon: string; label: string; count: number }[]
}

export interface LegalPushStats {
  totalPlans: number
  onlinePushCount: number
  offlineActivityCount: number
  audienceCoverage: number
  todayPushCommunities: number
}

// === Effect Stats new types ===
export interface EffectTrendPoint {
  date: string
  alertCount: number
  closeRate: number
}

// === Map classification ===
export type MapClassification =
  | '商业商圈' | '历史文化街区' | '15分钟生活圈' | '功能属性'
  | '人口流动' | '潮汐特征' | '风险承载力' | '社会资本'
  | '产业生态' | '数字化程度'
```

- [ ] **Step 2: Update `DashboardOverview` interface**

In `src/types/platform.ts`, update the existing `DashboardOverview` to match the new 5-field structure:

```typescript
export interface DashboardOverview {
  totalCasesThisYear: number
  highIncidenceTypes: string
  riskAlertPushCount: number
  procuratorateSuggestions: number
  legalPushCount: number
}
```

- [ ] **Step 3: Add all new mock data and API functions to `src/api/platform.ts`**

Add imports for the new types, then add mock data constants and API functions for:
- `fetchDashboardOverviewV2()` — returns updated 5-field overview
- `fetchMultiTrend()` — returns trend data for 5 categories
- `fetchCaseCategories()` — returns hierarchical case type data (4 一级分类 with children)
- `fetchCaseSubjects(category?)` — returns mock subject profiles
- `fetchCaseTimeTrends(category?)` — returns time trend data
- `fetchCaseFeatureWords(category?)` — returns word cloud data
- `fetchCaseDetails(query?)` — returns case detail rows with search
- `fetchProcuratorateSuggestions()` — returns typed suggestions
- `fetchProcuratorateFeed()` — returns real-time feed items
- `fetchProcuratorateMonthlyTrend()` — returns 6 months of data
- `fetchProcuratorateCategoryDistribution()` — returns {name, value}[] for pie
- `fetchLegalRecommendationsV2()` — returns enhanced recommendations
- `fetchLegalPushStats()` — returns push statistics
- `fetchEffectTrend(period?)` — returns dual-axis trend data
- `fetchEffectRatesForPeriod(period?)` — returns rates for selected time range
- `fetchCommunityEffectStatsForPeriod(period?)` — returns stats for selected time range

All functions follow the existing `useMock` pattern. Mock data should be realistic, using Chinese content matching the Xicheng district context.

- [ ] **Step 4: Run type check**

Run: `npm run type-check`
Expected: PASS (no type errors)

- [ ] **Step 5: Commit**

```bash
git add src/types/platform.ts src/api/platform.ts
git commit -m "feat: add types and mock data for platform overhaul"
```

---

### Task 2: Navigation & Naming Updates

**Files:**
- Modify: `src/App.vue` (line 71: rename menu label)
- Modify: `src/views/index.vue` (line 4: rename page header)
- Modify: `src/components/risk-map-panel.vue` (lines 21-23: remove lat/lng from detail panel; line 311: remove lat/lng from tooltip)

- [ ] **Step 1: Rename "风险预警大盘" to "风险预警态势盘" in App.vue**

Change line 71 in `src/App.vue`:
```typescript
{ key: '/dashboard', label: '风险预警态势盘' },
```

- [ ] **Step 2: Rename page header in index.vue**

Change line 4:
```html
<a-page-header title="风险预警态势盘" subtitle="Risk Early Warning Dashboard" />
```

- [ ] **Step 3: Update map detail panel — remove lat/lng, align with 5 KPIs**

In `src/components/risk-map-panel.vue`, replace the detail panel content (lines 8-23) to show the 5 overview fields instead of lat/lng. Add fields for: 风险预警推送次数, 检察建议发送次数, 普法方案投递次数 (use mock values derived from point data). Remove the lat/lng detail-item entirely.

- [ ] **Step 4: Update tooltip in risk-map-panel.vue**

Update the tooltip formatter (around line 311) to remove lat/lng and show the 5 KPI fields instead.

- [ ] **Step 5: Run type check and dev server**

Run: `npm run type-check`
Run: `npm run dev` (verify visually)

- [ ] **Step 6: Commit**

```bash
git add src/App.vue src/views/index.vue src/components/risk-map-panel.vue
git commit -m "feat: rename dashboard to 态势盘, update map detail panel"
```

---

### Task 3: Dashboard (态势盘) — KPI Cards & Trend Charts

**Files:**
- Modify: `src/views/index.vue`

- [ ] **Step 1: Update KPI cards to 5 fields**

Replace the 4-card `<a-row>` with 5 cards (using `:span="4"` each or a flex layout with 5 items). Cards:
1. 本年度案件总数
2. 高发案件类型
3. 风险预警推送次数
4. 检察建议发送次数
5. 普法方案投递次数

Keep existing card styling (border colors, box-shadow). Use the updated `DashboardOverview` data.

- [ ] **Step 2: Replace single trend chart with 5-category tabbed trend charts**

Replace the single line chart with a tabbed interface (use Arco `<a-tabs>` or `<a-radio-group>` as a button group). Each tab renders a different ECharts chart:

1. **案件总数**: 对比柱状图 (可叠加折线), time axis = recent 3 years by quarter/half-year, each bar = a community's case count
2. **高发案件类型**: 堆叠柱状图, time axis aligned, colors = different case types, y-axis = count
3. **风险预警推送次数**: 柱状+折线组合图, bars = per-community push count, line = total trend
4. **检察建议发送次数**: 堆叠柱状图 (按建议内容分类), time axis aligned
5. **普法方案投递次数**: 堆叠柱状图 (按普法类型分类), time axis aligned

Use `fetchMultiTrend()` data. Keep existing dark theme chart colors.

- [ ] **Step 3: Run type check and verify**

Run: `npm run type-check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/views/index.vue
git commit -m "feat: update dashboard with 5 KPIs and multi-category trend charts"
```

---

### Task 4: Map Classification Menu

**Files:**
- Modify: `src/components/risk-map-panel.vue`

- [ ] **Step 1: Add map classification tab menu above the map**

Add a horizontal menu/tabs bar above the map area with the 10 classification options from attachment 1:
商业商圈, 历史文化街区, 15分钟生活圈, 功能属性, 人口流动, 潮汐特征, 风险承载力, 社会资本, 产业生态, 数字化程度

Use Arco `<a-radio-group type="button">` for compact display. Default selection: "商业商圈".

- [ ] **Step 2: Switch map data based on classification**

When classification changes, load different mock data points (different communities/locations relevant to each scheme). The map visualization stays the same (heatmap + scatter), but the data points and their labels change.

Add a `classification` ref and a computed that returns different point sets. For now, all classifications can share the same base points but with different community names/labels reflecting the classification context.

- [ ] **Step 3: Run type check**

Run: `npm run type-check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/risk-map-panel.vue
git commit -m "feat: add map classification menu with 10 schemes"
```

---

### Task 5: Risk Analysis — Complete Overhaul

**Files:**
- Modify: `src/views/risk-analysis.vue` (complete rewrite)

This is the largest task. The page transforms from a simple table+pie into a multi-panel analysis dashboard.

- [ ] **Step 1: Build main view with hierarchical pie chart**

Replace the entire template. New structure:
1. Page header (keep existing)
2. Main pie chart card showing 一级分类:
   - 侵财类犯罪 (children: 诈骗罪(含电信网络诈骗), 盗窃罪, 抢夺罪)
   - 人身伤害类犯罪 (children: 故意伤害罪, 寻衅滋事罪, 非法拘禁罪)
   - 危害公共安全类犯罪 (children: 危险驾驶罪, 交通肇事罪)
   - 妨害社会管理类犯罪 (children: 聚众斗殴罪, 容留他人吸毒罪, 帮信罪)

Use ECharts sunburst or nested pie chart. Clicking a slice sets `selectedCategory` which changes the sub-menu views below.

- [ ] **Step 2: Add sub-menu tab navigation**

Below the pie chart, add `<a-tabs>` with 3 tabs:
1. 涉案主体特征画像
2. 案件时间趋势画像
3. 案件情节特征画像

Content of each tab depends on `selectedCategory`.

- [ ] **Step 3: Implement 涉案主体特征画像 tab**

Charts:
- Age distribution: ECharts bar chart (横向柱状图)
- Gender: ECharts donut/ring chart
- 户籍 (resident vs non-resident): ECharts donut chart
- Occupation distribution: horizontal bar chart

Use `fetchCaseSubjects(selectedCategory)` data, compute aggregations locally.

- [ ] **Step 4: Implement 案件时间趋势画像 tab**

Charts:
- Line chart: case count trend by month over past 2 years
- Stacked bar chart: seasonal pattern by quarter, colors = different subcategories

Use `fetchCaseTimeTrends(selectedCategory)` data.

- [ ] **Step 5: Implement 案件情节特征画像 tab**

Charts:
- Word cloud using ECharts scatter with `label` rendering (no extra library). Words: 作案方式, 作案场所, 是否团伙, 涉未成年人, etc.

Use `fetchCaseFeatureWords(selectedCategory)` data.

- [ ] **Step 6: Add case detail table with search**

Below the tabs, add a card "案件细则" with:
- Search bar: input for 案号、案由、关键词
- Table columns: 案件名称, 案件审判程序类别, 案号, 关键词, 裁判理由, 案件详情(link)
- Use `fetchCaseDetails({ keyword, category: selectedCategory })` data
- Pagination: 10 per page

- [ ] **Step 7: Run type check**

Run: `npm run type-check`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/views/risk-analysis.vue
git commit -m "feat: overhaul risk analysis with pie chart, profiles, trends, word cloud, case table"
```

---

### Task 6: Procuratorate Suggestion — Enhancement

**Files:**
- Modify: `src/views/procuratorate-suggestion.vue` (rewrite)

- [ ] **Step 1: Fix existing bug — change `message` to `Message`**

Replace all `message.success(...)` and `message.info(...)` with `Message.success(...)` and `Message.info(...)`.

- [ ] **Step 2: Restructure layout to 3-column with charts**

New layout (keep dark theme):
- Top: Page header + filter section (keep existing)
- Main area: 3-column grid
  - Left column: 
    - "检察建议类别分布" pie chart (四大检察: 刑事检察/民事检察/行政检察/公益诉讼检察)
    - "近六个月建议数量趋势" line chart
  - Center column: keep existing table (suggestions list), but wire to API mock data via `fetchProcuratorateSuggestions()`
  - Right column: "实时动态流" — scrolling feed with timestamps

- [ ] **Step 3: Add color-coded status with blinking animation**

In the table, render status with colored dots:
- 蓝色 `#165DFF` — 已反馈
- 橙色 `#FF7D00` — 处理中
- 绿色 `#00B42A` — 已完成 (待处理)
- 红色 `#F53F3F` — 已驳回

Add CSS `@keyframes blink` animation for the status dots.

- [ ] **Step 4: Add real-time feed panel**

Right column shows a scrolling list of feed items from `fetchProcuratorateFeed()`:
```
[14:02] xx社区 已接收《宠物管理建议》
[13:50] 检察官 张某 发起了一项刑事预警
```
Auto-scroll, newest at top. Use CSS for timeline styling.

- [ ] **Step 5: Run type check**

Run: `npm run type-check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/views/procuratorate-suggestion.vue
git commit -m "feat: enhance procuratorate suggestion with charts, feed, status colors"
```

---

### Task 7: Legal Recommend (普法方案) — Enhancement

**Files:**
- Modify: `src/views/legal-recommend.vue` (rewrite)

- [ ] **Step 1: Add top banner with animated counter**

Add a banner bar at the top:
```
今日已为 [32] 个社区推送普法方案
```
The number should animate/increment using `setInterval` (increment by 1 every few seconds). Use CSS for the counter styling.

- [ ] **Step 2: Add right-side stats panel**

Add 4 stat cards on the right (or top-right):
- 普法方案投放总数
- 线上推送次数
- 线下活动次数
- 受众覆盖总量

Use `fetchLegalPushStats()` data.

- [ ] **Step 3: Enhance each plan card**

Each card now shows:
- Title + tags row (colored tags: "高发预警" red, "人群精准匹配" blue, "近期热搜" orange)
- Auto-generation note in small text: "基于近期社区内物业纠纷增长15%自动生成"
- 基本属性: 适用人群, 触发场景
- 资源清单: icons row (🎬 视频 x2, 📄 PPT x1, 🎨 传单 x5, 📻 广播 x1)
- 数据摘要: 覆盖 5000+ | 周期 15天 | 好评 95%
- 互动数据: "已在3个社区试点，好评率95%" (if applicable)
- Action buttons: 采纳并推送, 查看方案

Use `fetchLegalRecommendationsV2()` data.

- [ ] **Step 4: Run type check**

Run: `npm run type-check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/views/legal-recommend.vue
git commit -m "feat: enhance legal recommend with stats, animated counter, rich cards"
```

---

### Task 8: Effect Stats — Time Filter & Dual-Axis Chart

**Files:**
- Modify: `src/views/effect-stats.vue`

- [ ] **Step 1: Add time period filter**

Add `<a-radio-group type="button">` at the top-right of the page with options:
- 本周 / 本月 / 全年

Default: 本月. When changed, re-fetch data for the selected period.

- [ ] **Step 2: Add dual-axis line chart**

Below the 3 progress cards and above the table, add a new card "预警与处理效率趋势" containing an ECharts chart:
- Left Y-axis: 预警总数 (bar or line)
- Right Y-axis: 结案闭环率 (% line)
- X-axis: dates (past 30 days)

Use `fetchEffectTrend(period)` data.

- [ ] **Step 3: Add community-level visualization**

Below or beside the table, add a pie chart or bar chart showing community comparison data (optional, fills empty space).

- [ ] **Step 4: Wire time filter to all data**

When the time period radio changes:
- Re-fetch rates via `fetchEffectRatesForPeriod(period)`
- Re-fetch community stats via `fetchCommunityEffectStatsForPeriod(period)`
- Re-fetch trend via `fetchEffectTrend(period)`

- [ ] **Step 5: Run type check**

Run: `npm run type-check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/views/effect-stats.vue
git commit -m "feat: add time filter and dual-axis trend chart to effect stats"
```

---

### Task 9: Final Verification

**Files:** All modified files

- [ ] **Step 1: Run full type check**

Run: `npm run type-check`
Expected: PASS with no errors

- [ ] **Step 2: Run dev server and verify all pages**

Run: `npm run dev`
Visit each route and verify:
- `/dashboard` — 5 KPI cards, map with classification menu, 5-tab trend charts
- `/risk-analysis` — pie chart, 3 sub-tabs, case detail table
- `/procuratorate-suggestion` — 3-column layout, charts, feed, status colors
- `/legal-recommend` — animated counter, stats, enhanced cards
- `/effect-stats` — time filter, dual-axis chart

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final verification - all pages working"
```
