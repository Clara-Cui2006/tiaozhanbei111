import { describe, expect, it } from 'vitest'
import {
  MONTHLY_REPORT_SECTIONS,
  canTransitionMonthlyReport,
  createMonthlyReportWordHtml,
  validateMonthlyReportSections
} from './model'

describe('monthly report model', () => {
  it('keeps the seven reference sections in the required order', () => {
    expect(MONTHLY_REPORT_SECTIONS.map((item) => item.key)).toEqual([
      'recentChanges', 'highFrequencyIssues', 'keyStreets', 'keyGroups',
      'keyIndustries', 'causeAnalysis', 'recommendations'
    ])
  })

  it('only allows human review transitions', () => {
    expect(canTransitionMonthlyReport('待审核', '已发布')).toBe(true)
    expect(canTransitionMonthlyReport('待审核', '审核退回')).toBe(true)
    expect(canTransitionMonthlyReport('审核退回', '待审核')).toBe(true)
    expect(canTransitionMonthlyReport('生成中', '已发布')).toBe(false)
    expect(canTransitionMonthlyReport('已发布', '待审核')).toBe(false)
  })

  it('rejects a report with missing sections', () => {
    expect(validateMonthlyReportSections({ recentChanges: ['一项变化'] })).toEqual([
      '高发问题', '重点街道', '重点人群', '重点行业', '原因分析', '履职建议'
    ])
  })

  it('creates a Word-compatible document with review notice and all sections', () => {
    const html = createMonthlyReportWordHtml({
      title: '西城区社区法治风险月度简报',
      month: '2026-07',
      summary: '本月共识别风险事件23件。',
      sections: Object.fromEntries(MONTHLY_REPORT_SECTIONS.map((item) => [item.key, [`${item.label}内容`]]))
    })
    expect(html).toContain('西城区社区法治风险月度简报')
    expect(html).toContain('2026年7月')
    expect(html).toContain('AI辅助生成，最终以检察机关审核意见为准')
    expect(html).toContain('七、履职建议')
  })
})
