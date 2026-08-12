# 非政治安全参考材料正式内置实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 PDF 中可核验的非政治安全案件转化为后端正式内置的检察建议与普法方案，确保清理 Mock 后仍存在。

**Architecture:** 新增独立的正式参考数据模块，以稳定 `source_key` 幂等写入 SQLite；表记录使用 `built_in_reference` 标识，列表接口正常返回，删除接口禁止删除。前端不再为这两类内容保存基准副本，只从正式 API 获取。

**Tech Stack:** Python、SQLite、FastAPI、Vue 3、Vitest/unittest。

---

### Task 1: 建立回归测试

**Files:**
- Create: `tests/test_reference_materials.py`

- [ ] 验证首次初始化写入正式记录。
- [ ] 验证重复初始化不重复插入且不覆盖人工修改。
- [ ] 验证记录均带正式内置标识，且不含填写说明或旧虚构标题。

### Task 2: 建立正式参考数据模块与数据库迁移

**Files:**
- Create: `server/reference_materials.py`
- Modify: `server/database.py`

- [ ] 为两张表增加 `source_key` 与 `built_in_reference` 字段及唯一索引。
- [ ] 从 PDF 可辨识记录生成检察建议和普法方案，以 `INSERT OR IGNORE` 幂等写入。
- [ ] 在数据库初始化阶段始终补齐正式参考数据。

### Task 3: 保护并展示正式内置数据

**Files:**
- Modify: `server/main.py`

- [ ] API 返回 `builtInReference` 字段。
- [ ] 全院和部门用户均可读取正式内置参考数据。
- [ ] 删除接口拒绝删除正式内置记录。

### Task 4: 清理旧假数据与前端 Mock 副本

**Files:**
- Modify: `data/parsed/plans.json`
- Modify: `data/parsed/suggestions.json`
- Modify: `src/api/platform.ts`

- [ ] 删除旧虚构数据和填写说明行。
- [ ] 删除前端检察建议、普法方案的硬编码基准数组。
- [ ] 即使开启开发 Mock，这两类列表也调用正式后端 API。

### Task 5: 验证

- [ ] 运行后端回归测试与 Python 编译检查。
- [ ] 运行前端类型检查和生产构建。
- [ ] 搜索确认旧虚构标题及对应 Mock 数组已移除。
