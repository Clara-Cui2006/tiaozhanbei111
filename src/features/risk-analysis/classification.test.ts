import { describe, expect, it } from 'vitest'
import {
  CRIMINAL_LAW_CHAPTERS,
  RISK_PRIORITY_TOPICS,
  resolveVisibleChapters,
  resolveVisibleTopics,
  resolveChapterTopics,
  resolveRiskCrimes,
  resolveRiskFeatureWords,
  resolveRiskSourceCategories
} from './classification'

describe('risk analysis wheel classification', () => {
  it('uses the seven approved priority topics on the inner ring', () => {
    expect(RISK_PRIORITY_TOPICS.map((item) => item.name)).toEqual([
      '违规异地执法和趋利性执法司法',
      '检护民生',
      '法治化营商环境',
      '涉外检察',
      '涉老检察',
      '涉医检察',
      '金融检察'
    ])
  })

  it('uses all ten Criminal Law chapter titles on the outer ring', () => {
    expect(CRIMINAL_LAW_CHAPTERS).toEqual([
      '危害国家安全罪', '危害公共安全罪', '破坏社会主义市场经济秩序罪',
      '侵犯公民人身权利、民主权利罪', '侵犯财产罪', '妨害社会管理秩序罪',
      '危害国防利益罪', '贪污贿赂罪', '渎职罪', '军人违反职责罪'
    ])
    const outerLabels = new Set(RISK_PRIORITY_TOPICS.flatMap(item => item.children.map(child => child.name)))
    expect(outerLabels).toEqual(new Set(CRIMINAL_LAW_CHAPTERS))
  })

  it('keeps bidirectional many-to-many topic and chapter links', () => {
    expect(resolveChapterTopics('渎职罪')).toEqual([
      '违规异地执法和趋利性执法司法', '法治化营商环境'
    ])
    expect(resolveChapterTopics('军人违反职责罪')).toEqual(['涉外检察'])
    expect(resolveChapterTopics('未知章名')).toEqual([])
  })

  it('filters the opposite ring to related items and restores all without a selection', () => {
    expect(resolveVisibleChapters('涉老检察')).toEqual([
      '侵犯公民人身权利、民主权利罪', '侵犯财产罪', '妨害社会管理秩序罪'
    ])
    expect(resolveVisibleChapters('')).toEqual([...CRIMINAL_LAW_CHAPTERS])
    expect(resolveVisibleTopics('渎职罪')).toEqual([
      '违规异地执法和趋利性执法司法', '法治化营商环境'
    ])
    expect(resolveVisibleTopics('')).toEqual(RISK_PRIORITY_TOPICS.map(item => item.name))
  })

  it('resolves priority topics to relevant mock source categories', () => {
    expect(resolveRiskSourceCategories('涉老检察')).toEqual(['人身伤害类犯罪', '侵财类犯罪'])
    expect(resolveRiskSourceCategories('渎职罪')).toEqual(['侵财类犯罪', '妨害社会管理类犯罪'])
    expect(resolveRiskSourceCategories('军人违反职责罪')).toEqual(['危害公共安全类犯罪', '妨害社会管理类犯罪'])
    expect(resolveRiskSourceCategories('未知分类')).toEqual(['未知分类'])
  })

  it('provides downstream crime and feature filters for every priority topic', () => {
    for (const item of RISK_PRIORITY_TOPICS) {
      expect(resolveRiskCrimes(item.name).length).toBeGreaterThan(0)
      expect(resolveRiskFeatureWords(item.name).length).toBeGreaterThan(0)
    }
    expect(resolveRiskCrimes('检护民生')).toContain('危险驾驶罪')
    expect(resolveRiskFeatureWords('法治化营商环境')).toContain('公司办公区')
  })
})
