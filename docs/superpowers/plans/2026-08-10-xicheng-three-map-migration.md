# Xicheng Three.js Street Map Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dashboard's 3D ECharts street map with the verified `zhihuixicheng` Three.js visualization while retaining the current 2D map, filters, legend, controls, and detail-panel data flow.

**Architecture:** A new `xicheng-three-map` feature directory owns map types, case-count adaptation, scene construction, interaction, camera control, labels, and disposal. `risk-map-panel.vue` remains the orchestration layer: it fetches `StreetMapOverview`, passes case counts and selection to the Three.js component, keeps the existing ECharts 2D path, and routes street selections into the existing detail API.

**Tech Stack:** Vue 3.5, TypeScript 6, Three.js 0.185, ECharts 5/ECharts GL, Vitest, Vite 8

## Global Constraints

- Preserve the source project's Three.js technology platform, bloom, glowing outlines, extrusion, labels, camera animation, hover lift, click focus, auto-rotation, drag, pan, wheel zoom, and reset behavior.
- Preserve the target project's current 2D map, filters, summary cards, legend, controls, captions, detail tabs, and chart data.
- Continue using the current five dynamic case-count bands: `0`, `ceil(max*0.2)`, `ceil(max*0.4)`, `ceil(max*0.6)`, and `ceil(max*0.8)`.
- Keep the Three.js map dark in both page themes.
- Copy the cleaned 15-street GeoJSON and ODbL attribution; do not modify `E:\Create\zhihuixicheng`.
- Commit implementation work to `xwh` and push to `origin/xwh` after verification.

---

