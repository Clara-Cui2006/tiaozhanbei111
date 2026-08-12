# 检察业务月报智能生成 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在检察建议栏目交付参考图风格、由院内本地 AI API 辅助生成且必须人工审核发布的月报工作台。

**Architecture:** 前端用独立月报领域模块管理章节、状态转换与导出内容，用 Vue 页面呈现参考图布局；API 层同时支持开发 Mock 与 FastAPI 持久化接口。后端只发送授权范围内的聚合数据给现有模型适配器，并在数据库保存草稿和审核状态。

**Tech Stack:** Vue 3、TypeScript、Arco Design、ECharts、Vitest、FastAPI、SQLite、httpx

---

### Task 1: 月报领域模型和状态机

**Files:**
- Create: `src/features/monthly-report/model.ts`
- Test: `src/features/monthly-report/model.test.ts`

- [ ] 先写状态转换、章节完整性和 Word 文档内容的失败测试。
- [ ] 运行 `npm run test:run -- src/features/monthly-report/model.test.ts`，确认因模块缺失失败。
- [ ] 实现固定七章节、审核状态转换和 Word HTML 生成。
- [ ] 再次运行测试并确认通过。

### Task 2: API 与本地模型生成链路

**Files:**
- Modify: `server/database.py`
- Modify: `server/schemas.py`
- Modify: `server/main.py`
- Modify: `server/ai.py`
- Modify: `src/api/platform.ts`
- Modify: `src/types/platform.ts`

- [ ] 增加月报表、请求模型、聚合数据构造与 CRUD/审核端点。
- [ ] 调用现有 `generate` 模型适配器，浏览器不接触模型地址或密钥。
- [ ] 增加开发 Mock 月报及相同状态语义。
- [ ] 使用 Python 编译与 TypeScript 类型检查验证接口结构。

### Task 3: 参考图风格月报工作台

**Files:**
- Create: `src/views/procuratorate-monthly-report.vue`
- Modify: `src/router/index.ts`
- Modify: `src/views/procuratorate-suggestion.vue`
- Modify: `src/config/navigation.ts`

- [ ] 添加检察建议页月报入口与受权限保护的工作台路由。
- [ ] 实现月份与状态头部、七章侧栏、白色正式文稿画布和数据图形。
- [ ] 实现在线编辑、保存、提交审核、退回、确认发布、重新生成和 Word 导出。
- [ ] 增加窄屏布局与浅色/深色容器兼容。

### Task 4: 验证和交付

**Files:**
- Create: `design-qa.md`

- [ ] 运行月报单测、全量前端测试、类型检查、生产构建、Python 编译和安全扫描。
- [ ] 启动 Mock 预览，检查入口、章节切换、编辑与审核发布主流程。
- [ ] 对照参考图记录视觉 QA，修复高优先级问题。
- [ ] 保持本地预览运行并交付检查地址。
