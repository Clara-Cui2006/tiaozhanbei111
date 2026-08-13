import { describe, expect, it } from 'vitest'
import { PRIORITY_TAGS, aggregatePriorityAlerts, inferPriorityTags, assessOfflineRisk } from './index'

describe('unified priority alerts', () => {
  it('uses the seven approved labels verbatim', () => {
    expect(PRIORITY_TAGS).toEqual([
      '违规异地执法和趋利性执法司法', '检护民生', '法治化营商环境', '涉外检察', '涉老检察', '涉医检察', '金融检察'
    ])
  })

  it('assigns multiple explainable tags from analyzable case text', () => {
    const tags = inferPriorityTags({ caseName: '老年人医疗诈骗案', category: '诈骗罪', keywords: '老年人,医院,银行卡', summary: '在医院骗取老年人养老金' })
    expect(tags).toEqual(expect.arrayContaining(['检护民生', '涉老检察', '涉医检察', '金融检察']))
  })

  it('keeps fixed rules and AI hints separate for manual review', () => {
    const result = assessOfflineRisk({ summary: '同一街道连续发生多起同类案件，涉及强制执法和异地罚款', political: true })
    expect(result.ruleHits).toContain('政治安全强制预警')
    expect(result.aiHints.length).toBeGreaterThan(0)
    expect(result.reviewStatus).toBe('待人工复核')
  })

  it('aggregates counts and the highest-incidence street by tag', () => {
    const result = aggregatePriorityAlerts([
      { id: 1, tags: ['检护民生'], street: '月坛街道' },
      { id: 2, tags: ['检护民生', '金融检察'], street: '月坛街道' },
      { id: 3, tags: ['金融检察'], street: '金融街街道' }
    ])
    expect(result.find((item) => item.tag === '检护民生')).toMatchObject({ count: 2, topStreet: '月坛街道' })
  })
})
