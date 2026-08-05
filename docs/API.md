# 社区法律风险预警平台 — 前端接口与 API 说明

本文档汇总前端项目中的 **HTTP 请求**（`src/api/http.ts` + `src/api/platform.ts`）及 **WebSocket** 约定，便于与后端联调。默认 `axios` 的 `baseURL` 为环境变量 `VITE_API_BASE_URL`；未配置时为 `"/api"`。

Mock仅允许在开发构建中通过 `VITE_USE_MOCK=true` 显式开启；生产构建始终访问后端，失败时不得回退演示数据。登录、权限、导入、审计和AI接口以 `server/main.py` 为准。

---

## 环境变量

| 变量 | 作用 |
|------|------|
| `VITE_API_BASE_URL` | HTTP 接口根路径，默认 `/api` |
| `VITE_USE_MOCK` | 仅开发环境设为 `true` 时使用演示数据 |
| `VITE_WS_URL` | 地图等模块可选的 WebSocket 地址；未配置则不连接 |

---

## WebSocket（非 REST）

| 用途 | 配置 | 说明 |
|------|------|------|
| 社区风险点位实时更新 | `VITE_WS_URL` | `src/services/platform-socket.ts`：`createPlatformSocket`。服务端推送 JSON 中 `type === 'risk_point_update'` 且含 `community`、`riskScore` 等字段时，`risk-map-panel` 会更新对应点位。 |

---

## HTTP 接口一览

下列「前端函数」均在 `src/api/platform.ts` 中导出（`getRiskLevelByScore` 为纯前端工具函数，无网络请求）。

### 态势盘 / 主页地图

| 前端函数 | 方法 | 路径 | 说明 |
|----------|------|------|------|
| `fetchDashboardOverview` | GET | `/dashboard/overview` | 本年度案件总数等总览 |
| `fetchRiskTrend` | GET | `/dashboard/risk-trend` | 风险趋势（旧版单序列） |
| `fetchCommunityRiskPoints` | GET | `/dashboard/community-risk-points` | 社区风险地图点位 |
| `fetchMultiTrend` | GET | `/dashboard/multi-trend` | 多指标月度趋势 |

### 风险分析

| 前端函数 | 方法 | 路径 | 说明 |
|----------|------|------|------|
| `fetchRiskEvents` | GET | `/risk-analysis/events` | 历史/风险事件，支持 query |
| `fetchRiskScoringConfig` | GET | `/risk-analysis/scoring-config` | 风险分值阈值配置 |
| `saveRiskScoringConfig` | PUT | `/risk-analysis/scoring-config` | 保存阈值配置 |
| `fetchCaseCategories` | GET | `/risk-analysis/case-categories` | 案件类型占比（含子类） |
| `fetchCaseSubjects` | GET | `/risk-analysis/case-subjects` | 涉案主体画像，`params.category` |
| `fetchCaseTimeTrends` | GET | `/risk-analysis/case-time-trends` | 时间趋势，`params.category` |
| `fetchCaseFeatureWords` | GET | `/risk-analysis/case-feature-words` | 情节特征词云数据，`params.category` |
| `fetchCaseDetails` | GET | `/risk-analysis/case-details` | 案件细则表，`params` 同 `CaseDetailQuery` |

### 预警推送

| 前端函数 | 方法 | 路径 | 说明 |
|----------|------|------|------|
| `fetchPushTasks` | GET | `/alert-push/tasks` | 推送任务列表 |

### 检察建议

| 前端函数 | 方法 | 路径 | 说明 |
|----------|------|------|------|
| `fetchProcuratorateSuggestions` | GET | `/procuratorate/suggestions` | 建议列表（不含已忽略） |
| `fetchProcuratorateSuggestionById` | GET | `/procuratorate/suggestions/:id` | 单条详情 |
| `createProcuratorateSuggestion` | POST | `/procuratorate/suggestions` | 新建，Body：`ProcuratorateSuggestionInput` |
| `updateProcuratorateSuggestion` | PUT | `/procuratorate/suggestions/:id` | 更新，Body：部分字段 |
| `ignoreProcuratorateSuggestion` | POST | `/procuratorate/suggestions/:id/ignore` | 忽略（列表隐藏，审计由后端定） |
| `fetchProcuratorateFeed` | GET | `/procuratorate/feed` | 实时动态流 |
| `fetchProcuratorateMonthlyTrend` | GET | `/procuratorate/monthly-trend` | 近月建议数量趋势 |
| `fetchProcuratorateCategoryDistribution` | GET | `/procuratorate/category-distribution` | 四大检察占比 |

### 普法方案 / 智能推荐

| 前端函数 | 方法 | 路径 | 说明 |
|----------|------|------|------|
| `fetchLegalRecommendations` | GET | `/legal-recommend/recommendations` | 旧版推荐列表（与 v2 数据已对齐，备用） |
| `fetchLegalPlanDetail` | GET | `/legal-recommend/plans/:id` | 方案详情 |
| `adoptLegalRecommendation` | POST | `/legal-recommend/adopt` | Body：`{ id }` 采纳推荐 |
| `fetchLegalRecommendationsV2` | GET | `/legal-recommend/v2/recommendations` | 普法方案卡片（新版） |
| `createLegalRecommendation` | POST | `/legal-recommend/v2/recommendations` | 新增材料草稿，状态为待人工审核 |
| `updateLegalRecommendation` | PUT | `/legal-recommend/v2/recommendations/:id` | 在线编辑后保存，状态回到待人工审核 |
| `submitLegalRecommendationReview` | POST | `/legal-recommend/v2/recommendations/:id/submit-review` | 提交人工审核，写入审计 |
| `fetchLegalPushStats` | GET | `/legal-recommend/push-stats` | 投放与覆盖统计 |

