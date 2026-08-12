export const MONTHLY_REPORT_SECTIONS = [
  { key: 'recentChanges', label: '近期变化', number: '一' },
  { key: 'highFrequencyIssues', label: '高发问题', number: '二' },
  { key: 'keyStreets', label: '重点街道', number: '三' },
  { key: 'keyGroups', label: '重点人群', number: '四' },
  { key: 'keyIndustries', label: '重点行业', number: '五' },
  { key: 'causeAnalysis', label: '原因分析', number: '六' },
  { key: 'recommendations', label: '履职建议', number: '七' }
] as const

export type MonthlyReportSectionKey = typeof MONTHLY_REPORT_SECTIONS[number]['key']
export type MonthlyReportStatus = '生成中' | '待审核' | '审核退回' | '已发布'
export type MonthlyReportSections = Record<MonthlyReportSectionKey, string[]>

const TRANSITIONS: Record<MonthlyReportStatus, MonthlyReportStatus[]> = {
  '生成中': ['待审核'],
  '待审核': ['审核退回', '已发布'],
  '审核退回': ['待审核'],
  '已发布': []
}

export function canTransitionMonthlyReport(from: MonthlyReportStatus, to: MonthlyReportStatus) {
  return TRANSITIONS[from].includes(to)
}

export function validateMonthlyReportSections(sections: Partial<MonthlyReportSections>) {
  return MONTHLY_REPORT_SECTIONS
    .filter((item) => !sections[item.key]?.some((line) => line.trim()))
    .map((item) => item.label)
}

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const monthLabel = (month: string) => {
  const [year, number] = month.split('-')
  return `${year}年${Number(number)}月`
}

export function createMonthlyReportWordHtml(report: {
  title: string
  month: string
  summary: string
  sections: Record<string, string[]>
}) {
  const body = MONTHLY_REPORT_SECTIONS.map((section) => `
    <h2>${section.number}、${section.label}</h2>
    <ol>${(report.sections[section.key] ?? []).map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ol>
  `).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:"SimSun",serif;margin:42px;color:#111;line-height:1.8}h1,p{text-align:center}h2{color:#173f79;margin-top:24px}li{margin:8px 0}.notice{font-size:12px;color:#666;margin-top:36px}
  </style></head><body><h1>${escapeHtml(report.title)}</h1><p>（${monthLabel(report.month)}）</p><p>${escapeHtml(report.summary)}</p>${body}<p class="notice">AI辅助生成，最终以检察机关审核意见为准。</p></body></html>`
}
