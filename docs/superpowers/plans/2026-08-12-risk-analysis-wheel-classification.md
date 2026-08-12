# Risk Analysis Wheel Classification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the risk-analysis wheel with six social-governance inner categories and their associated Criminal Law chapter titles on the outer ring while preserving existing selection and downstream filtering behavior.

**Architecture:** Move the wheel taxonomy and filter-resolution rules into a focused `classification.ts` module so the exact labels and mappings can be unit tested without rendering ECharts. The existing platform mock API will consume that module to aggregate overlapping source categories, while `risk-analysis.vue` keeps its current parent-child interaction model and only updates user-facing series terminology.

**Tech Stack:** Vue 3, TypeScript, ECharts 5, Vitest, Vite

---

## File structure

- Create `src/features/risk-analysis/classification.ts`: canonical six-category taxonomy, Criminal Law chapter associations, source-category aggregation, crime matching, and feature-word configuration.
- Create `src/features/risk-analysis/classification.test.ts`: exact taxonomy and resolver regression tests.
- Modify `src/api/platform.ts`: consume the canonical taxonomy and use multi-source filters for mock subjects, trends, feature words, and case details.
- Modify `src/views/risk-analysis.vue`: rename the two chart series to the approved social-governance and Criminal Law terminology without changing visual or click behavior.

### Task 1: Lock the approved taxonomy with failing tests

**Files:**
- Create: `src/features/risk-analysis/classification.test.ts`
- Create: `src/features/risk-analysis/classification.ts`

- [ ] **Step 1: Add the taxonomy test before the implementation exists**

Create `src/features/risk-analysis/classification.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  CRIMINAL_LAW_CHAPTERS,
  RISK_GOVERNANCE_CATEGORIES,
  resolveRiskSourceCategories
} from './classification'

describe('risk analysis wheel classification', () => {
  it('uses the six approved inner-ring labels without the 类 suffix', () => {
    expect(RISK_GOVERNANCE_CATEGORIES.map((item) => item.name)).toEqual([
      '邻里与社区治理',
      '民生权益保障',
      '公共安全治理',
      '生态环境与市容治理',
      '市场秩序与企业经营',
      '刑事犯罪与社会治安'
    ])
    expect(RISK_GOVERNANCE_CATEGORIES.every((item) => !item.name.endsWith('类'))).toBe(true)
  })

  it('uses only approved Criminal Law chapter titles on the outer ring', () => {
    const outerLabels = RISK_GOVERNANCE_CATEGORIES.flatMap((item) =>
      item.children.map((child) => child.name)
    )
    expect(new Set(outerLabels)).toEqual(new Set(CRIMINAL_LAW_CHAPTERS))
    expect(outerLabels.every((label) => CRIMINAL_LAW_CHAPTERS.includes(label))).toBe(true)
  })

  it('keeps the approved chapter association for each inner category', () => {
    expect(RISK_GOVERNANCE_CATEGORIES.map(({ name, children }) => ({
      name,
      children: children.map((child) => child.name)
    }))).toEqual([
      { name: '邻里与社区治理', children: ['侵犯公民人身权利、民主权利罪', '侵犯财产罪', '妨害社会管理秩序罪', '危害公共安全罪'] },
      { name: '民生权益保障', children: ['侵犯公民人身权利、民主权利罪', '侵犯财产罪', '破坏社会主义市场经济秩序罪', '妨害社会管理秩序罪'] },
      { name: '公共安全治理', children: ['危害公共安全罪', '妨害社会管理秩序罪', '破坏社会主义市场经济秩序罪'] },
      { name: '生态环境与市容治理', children: ['妨害社会管理秩序罪', '破坏社会主义市场经济秩序罪', '危害公共安全罪'] },
      { name: '市场秩序与企业经营', children: ['破坏社会主义市场经济秩序罪', '侵犯财产罪', '妨害社会管理秩序罪', '贪污贿赂罪'] },
      { name: '刑事犯罪与社会治安', children: ['危害国家安全罪', '危害公共安全罪', '侵犯公民人身权利、民主权利罪', '侵犯财产罪', '妨害社会管理秩序罪', '贪污贿赂罪'] }
    ])
  })

  it('resolves governance categories to all relevant mock source categories', () => {
    expect(resolveRiskSourceCategories('邻里与社区治理')).toEqual([
      '人身伤害类犯罪',
      '侵财类犯罪',
      '妨害社会管理类犯罪',
      '危害公共安全类犯罪'
    ])
    expect(resolveRiskSourceCategories('未知分类')).toEqual(['未知分类'])
  })
})
```