### Task 1: Test runner and shared case-count bands

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/components/xicheng-three-map/case-count-metrics.ts`
- Create: `src/components/xicheng-three-map/case-count-metrics.test.ts`
- Modify: `src/components/risk-map-panel.vue:641-668,1241-1329`

**Interfaces:**
- Consumes: `StreetMapStreetStat[]` from `src/api/platform.ts`.
- Produces:

```ts
export type CaseCountLevel = 1 | 2 | 3 | 4 | 5
export interface CaseCountRange { min: number; max: number; level: CaseCountLevel; color: string; label: string }
export interface StreetCaseMetric { adcode: string; name: string; caseCount: number; level: CaseCountLevel; color: string }
export const QUANTITY_COLORS: readonly string[]
export function normalizeStreetName(name: string): string
export function buildCaseCountRanges(maxValue: number): CaseCountRange[]
export function getCaseCountRange(value: number, maxValue: number): CaseCountRange
export function buildStreetCaseMetrics(streets: StreetMapStreetStat[]): Record<string, StreetCaseMetric>
```

- [ ] **Step 1: Install the test and rendering dependencies**

Run:

```powershell
npm install three@^0.185.1
npm install --save-dev @types/three@^0.185.4 vitest@^4.1.10 jsdom@^30.0.1 @vue/test-utils@^2.4.6
```

Add these scripts to `package.json`:

```json
"test:run": "vitest run",
"test:map": "vitest run src/components/xicheng-three-map"
```

- [ ] **Step 2: Write the failing case-count tests**

Create `case-count-metrics.test.ts` with assertions for:

```ts
expect(buildCaseCountRanges(28).map(({ min, max }) => [min, max])).toEqual([
  [0, 5], [6, 11], [12, 16], [17, 22], [23, 28],
])
expect(buildCaseCountRanges(0)).toEqual([
  { min: 0, max: 0, level: 1, color: QUANTITY_COLORS[0], label: '0 件' },
])
expect(getCaseCountRange(23, 28).level).toBe(5)
expect(normalizeStreetName('金融街')).toBe('金融街街道')
expect(buildStreetCaseMetrics([
  { streetCode: '110102011', streetName: '金融街街道', caseCount: 23 },
])['110102011']).toMatchObject({ name: '金融街街道', caseCount: 23, level: 5 })
```

- [ ] **Step 3: Run the tests and confirm the missing-module failure**

Run: `npm run test:map`

Expected: FAIL because `case-count-metrics.ts` does not exist.

- [ ] **Step 4: Implement the shared range module**

Implement the five-band calculation by extracting the existing `buildQuantityRanges()` behavior. Make `buildStreetCaseMetrics()` calculate one maximum across the current street list and index each metric by both administrative code and normalized street name.

- [ ] **Step 5: Replace duplicated 3D range logic in `risk-map-panel.vue`**

Import `QUANTITY_COLORS`, `buildCaseCountRanges`, and `getCaseCountRange`. Keep the current continuous `getHeatColor()` path for 2D. Build the legend from `buildCaseCountRanges(getMaxCaseCount())` and use `getCaseCountRange(value, max).color` for discrete 3D data.

- [ ] **Step 6: Verify and commit the shared data contract**

Run:

```powershell
npm run test:map
npm run type-check
```

Expected: all tests pass and `vue-tsc` exits 0.

Commit:

```powershell
git add package.json package-lock.json src/components/xicheng-three-map/case-count-metrics.ts src/components/xicheng-three-map/case-count-metrics.test.ts src/components/risk-map-panel.vue
git commit -m "refactor: share street case count bands"
```

---

### Task 2: Map data, types, projection, geometry, and selection state

**Files:**
- Create: `public/maps/xicheng_15_streets_clean.geojson`
- Create: `public/maps/ODbL_ATTRIBUTION.txt`
- Create: `src/components/xicheng-three-map/types.ts`
- Create: `src/components/xicheng-three-map/map/geojson.ts`
- Create: `src/components/xicheng-three-map/map/projection.ts`
- Create: `src/components/xicheng-three-map/map/geometry.ts`
- Create: `src/components/xicheng-three-map/map/selection-state.ts`
- Create: `src/components/xicheng-three-map/map/geojson.test.ts`
- Create: `src/components/xicheng-three-map/map/projection.test.ts`
- Create: `src/components/xicheng-three-map/map/geometry.test.ts`
- Create: `src/components/xicheng-three-map/map/selection-state.test.ts`

**Interfaces:**
- Consumes: `/maps/xicheng_15_streets_clean.geojson` and `StreetCaseMetric`.
- Produces:

```ts
export interface StreetFeatureCollection { type: 'FeatureCollection'; features: StreetFeature[] }
export async function loadStreetCollection(url: string): Promise<StreetFeatureCollection>
export interface LocalProjection {
  project(position: [number, number]): THREE.Vector2
  center: [number, number]
  scale: number
}
export function createLocalProjection(collection: StreetFeatureCollection, targetSpan: number): LocalProjection
export function featureToShape(feature: StreetFeature, projection: LocalProjection): THREE.Shape
export interface MapSelectionState { hovered: string | null; selected: string | null }
export interface MapSelectionStore {
  snapshot(): MapSelectionState
  setHovered(adcode: string | null): void
  setSelected(adcode: string | null): void
  reset(): void
  subscribe(listener: (state: MapSelectionState) => void): () => void
}
export function createSelectionState(initial?: Partial<MapSelectionState>): MapSelectionStore
```

- [ ] **Step 1: Write failing domain tests**

Port the source tests for valid FeatureCollection parsing, 15 unique street codes, projection bounds, polygon-to-shape conversion, hover/selection transitions, and subscriber cleanup. Update imports to the new target paths.

The GeoJSON test must assert:

```ts
expect(collection.features).toHaveLength(15)
expect(new Set(collection.features.map((feature) => feature.properties.adcode)).size).toBe(15)
```

- [ ] **Step 2: Run the focused tests and confirm missing modules**

Run: `npm run test:map`

Expected: FAIL on imports under `map/`.

- [ ] **Step 3: Copy the verified map data and license**

Copy the byte content of:

```text
E:\Create\zhihuixicheng\public\data\xicheng_15_streets_clean.geojson
E:\Create\zhihuixicheng\public\data\ODbL_ATTRIBUTION.txt
```

into the target paths listed above. Preserve all feature properties and coordinate arrays.

- [ ] **Step 4: Port types and pure map modules**

Port `types/map.ts`, `map/geojson.ts`, `map/projection.ts`, `map/geometry.ts`, and `map/selectionState.ts`. Rename `selectionState.ts` to `selection-state.ts` and update imports. Replace the source `StreetMetric` reference with `StreetCaseMetric` where map rendering consumes a metric.

- [ ] **Step 5: Verify and commit domain modules**

Run: `npm run test:map`

Expected: the case-count, GeoJSON, projection, geometry, and selection tests pass.

Commit:

```powershell
git add public/maps/xicheng_15_streets_clean.geojson public/maps/ODbL_ATTRIBUTION.txt src/components/xicheng-three-map
git commit -m "feat: add cleaned xicheng street map domain"
```

---

### Task 3: Three.js renderer, materials, camera, labels, and interaction

**Files:**
- Create: `src/components/xicheng-three-map/map/materials.ts`
- Create: `src/components/xicheng-three-map/map/dispose.ts`
- Create: `src/components/xicheng-three-map/map/create-street-layer.ts`
- Create: `src/components/xicheng-three-map/map/create-label-layer.ts`
- Create: `src/components/xicheng-three-map/map/create-technology-platform.ts`
- Create: `src/components/xicheng-three-map/map/camera-controller.ts`
- Create: `src/components/xicheng-three-map/map/interaction-controller.ts`
- Create: `src/components/xicheng-three-map/map/create-map-scene.ts`
- Create: `src/components/xicheng-three-map/map/materials.test.ts`
- Create: `src/components/xicheng-three-map/map/camera-controller.test.ts`
- Create: `src/components/xicheng-three-map/map/interaction-controller.test.ts`
- Create: `src/components/xicheng-three-map/map/create-street-layer.test.ts`

**Interfaces:**
- Consumes: `StreetFeatureCollection`, `Record<string, StreetCaseMetric>`, and `MapSelectionStore`.
- Produces:

```ts
export interface MapSceneHandle {
  focusStreet(adcode: string): void
  zoomBy(factor: number): void
  resetCamera(): void
  resize(): void
  updateMetrics(metrics: Record<string, StreetCaseMetric>): void
  dispose(): void
}
export interface MapSceneOptions {
  collection: StreetFeatureCollection
  metrics: Record<string, StreetCaseMetric>
  store: MapSelectionStore
  onSelect(adcode: string): void
  onClear(): void
}
export function createMapScene(container: HTMLElement, options: MapSceneOptions): MapSceneHandle
```

- [ ] **Step 1: Write failing renderer tests**

Port source tests for material creation, top/side color selection, street group count, pickable metadata, camera focus/reset bounds, drag suppression, click selection, empty-area clearing, and disposal. Add this live-update assertion:

```ts
streetLayer.updateMetrics(updatedMetrics)
expect(streetLayer.getMetric('110102011')?.caseCount).toBe(28)
```

- [ ] **Step 2: Run tests and confirm renderer modules are missing**

Run: `npm run test:map`

Expected: FAIL on the renderer module imports.

- [ ] **Step 3: Port rendering modules from the source project**

Move the source behaviors into the kebab-case target modules. Preserve these constants unless a browser test proves a container-size adjustment is required:

```ts
camera.fov = width < 720 ? 52 : 42
controls.minDistance = 115
controls.maxDistance = 360
controls.autoRotate = true
controls.autoRotateSpeed = 0.42
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.58, 0.42, 0.82)
```

- [ ] **Step 4: Make materials update without rebuilding geometry**

Extend the street-layer handle with:

```ts
updateMetrics(metrics: Record<string, StreetCaseMetric>): void
getMetric(adcode: string): StreetCaseMetric | undefined
```

On update, change the top emissive/color, side shader colors, and outline glow color for each street. Keep the geometry, current hover, current selection, and camera pose intact.

- [ ] **Step 5: Complete resource disposal**

`dispose()` must cancel the animation frame, disconnect `ResizeObserver`, unsubscribe from selection state, remove OrbitControls listeners, dispose controls, composer render targets and passes, dispose scene geometry/materials/textures, remove both renderer DOM elements, and call `renderer.dispose()`.

- [ ] **Step 6: Verify and commit the rendering core**

Run:

```powershell
npm run test:map
npm run type-check
```

Expected: renderer tests pass without WebGL leaks in the jsdom-compatible seams.

Commit:

```powershell
git add src/components/xicheng-three-map/map
git commit -m "feat: port xicheng Three.js map renderer"
```

---

### Task 4: Vue Three.js viewport component

**Files:**
- Create: `src/components/xicheng-three-map/XichengThreeMap.vue`
- Create: `src/components/xicheng-three-map/XichengThreeMap.test.ts`
- Create: `src/components/xicheng-three-map/xicheng-three-map.css`

**Interfaces:**
- Consumes:

```ts
interface Props {
  streets: StreetMapStreetStat[]
  selectedStreetName: string
}
```

- Produces:

```ts
defineEmits<{
  select: [streetName: string]
  clear: []
  error: [message: string]
}>()
defineExpose<{
  zoomIn(): void
  zoomOut(): void
  reset(): void
  focusStreet(streetName: string): void
}>()
```

- [ ] **Step 1: Write the failing component lifecycle test**

Add `// @vitest-environment jsdom` at the top and mount with `@vue/test-utils`. Mock only the `createMapScene()` boundary. Assert that mounting loads `/maps/xicheng_15_streets_clean.geojson`, creates one scene, updates metrics after `streets` changes, focuses after `selectedStreetName` changes, forwards select/clear events, and disposes once on unmount.

