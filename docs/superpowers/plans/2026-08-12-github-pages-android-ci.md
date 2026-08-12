# GitHub Pages and Android CI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the compiled Vue application to GitHub Pages and repair Android CI's Gradle paths.

**Architecture:** GitHub Actions builds the Vite application and uploads `dist` as the Pages artifact. Static web and Electron navigation use hash history so routes do not depend on server-side fallback behavior. Android shell steps execute inside `android/` while action artifact paths stay rooted at the checkout.

**Tech Stack:** GitHub Actions, Vite, Vue Router, Node test runner, Gradle

---

### Task 1: Add deployment regression checks

**Files:**
- Create: `scripts/check_deployment_config.mjs`

- [ ] Assert Android shell commands use `android/`, Pages builds and uploads `dist`, and router uses hash history.
- [ ] Run `node scripts/check_deployment_config.mjs` and confirm it fails against the old configuration.

### Task 2: Repair workflows and routing

**Files:**
- Modify: `.github/workflows/android.yml`
- Create: `.github/workflows/pages.yml`
- Modify: `src/router/index.ts`

- [ ] Set Android shell steps to `working-directory: android` and fix the artifact path.
- [ ] Add the official Pages build/upload/deploy workflow for `dist`.
- [ ] Use `createWebHashHistory()` for static browser hosting.
- [ ] Run the deployment regression test and confirm it passes.

### Task 3: Verify and publish

- [ ] Run `npm run test:run`.
- [ ] Run `npm run build`.
- [ ] Run Python unit tests with server dependencies installed.
- [ ] Commit the scoped files and push `main`.
- [ ] Inspect GitHub Actions and the deployed page after the push.