- [ ] **Step 2: Run the test and verify the module is missing**

Run:

```bash
npm run test:run -- src/features/risk-analysis/classification.test.ts
```

Expected: FAIL because `./classification` does not exist.

- [ ] **Step 3: Add the canonical classification module**

Create `src/features/risk-analysis/classification.ts` with:

```ts
import type { CaseCategory } from '../../types/platform'

export const CRIMINAL_LAW_CHAPTERS = [
  '危害国家安全罪',
  '危害公共安全罪',
  '破坏社会主义市场经济秩序罪',
  '侵犯公民人身权利、民主权利罪',
  '侵犯财产罪',
  '妨害社会管理秩序罪',
  '贪污贿赂罪'
] as const

const chapterValue: Record<(typeof CRIMINAL_LAW_CHAPTERS)[number], number> = {
  危害国家安全罪: 1,
  危害公共安全罪: 2,
  破坏社会主义市场经济秩序罪: 4,
  '侵犯公民人身权利、民主权利罪': 4,
  侵犯财产罪: 12,
  妨害社会管理秩序罪: 8,
  贪污贿赂罪: 1
}

const category = (name: string, chapters: (typeof CRIMINAL_LAW_CHAPTERS)[number][]): CaseCategory => ({
  name,
  value: chapters.reduce((sum, chapter) => sum + chapterValue[chapter], 0),
  children: chapters.map((name) => ({ name, value: chapterValue[name] }))
})

export const RISK_GOVERNANCE_CATEGORIES: CaseCategory[] = [
  category('邻里与社区治理', ['侵犯公民人身权利、民主权利罪', '侵犯财产罪', '妨害社会管理秩序罪', '危害公共安全罪']),
  category('民生权益保障', ['侵犯公民人身权利、民主权利罪', '侵犯财产罪', '破坏社会主义市场经济秩序罪', '妨害社会管理秩序罪']),
  category('公共安全治理', ['危害公共安全罪', '妨害社会管理秩序罪', '破坏社会主义市场经济秩序罪']),
  category('生态环境与市容治理', ['妨害社会管理秩序罪', '破坏社会主义市场经济秩序罪', '危害公共安全罪']),
  category('市场秩序与企业经营', ['破坏社会主义市场经济秩序罪', '侵犯财产罪', '妨害社会管理秩序罪', '贪污贿赂罪']),
  category('刑事犯罪与社会治安', ['危害国家安全罪', '危害公共安全罪', '侵犯公民人身权利、民主权利罪', '侵犯财产罪', '妨害社会管理秩序罪', '贪污贿赂罪'])
]

export const RISK_SOURCE_CATEGORIES: Record<string, string[]> = {
  邻里与社区治理: ['人身伤害类犯罪', '侵财类犯罪', '妨害社会管理类犯罪', '危害公共安全类犯罪'],
  民生权益保障: ['人身伤害类犯罪', '侵财类犯罪', '妨害社会管理类犯罪'],
  公共安全治理: ['危害公共安全类犯罪', '妨害社会管理类犯罪'],
  生态环境与市容治理: ['妨害社会管理类犯罪', '危害公共安全类犯罪'],
  市场秩序与企业经营: ['侵财类犯罪', '妨害社会管理类犯罪'],
  刑事犯罪与社会治安: ['侵财类犯罪', '人身伤害类犯罪', '危害公共安全类犯罪', '妨害社会管理类犯罪']
}

export const resolveRiskSourceCategories = (categoryName: string): string[] =>
  RISK_SOURCE_CATEGORIES[categoryName] ?? [categoryName]
```

- [ ] **Step 4: Run the taxonomy test and verify it passes**

Run:

