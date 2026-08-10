# Home Account Scroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the home-page account control scroll out with the hero while keeping the sticky header unobstructed.

**Architecture:** Keep one account-menu instance and route it through Vue `Teleport` to either a document-positioned home layer or a header slot. The home layer forms a stacking context below the sticky header.

**Tech Stack:** Vue 3, scoped CSS, Node.js built-in test runner

## Global Constraints

- Preserve the current account menu behavior and appearance.
- Apply identical scroll behavior in light and dark themes.
- Keep responsive organization-label hiding behavior.

---

### Task 1: Account placement regression

**Files:**
- Create: `tests/account-slot-position.test.mjs`
- Modify: `src/App.vue`

**Interfaces:**
- Consumes: `isHomeRoute` and the existing account menu markup in `src/App.vue`.
- Produces: `#home-account-layer`, `#header-account-layer`, and a reactive Vue `Teleport` destination.

- [x] **Step 1: Write the failing test**

Add a Node test that checks for both placement targets, the teleport destination, absolute home positioning, and a home stacking level below the sticky header.

- [x] **Step 2: Run test to verify it fails**

Run: `node tests/account-slot-position.test.mjs`

Expected: FAIL because the placement targets and teleport do not exist and `.account-slot--hero` uses fixed positioning.

- [x] **Step 3: Write minimal implementation**

Add the two targets, move the existing account markup into a reactive `Teleport`, make `.layout-shell` the positioning container, and change the home account slot to absolute positioning beneath the header stacking context.

- [x] **Step 4: Run automated checks**

Run: `node tests/account-slot-position.test.mjs`, `npm run type-check`, and `npm run build`.

Expected: all commands exit successfully.

- [x] **Step 5: Verify browser behavior**

At `http://127.0.0.1:4173/`, test the home page at the top and after scrolling in light and dark modes. The account control must move upward with the page and remain behind the sticky header while crossing it.

- [ ] **Step 6: Commit and push**

Stage the design, plan, test, and application change. Commit to `xwh` and push `xwh` to `origin`.