- [ ] **Step 2: Run the focused test and confirm the component is missing**

Run: `npm run test:map`

Expected: FAIL because `XichengThreeMap.vue` does not exist.

- [ ] **Step 3: Implement the component**

Use `onMounted`, `watch`, and `onBeforeUnmount`. Keep the selection store stable for the component lifetime. Convert street statistics through `buildStreetCaseMetrics()`. Map selected names back to administrative codes through the loaded collection.

- [ ] **Step 4: Port only map-scoped styles**

Copy the source styles for `.map-viewport`, `.map-glow`, `.webgl-canvas`, `.label-layer`, `.street-label`, active labels, and the mobile label size into `xicheng-three-map.css`. Scope them below `.xicheng-three-map` and fill the existing target map stage with `position: absolute; inset: 0`.

- [ ] **Step 5: Verify and commit the Vue boundary**

Run:

```powershell
npm run test:map
npm run type-check
```

Commit:

```powershell
git add src/components/xicheng-three-map
git commit -m "feat: add reusable Three.js street map viewport"
```

---

### Task 5: Integrate 3D renderer into the dashboard and preserve 2D mode

**Files:**
- Modify: `src/components/risk-map-panel.vue:207-305,568-790,1086-1140,1489-1910,2020-2140`
- Create: `src/components/xicheng-three-map/risk-map-integration.test.ts`

