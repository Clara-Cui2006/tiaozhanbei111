import { describe, expect, it } from 'vitest'
import {
  CRIMINAL_LAW_CHAPTERS,
  RISK_GOVERNANCE_CATEGORIES,
  resolveRiskCrimes,
  resolveRiskFeatureWords,
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
    const approvedChapters = new Set<string>(CRIMINAL_LAW_CHAPTERS)
    expect(new Set(outerLabels)).toEqual(new Set(CRIMINAL_LAW_CHAPTERS))
    expect(outerLabels.every((label) => approvedChapters.has(label))).toBe(true)
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

  it('provides downstream crime and feature filters for every governance category', () => {
    for (const item of RISK_GOVERNANCE_CATEGORIES) {
      expect(resolveRiskCrimes(item.name).length).toBeGreaterThan(0)
      expect(resolveRiskFeatureWords(item.name).length).toBeGreaterThan(0)
    }
    expect(resolveRiskCrimes('公共安全治理')).toContain('危险驾驶罪')
    expect(resolveRiskFeatureWords('市场秩序与企业经营')).toContain('公司办公区')
  })
})