```bash
npm run test:run -- src/features/risk-analysis/classification.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit the taxonomy and its tests**

```bash
git add src/features/risk-analysis/classification.ts src/features/risk-analysis/classification.test.ts
git commit -m "feat: define risk governance wheel taxonomy"
```

### Task 2: Connect mock APIs to the new governance categories

**Files:**
- Modify: `src/features/risk-analysis/classification.test.ts`
- Modify: `src/features/risk-analysis/classification.ts`
- Modify: `src/api/platform.ts:723-940`

- [ ] **Step 1: Add filter-resolver assertions for crimes and feature words**

Extend the imports and add this test to `classification.test.ts`:

```ts
import {
  resolveRiskCrimes,
  resolveRiskFeatureWords
} from './classification'

it('provides downstream crime and feature filters for every governance category', () => {
  for (const item of RISK_GOVERNANCE_CATEGORIES) {
    expect(resolveRiskCrimes(item.name).length).toBeGreaterThan(0)
    expect(resolveRiskFeatureWords(item.name).length).toBeGreaterThan(0)
  }
  expect(resolveRiskCrimes('公共安全治理')).toContain('危险驾驶罪')
  expect(resolveRiskFeatureWords('市场秩序与企业经营')).toContain('公司办公区')
})
```

- [ ] **Step 2: Run the test and verify the new resolvers are missing**

Run:

```bash
npm run test:run -- src/features/risk-analysis/classification.test.ts
```

Expected: FAIL because `resolveRiskCrimes` and `resolveRiskFeatureWords` are not exported.

- [ ] **Step 3: Implement downstream filter resolvers**

Add complete mappings to `classification.ts`:

```ts
const SOURCE_CATEGORY_CRIMES: Record<string, string[]> = {
  侵财类犯罪: ['盗窃罪', '诈骗罪', '职务侵占罪', '抢夺罪', '行贿罪'],
  人身伤害类犯罪: ['故意伤害罪', '寻衅滋事罪', '非法拘禁罪', '聚众斗殴罪'],
  危害公共安全类犯罪: ['危险驾驶罪', '交通肇事罪'],
  妨害社会管理类犯罪: ['掩饰、隐瞒犯罪所得罪', '生产销售有毒有害食品罪', '侵犯公民个人信息罪', '虚开增值税专用发票罪', '帮助信息网络犯罪活动罪', '容留他人吸毒罪']
}

const SOURCE_CATEGORY_FEATURE_WORDS: Record<string, string[]> = {
  侵财类犯罪: ['入室盗窃', '扒窃', '网络诈骗', '电话诈骗', '居民小区', '商业区域', '交通工具内', '夜间作案', '单独作案', '团伙作案', '前科人员', '涉未成年人'],
  人身伤害类犯罪: ['公共场所', '居民小区', '白天作案', '夜间作案', '单独作案', '累犯', '债务纠纷', '涉未成年人'],
  危害公共安全类犯罪: ['醉酒驾驶', '公共场所', '白天作案', '夜间作案', '单独作案', '交通工具内'],
  妨害社会管理类犯罪: ['团伙作案', '公共场所', '居民小区', '夜间作案', '前科人员', '累犯', '涉未成年人', '公司办公区', '线上淘宝店']
}

const unique = (values: string[]) => [...new Set(values)]

export const resolveRiskCrimes = (categoryName: string): string[] =>
  unique(resolveRiskSourceCategories(categoryName).flatMap((source) => SOURCE_CATEGORY_CRIMES[source] ?? []))

export const resolveRiskFeatureWords = (categoryName: string): string[] =>
  unique(resolveRiskSourceCategories(categoryName).flatMap((source) => SOURCE_CATEGORY_FEATURE_WORDS[source] ?? []))