**Interfaces:**
- Consumes: `XichengThreeMap` props, emits, and exposed methods.
- Produces: one shared active street, case-count legend, filter state, and detail-loading path across 3D and 2D modes.

- [ ] **Step 1: Write a failing integration contract test**

Assert from the SFC source and extracted pure handlers that:

```ts
expect(defaultMode).toBe('3d')
expect(selectThreeStreet('金融街街道')).toTriggerDetail('金融街街道')
expect(nextMode({ mode: '3d', selected: '金融街街道' })).toEqual({ mode: '2d', selected: '金融街街道' })
```

The template assertion must require `XichengThreeMap` in 3D mode and the existing `mapRef` ECharts container in 2D mode.

- [ ] **Step 2: Run tests and confirm integration is absent**

Run: `npm run test:map`

Expected: FAIL because the 3D branch still renders ECharts.

- [ ] **Step 3: Add the split rendering branch**

Use this structure inside `.xrm-map-stage`:

```vue
<XichengThreeMap
  v-if="mapBoundaryMode === 'street' && mapViewMode === '3d'"
  ref="threeMapRef"
  :streets="overview?.streets || []"
  :selected-street-name="activeStreetName"
  @select="selectStreetFromThree"
  @clear="clearSelection"
  @error="handleThreeMapError"
/>
<div
  v-else
  ref="mapRef"
  class="xrm-map-box"
  :style="{ height: `${mapDisplayHeight}px` }"
/>
```

- [ ] **Step 4: Preserve detail loading and mode selection**

