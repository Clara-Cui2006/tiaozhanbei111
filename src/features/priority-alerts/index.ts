export const PRIORITY_TAGS = [
  '违规异地执法和趋利性执法司法',
  '检护民生',
  '法治化营商环境',
  '涉外检察',
  '涉老检察',
  '涉医检察',
  '金融检察'
] as const

export type PriorityTag = typeof PRIORITY_TAGS[number]

type CaseText = { caseName?: string; category?: string; keywords?: string; summary?: string }

const TAG_RULES: Record<PriorityTag, string[]> = {
  '违规异地执法和趋利性执法司法': ['异地执法', '趋利', '罚款', '扣押', '强制执法'],
  '检护民生': ['民生', '食品', '消费', '住房', '劳动', '医疗', '老年', '个人信息', '伤害'],
  '法治化营商环境': ['企业', '公司', '经营', '合同', '招投标', '税', '职务侵占', '行贿'],
  '涉外检察': ['涉外', '外籍', '境外', '跨境'],
  '涉老检察': ['老年', '养老', '护工', '赡养', '退休'],
  '涉医检察': ['医院', '医疗', '药品', '护工', '患者'],
  '金融检察': ['金融', '银行', '银行卡', '诈骗', '非法集资', '洗钱', '发票', '资金']
}

export function inferPriorityTags(input: CaseText): PriorityTag[] {
  const text = `${input.caseName || ''} ${input.category || ''} ${input.keywords || ''} ${input.summary || ''}`
  const tags = PRIORITY_TAGS.filter((tag) => TAG_RULES[tag].some((word) => text.includes(word)))
  return tags.length ? [...tags] : ['检护民生']
}

export function assessOfflineRisk(input: { summary: string; political?: boolean }) {
  const ruleHits: string[] = []
  if (input.political) ruleHits.push('政治安全强制预警')
  if (/同一街道|连续发生|多起|集中高发/.test(input.summary)) ruleHits.push('街道同类案件集中高发')
  if (/行业|领域|企业|金融|医疗/.test(input.summary)) ruleHits.push('案由行业风险')
  const aiHints = [...new Set(Object.values(TAG_RULES).flat().filter((word) => input.summary.includes(word)))].slice(0, 4)
  return {
    ruleHits,
    aiHints: aiHints.map((word) => `文本出现“${word}”相关风险特征`),
    reviewStatus: '待人工复核' as const,
    confidence: Math.min(96, 58 + ruleHits.length * 14 + aiHints.length * 5)
  }
}

export function aggregatePriorityAlerts<T extends { tags: readonly string[]; street: string }>(items: T[]) {
  return PRIORITY_TAGS.map((tag) => {
    const matched = items.filter((item) => item.tags.includes(tag))
    const streets = matched.reduce<Record<string, number>>((out, item) => ({ ...out, [item.street]: (out[item.street] || 0) + 1 }), {})
    const topStreet = Object.entries(streets).sort((a, b) => b[1] - a[1])[0]?.[0] || '暂无案件'
    return { tag, count: matched.length, topStreet }
  })
}

export interface PriorityAlert {
  id: number
  caseName: string
  caseNumber: string
  street: string
  caseType: string
  tags: PriorityTag[]
  riskLevel: '高' | '中' | '低'
  alertStatus: '强制预警' | '待人工复核' | '已复核'
  summary: string
  ruleHits: string[]
  aiHints: string[]
  confidence: number
  subject: { name: string; age: number; occupation: string; specialIdentity: string }
}

const seeds = [
  [1, '白某盗窃案', '(2025)京0102刑初716号', '展览路街道', '盗窃罪', '医院快递暂存区发生财物被盗，涉及患者民生权益。', '白某', 34, '灵活就业人员', '无'],
  [2, '侯某行贿案', '(2025)京0102刑初272号', '金融街街道', '行贿罪', '为承揽企业工程项目多次行贿，影响公平营商环境。', '侯某', 46, '企业经营者', '民营企业负责人'],
  [3, '臧某故意伤害案', '(2025)京0102刑初563号', '德胜街道', '故意伤害罪', '养老服务机构护工伤害老年人，需对护理管理进行人工复核。', '臧某', 39, '护工', '养老机构从业人员'],
  [4, '田某等虚开发票案', '(2025)京0102刑初144号', '月坛街道', '虚开增值税专用发票罪', '两家公司虚开增值税发票，涉及税款资金和企业合规风险。', '田某', 43, '公司财务', '企业从业人员'],
  [5, '李某诈骗案', '(2025)京0102刑初731号', '西长安街街道', '诈骗罪', '冒充商超负责人骗取经营资金，涉及银行账户和市场经营秩序。', '李某', 37, '无业', '重点关注人员'],
  [6, '罗某等销售有毒食品案', '(2025)京0102刑初95号', '金融街街道', '生产销售有毒有害食品罪', '网络店铺销售含禁用成分的减肥食品，影响消费者健康。', '罗某', 31, '电商经营者', '平台经营主体'],
  [7, '任某侵犯个人信息案', '(2025)京0102刑初686号', '展览路街道', '侵犯公民个人信息罪', '出售公民行踪轨迹等信息，涉及金融账户与民生数据安全。', '任某', 29, '信息服务从业者', '无'],
  [8, '跨境资金异常转移案', 'XJ-2026-008', '月坛街道', '洗钱罪', '境外公司经由多个银行账户转移资金，需进行涉外金融风险复核。', '某外籍人员', 41, '公司高管', '外籍人员'],
  [9, '异地扣押企业财产线索', 'XJ-2026-009', '广安门内街道', '行政执法监督', '外地执法人员异地扣押企业财产并以罚款为主，疑似趋利性执法。', '某企业负责人', 45, '企业经营者', '被执法对象']
] as const

export const PRIORITY_ALERT_FIXTURES: PriorityAlert[] = seeds.map((seed, index) => {
  const [id, caseName, caseNumber, street, caseType, summary, name, age, occupation, specialIdentity] = seed
  const tags = inferPriorityTags({ caseName, category: caseType, summary })
  const assessment = assessOfflineRisk({ summary, political: id === 8 })
  return {
    id, caseName, caseNumber, street, caseType, tags,
    riskLevel: assessment.ruleHits.length > 1 || id === 8 ? '高' : assessment.confidence >= 72 ? '中' : '低',
    alertStatus: id === 8 ? '强制预警' : index % 3 === 0 ? '已复核' : '待人工复核',
    summary, ...assessment, subject: { name, age, occupation, specialIdentity }
  }
})