### 西城区街道风险地图

| 前端函数 | 方法 | 路径 | 说明 |
|----------|------|------|------|
| `fetchXichengStreetMapOverview` | GET | `/dashboard/street-map/overview` | 返回全区总量、已归属街道、待确认、跨街道、不纳入街道统计四类口径 |
| `fetchXichengStreetMapDetail` | GET | `/dashboard/street-map/detail` | 返回街道详情：法定罪名/案由、治理主题、重点人群、重点行业/案发情形、内部移送线索；政治安全模式下额外返回主体、行为、时间趋势图表数据 |

通用筛选参数：`period`、`caseType`、`governanceTheme`。其中 `caseType` 对应法定罪名/案由，`governanceTheme` 对应治理主题标签。

政治安全地图筛选参数：`politicalOnly=true`、`locationDimension`、`behaviorContent`、`subjectType`、`timeDimension`、`reviewStatusTopic`。政治安全模式下只加载政治安全类别案件，四维筛选分别对应地点维度、行为内容、涉及主体、时间维度，并支持按“涉外风险/待人工复核/高风险”等重点专题与复核状态筛选。

### 政治安全专题

| 前端函数 | 方法 | 路径 | 说明 |
|----------|------|------|------|
| `fetchPoliticalOverview` | GET | `/political/overview` | 政治安全总览、四维研判说明、人工复核、高关注/高风险数量及占比、重点专题 |
| `fetchPoliticalMonthlyTrend` | GET | `/political/monthly-trend` | 政治安全信号月度趋势 |
| `fetchPoliticalStreetStats` | GET | `/political/street-stats` | 街道级政治安全信号、风险等级、研判状态 |

### 效果评估统计

| 前端函数 | 方法 | 路径 | 说明 |
|----------|------|------|------|
| `fetchEffectRates` | GET | `/effect-stats/rates` | 默认三率 |
| `fetchCommunityEffectStats` | GET | `/effect-stats/community` | 社区维度统计 |
| `fetchEffectTrend` | GET | `/effect-stats/trend` | 双轴趋势，`params.period`（如 `7d`/`30d`） |
| `fetchEffectRatesForPeriod` | GET | `/effect-stats/rates-period` | 按时段三率，`params.period` |
| `fetchCommunityEffectStatsForPeriod` | GET | `/effect-stats/community-period` | 按时段社区表，`params.period` |

### 系统设置

| 前端函数 | 方法 | 路径 | 说明 |
|----------|------|------|------|
| `fetchSystemSettings` | GET | `/system-settings` | 读取配置 |
| `saveSystemSettings` | PUT | `/system-settings` | 保存配置 |

### 主页官方动态

| 前端函数 | 方法 | 路径 | 说明 |
|----------|------|------|------|
| `fetchOfficialDynamics` | GET | `/home/official-dynamics` | 动态列表 |
| `fetchOfficialDynamicDetail` | GET | `/home/official-dynamics/:id` | 文章详情 |
| `pushOfficialDynamic` | POST | `/home/official-dynamics/push` | 发布动态 |
| `deleteOfficialDynamic` | DELETE | `/home/official-dynamics/:id` | 删除动态 |

### 往期窗口 / 归档

| 前端函数 | 方法 | 路径 | 说明 |
|----------|------|------|------|
| `fetchArchiveItems` | GET | `/archive/items` | `params.category` 可选 |
| `fetchArchiveItemDetail` | GET | `/archive/items/:id` | 归档文章详情 |

### 站点页脚

| 前端函数 | 方法 | 路径 | 说明 |
|----------|------|------|------|
| `fetchSiteFooterInfo` | GET | `/site/footer` | 备案号、外链等 |

---

## 类型定义位置

主要请求/响应类型见 `src/types/platform.ts`（如 `ProcuratorateSuggestionInput`、`DashboardOverview`、`CaseDetail` 等）。

`EffectRate`（`/effect-stats/rates-period`）除 `responseRate`、`closeRate`、`reachRate` 外，还可包含可选字段：`mediationRate`、`gridCoverage`、`satisfactionRate`、`avgResponseHours`（前端效果评估页使用）。

---

## 纯工具（无 HTTP）

| 函数 | 说明 |
|------|------|
| `getRiskLevelByScore` | 根据分值返回「高 / 中 / 低」，供地图等组件使用 |

---

## 前端路由（检察建议相关页面）

| 路径 | 说明 |
|------|------|
| `/procuratorate-suggestion` | 列表与图表 |
| `/procuratorate-suggestion/detail/:id` | 建议详情（只读） |
| `/procuratorate-suggestion/new` | 新建建议表单 |
| `/procuratorate-suggestion/edit/:id` | 编辑建议表单 |

---

*文档随 `src/api/platform.ts` 变更维护；若后端路径或动词不一致，以实际网关配置为准。*
