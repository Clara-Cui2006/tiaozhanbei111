# Street Relative Color Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Map the current 15 street case counts onto a shared blue-to-red relative color scale.

**Architecture:** `case-count-metrics.ts` owns normalization and interpolation. `risk-map-panel.vue` and the Three.js metric builder consume the same API so 2D, 3D, tooltips, and legends remain consistent.

**Tech Stack:** Vue 3, TypeScript, ECharts, Three.js, Vitest

## Global Constraints

- Minimum current street case count maps to blue.
- Maximum current street case count maps to red.
- Intermediate values use continuous blue, cyan, yellow, orange, red interpolation.
- Equal values use equal colors; a fully equal dataset uses blue.
- Keep all changes uncommitted.

---

### Task 1: Shared Relative Color Scale

**Files:**
- Modify: `src/components/xicheng-three-map/case-count-metrics.ts`
- Test: `src/components/xicheng-three-map/case-count-metrics.test.ts`

**Interfaces:**
- Produces: `getRelativeCaseColor(value: number, minValue: number, maxValue: number): string`
- Produces: `getCaseCountExtent(values: number[]): { min: number; max: number }`
- Produces: `buildRelativeLegendStops(minValue: number, maxValue: number)`

- [ ] Write tests asserting `10 -> #1689C4`, `30 -> #E94B5B`, repeated values share colors, and an all-equal dataset uses blue.
- [ ] Run the metric test and confirm the former max-only mapping fails these assertions.
- [ ] Implement min-max normalization and piecewise interpolation across `QUANTITY_COLORS`.
- [ ] Update `buildStreetCaseMetrics()` to calculate one extent across all current streets and assign relative colors.
- [ ] Run the metric and Three.js layer tests.

### Task 2: Map and Legend Consumers

**Files:**
- Modify: `src/components/risk-map-panel.vue`

**Interfaces:**
- Consumes: `getCaseCountExtent`, `getRelativeCaseColor`, `buildRelativeLegendStops` from Task 1.

- [ ] Replace every max-only `getCaseCountRange()` color lookup with the shared relative color function using the current street minimum and maximum.
- [ ] Replace discrete ECharts `visualMap.pieces` with continuous `visualMap.min`, `visualMap.max`, and the shared color ramp.
- [ ] Change the legend labels to current minimum/maximum and relative quantity wording.
- [ ] Run focused tests and the production build.

### Task 3: Local Browser Preview

**Files:**
- Generated locally: `var/parsed-preview-dist/**`

- [ ] Build with `npx vite build --config var/parsed-preview-vite.config.ts`.
- [ ] Reload `http://127.0.0.1:4173/`.
- [ ] Open the map area and confirm the lowest street is blue and highest street is red.
- [ ] Leave the browser visible for user review and keep Git changes uncommitted.