```

- [ ] **Step 4: Replace the old API-local taxonomy and single-source filters**

In `src/api/platform.ts`, import:

```ts
import {
  RISK_GOVERNANCE_CATEGORIES,
  resolveRiskCrimes,
  resolveRiskFeatureWords,
  resolveRiskSourceCategories
} from '../features/risk-analysis/classification'
```

Then make these exact behavioral changes:

```ts
const mockCaseCategories: CaseCategory[] = RISK_GOVERNANCE_CATEGORIES
```

Remove the old `categoryToCrime` and `classificationSourceCategory` objects. In `fetchCaseSubjects`, replace lookup with:

```ts
const crimes = resolveRiskCrimes(category)
if (!crimes.length) return Promise.resolve(mockCaseSubjects)
return Promise.resolve(mockCaseSubjects.filter((subject) => crimes.includes(subject.crime)))
```

In `fetchCaseTimeTrends`, replace single-category filtering with:

```ts
const sourceCategories = resolveRiskSourceCategories(category)
return Promise.resolve(mockCaseTimeTrends.filter((trend) => sourceCategories.includes(trend.category)))
```

In `fetchCaseFeatureWords`, replace the local `catMap` with:

```ts
const words = resolveRiskFeatureWords(category)
return Promise.resolve(mockCaseFeatureWords.filter((word) => words.includes(word.name)))
```

In `fetchCaseDetails`, replace single-category filtering with:

```ts
const sourceCategories = resolveRiskSourceCategories(query.category)
result = result.filter((detail) => sourceCategories.includes(detail.category))
```

- [ ] **Step 5: Run focused tests and type checking**

Run:

```bash
npm run test:run -- src/features/risk-analysis/classification.test.ts
npm run type-check
```

Expected: taxonomy tests PASS and TypeScript exits with code 0.

- [ ] **Step 6: Commit the API integration**

```bash
git add src/features/risk-analysis/classification.ts src/features/risk-analysis/classification.test.ts src/api/platform.ts
git commit -m "feat: connect governance categories to risk data"
```

### Task 3: Update wheel terminology and verify interaction compatibility

**Files:**
- Modify: `src/views/risk-analysis.vue:397-599`

- [ ] **Step 1: Change chart series terminology without changing interaction structure**

In `src/views/risk-analysis.vue`, make these replacements:

```ts
// 社会治理分类：彩虹分层 + 金/银交错描边 + 选中切片凸起
// 刑法分则章名：根据社会治理分类联动。颜色相对内圈错开，减少视觉重复。
```

Change both the depth-layer name and visible pie-series name from `一级分类` to `社会治理分类`:

```ts
buildPieDepthLayers('社会治理分类', innerData, innerRadius, center, 8, options)
```

```ts
name: '社会治理分类'
```

Change both outer-ring names from `二级分类` to `刑法分则章名`:

```ts
buildPieDepthLayers('刑法分则章名', outerData, outerRadius, center, 8, options)
```

```ts
name: '刑法分则章名'
```

Update click-handler comments to say `内圈社会治理分类` and `外圈刑法分则章名`. Do not alter the existing `categories.value` parent-child lookup, toggle behavior, or `selectedCategory` assignment.

- [ ] **Step 2: Run the complete frontend verification suite**

Run:

```bash
npm run test:run
npm run type-check
npm run build-only
```

Expected: all Vitest tests PASS, TypeScript exits with code 0, and Vite produces a successful production build.

- [ ] **Step 3: Inspect the final diff for scope and accidental regressions**

Run:

```bash
git diff --check
git diff -- src/features/risk-analysis/classification.ts src/features/risk-analysis/classification.test.ts src/api/platform.ts src/views/risk-analysis.vue
```

Expected: no whitespace errors; only taxonomy, aggregation filters, and wheel terminology are changed.

- [ ] **Step 4: Commit the wheel terminology update**

```bash
git add src/views/risk-analysis.vue
git commit -m "feat: relabel risk analysis wheel rings"
```

### Task 4: Final acceptance check

**Files:**
- Verify: `src/features/risk-analysis/classification.ts`
- Verify: `src/api/platform.ts`
- Verify: `src/views/risk-analysis.vue`

- [ ] **Step 1: Verify every acceptance rule from the approved design**

Run:

```bash
rg -n "邻里与社区治理|民生权益保障|公共安全治理|生态环境与市容治理|市场秩序与企业经营|刑事犯罪与社会治安" src/features/risk-analysis/classification.ts
rg -n "社会治理分类|刑法分则章名" src/views/risk-analysis.vue
rg -n "name: '诈骗罪'|name: '盗窃罪'|name: '扰乱公共秩序'|name: '相邻关系纠纷'|name: '侵权责任纠纷'" src/api/platform.ts
```

Expected: all six new inner labels are present; both new ring labels are present; the five old inner-ring definitions are absent from `platform.ts`.

- [ ] **Step 2: Record the final repository state**

Run:

```bash
git status --short
git log -4 --oneline
```

Expected: task files are committed; unrelated pre-existing modifications remain untouched and visible.