`selectStreetFromThree(name)` must set `activeStreetName`, call `loadStreetDetail()`, and leave all existing right-panel tabs intact. Mode changes must retain `activeStreetName`; entering 3D calls `threeMapRef.focusStreet(activeStreetName)` after the next tick.

- [ ] **Step 5: Route controls by mode**

In 3D, `zoomIn`, `zoomOut`, and `resetMap` call the exposed Three.js methods. In 2D, retain existing ECharts zoom and reset behavior. `resetMap` clears the shared selection in both modes.

- [ ] **Step 6: Make ECharts 2D lazy and stable**

Initialize or resize ECharts only when the 2D container exists. Dispose the chart before its DOM container is removed. Keep map registration and GeoJSON loading available for 2D mode. Cancel the current 3D ECharts edge-animation loop because Three.js owns 3D rendering.

- [ ] **Step 7: Preserve errors and fallback**

On Three.js initialization failure, set a Three-specific error message in the existing state area and keep the 2D mode button enabled. Do not replace overview/detail API errors with a map rendering error.

- [ ] **Step 8: Verify and commit dashboard integration**

Run:

```powershell
npm run test:map
npm run type-check
npm run build
```

Commit:

```powershell
git add src/components/risk-map-panel.vue src/components/xicheng-three-map/risk-map-integration.test.ts
git commit -m "feat: integrate Three.js map with dashboard"
```

---

### Task 6: Browser interaction, responsive layout, and final delivery

**Files:**
- Create: `tests/xicheng-three-map-browser.test.mjs`
- Modify: `docs/superpowers/plans/2026-08-10-xicheng-three-map-migration.md`

**Interfaces:**
- Consumes: the built dashboard at a local preview URL using the existing `data/parsed` preview data.
- Produces: recorded assertions for page layout, map mode, case colors, selection, controls, and theme behavior.

- [ ] **Step 1: Add a static browser contract test**

The Node test must assert that the dashboard contains the Three.js component branch, uses the cleaned GeoJSON path, retains the 2D ECharts branch, and keeps the legend text “按当前筛选结果中的街道最大案件数，以 20% 为间隔划分五档”.

- [ ] **Step 2: Run the complete automated verification**

Run:

```powershell
node tests/account-slot-position.test.mjs
node tests/xicheng-three-map-browser.test.mjs
npm run test:run
npm run type-check
npm run build
```

Expected: every command exits 0. Existing bundle-size warnings may remain; new TypeScript, test, build, or runtime errors are not accepted.

- [ ] **Step 3: Start a fresh parsed-data preview**

Serve the final build on an unused localhost port and log in with the existing parsed-preview account. Open the home page and scroll to the street map panel.

- [ ] **Step 4: Verify desktop dark-theme behavior**

At a desktop viewport, verify:

- 15 street meshes and labels are rendered.
- The technology platform, bloom, outlines, extrusion, and dark scene match the source project.
- Auto-rotation runs before interaction.
- Drag, wheel, hover lift, click focus, “＋”, “－”, and “⌂” work.
- Clicking a street updates the right-panel street name, case count, and detail tabs.
- Switching 3D → 2D → 3D retains the selected street.

- [ ] **Step 5: Verify case-count colors and filters**

Record each street's displayed level/color and compare it with `buildCaseCountRanges(maxCaseCount)`. Change at least one available filter and confirm the overview, legend boundaries, Three.js materials, 2D colors, and selected detail all update from the new data.

- [ ] **Step 6: Verify themes and responsive layout**

Switch to the light page theme and confirm the Three.js scene stays dark. Test a viewport at or below 768 px and confirm the map, labels, legend, controls, mode switch, and detail panel do not overlap or overflow.

- [ ] **Step 7: Inspect runtime logs and Git diff**

Confirm there are no new browser console errors or WebGL resource warnings. Run `git diff --check` and verify only the planned files changed.

- [ ] **Step 8: Commit, push, and leave the final preview open**

Commit:

```powershell
git add tests/xicheng-three-map-browser.test.mjs docs/superpowers/plans/2026-08-10-xicheng-three-map-migration.md
git commit -m "test: verify migrated Three.js street map"
git push origin xwh
```

Leave the verified home-page preview open for user inspection and report all commit hashes.
