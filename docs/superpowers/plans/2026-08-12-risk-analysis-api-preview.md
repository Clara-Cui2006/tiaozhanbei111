# Risk Analysis API Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the risk-analysis dashboard consume imported database records through real APIs and provide reversible local preview data.

**Architecture:** A backend risk-analysis module owns the six-category taxonomy and pure aggregation functions. FastAPI endpoints apply the existing permission scope, fetch scoped rows, and pass them to the aggregators. Optional subject fields are added to the import schema, while a separate idempotent seed script inserts and clears preview-only records.

**Tech Stack:** FastAPI, SQLite, Python 3, pytest, Vue 3, TypeScript

---

### Task 1: Define and test database aggregation

**Files:**
- Create: `server/risk_analysis.py`
- Create: `tests/test_risk_analysis.py`

- [ ] Write failing tests for six-category output, chapter counts, category filtering, subjects, monthly trends, and feature words.
- [ ] Run `python3 -m pytest tests/test_risk_analysis.py -q` and confirm failure because the module is missing.
- [ ] Implement the canonical taxonomy and pure row aggregation functions.
- [ ] Run the focused test and confirm all aggregation tests pass.

### Task 2: Extend the import contract for subject data

**Files:**
- Modify: `server/database.py`
- Modify: `server/importer.py`
- Modify: `server/main.py`
- Modify: `tests/test_risk_analysis.py`

- [ ] Add a failing import test for optional `当事人姓名、年龄、性别、职业、特殊身份` fields.
- [ ] Add nullable case columns and migration entries.
- [ ] Parse, validate, and insert the optional subject fields while keeping old imports compatible.
- [ ] Run the focused backend tests.

### Task 3: Expose real risk-analysis APIs

**Files:**
- Modify: `server/main.py`
- Modify: `tests/test_risk_analysis.py`

- [ ] Add failing tests for API-shaped aggregator payloads and governance-category case filtering.
- [ ] Implement four previously empty endpoints and update the existing case-list category filter.
- [ ] Remove the four implemented routes from `EMPTY_LIST_ENDPOINTS`.
- [ ] Run backend tests and Python compilation.

### Task 4: Add reversible preview data

**Files:**
- Create: `server/risk_preview_data.py`
- Create: `scripts/seed_risk_preview.py`
- Modify: `tests/test_risk_analysis.py`

- [ ] Add failing tests for 18 records, full six-category coverage, idempotent seeding, and scoped clearing.
- [ ] Implement anonymous preview records and the `seed_preview_cases` / `clear_preview_cases` helpers.
- [ ] Implement CLI commands: default seed and `--clear`.
- [ ] Seed the local development database and verify six categories are populated.

### Task 5: End-to-end verification

**Files:**
- Verify all modified files.

- [ ] Run `python3 -m pytest tests -q`.
- [ ] Run `python3 -m py_compile server/*.py scripts/seed_risk_preview.py`.
- [ ] Run `npm run test:run`, `npm run type-check`, and `npm run build-only`.
- [ ] Start the backend and frontend preview, call the real endpoints, and confirm non-empty responses.
- [ ] Review `git diff --check` and commit only task files.
