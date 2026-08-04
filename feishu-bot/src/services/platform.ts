/**
 * 平台数据服务 — 飞书机器人的查询/写入接口
 */

export interface DashboardOverview {
  totalCasesThisYear: number
  highIncidenceTypes: string
  riskAlertPushCount: number
  procuratorateSuggestions: number
  legalPushCount: number
}

export interface CommunityRisk {
  community: string
  riskScore: number
  level: string
  annualCases: number
  topCaseType: string
}

export interface CaseItem {
  id: string
  caseNo: string
  cause: string
  community: string
  riskScore: number
  status: string
}

export interface Suggestion {
  id: number
  title: string
  type: string
  status: string
  target: string
  date: string
}

export interface LegalPlan {
  id: number
  title: string
  group: string
  coverage: number
  approvalRate: number
}

export interface NewsItem {
  id: number
  title: string
  summary: string
  publishTime: string
}

// ===== 数据 =====

const overview: DashboardOverview = {
  totalCasesThisYear: 32,
  highIncidenceTypes: '侵财类犯罪',
  riskAlertPushCount: 128,
  procuratorateSuggestions: 18,
  legalPushCount: 45,
}

const communities: CommunityRisk[] = [
  { community: '西长安街街道', riskScore: 78, level: '中', annualCases: 5, topCaseType: '侵财类' },
  { community: '金融街街道', riskScore: 65, level: '中', annualCases: 3, topCaseType: '经济纠纷' },
  { community: '什刹海街道', riskScore: 82, level: '高', annualCases: 6, topCaseType: '人身伤害' },
  { community: '大栅栏街道', riskScore: 71, level: '中', annualCases: 4, topCaseType: '消费维权' },
  { community: '天桥街道', riskScore: 58, level: '低', annualCases: 2, topCaseType: '邻里纠纷' },
  { community: '新街口街道', riskScore: 74, level: '中', annualCases: 4, topCaseType: '物业管理' },
  { community: '展览路街道', riskScore: 61, level: '中', annualCases: 3, topCaseType: '电信诈骗' },
  { community: '德胜街道', riskScore: 55, level: '低', annualCases: 2, topCaseType: '劳动争议' },
  { community: '月坛街道', riskScore: 48, level: '低', annualCases: 1, topCaseType: '合同纠纷' },
  { community: '广安门内街道', riskScore: 69, level: '中', annualCases: 3, topCaseType: '侵财类' },
]

const cases: CaseItem[] = [
  { id: 'C001', caseNo: '(2026)京0102刑初15号', cause: '盗窃罪', community: '西长安街街道', riskScore: 72, status: '审理中' },
  { id: 'C002', caseNo: '(2026)京0102刑初18号', cause: '诈骗罪', community: '金融街街道', riskScore: 85, status: '已判决' },
  { id: 'C003', caseNo: '(2026)京0102民初203号', cause: '物业纠纷', community: '新街口街道', riskScore: 45, status: '调解中' },
  { id: 'C004', caseNo: '(2026)京0102刑初22号', cause: '故意伤害罪', community: '什刹海街道', riskScore: 91, status: '审理中' },
  { id: 'C005', caseNo: '(2025)京0102民初1582号', cause: '合同纠纷', community: '月坛街道', riskScore: 38, status: '已结案' },
  { id: 'C006', caseNo: '(2026)京0102刑初25号', cause: '电信诈骗', community: '展览路街道', riskScore: 78, status: '侦办中' },
  { id: 'C007', caseNo: '(2026)京0102民初315号', cause: '消费欺诈', community: '大栅栏街道', riskScore: 62, status: '审理中' },
  { id: 'C008', caseNo: '(2026)京0102劳初08号', cause: '劳动争议', community: '德胜街道', riskScore: 41, status: '调解中' },
]

const suggestions: Suggestion[] = [
  { id: 1, title: '关于加强校园周边安全管理的建议', type: '刑事检察', status: '待处理', target: '西城区教委', date: '2026-04-10' },
  { id: 2, title: '关于规范物业收费行为的建议', type: '民事检察', status: '处理中', target: '西城区住建委', date: '2026-03-28' },
  { id: 3, title: '关于整治消防通道占用的建议', type: '公益诉讼检察', status: '已反馈', target: '西城区消防大队', date: '2026-03-15' },
  { id: 4, title: '关于打击养老诈骗的建议', type: '刑事检察', status: '待处理', target: '西城区民政局', date: '2026-04-15' },
  { id: 5, title: '关于加强食品安全监管的建议', type: '公益诉讼检察', status: '处理中', target: '西城区市监局', date: '2026-04-01' },
]

const plans: LegalPlan[] = [
  { id: 1, title: '社区反诈宣传月', group: '老年人群体', coverage: 8000, approvalRate: 94 },
  { id: 2, title: '物业管理法律知识进社区', group: '业主委员会', coverage: 3500, approvalRate: 88 },
  { id: 3, title: '青少年法治教育课堂', group: '中小学生', coverage: 12000, approvalRate: 96 },
  { id: 4, title: '劳动权益保障宣讲', group: '外来务工人员', coverage: 5000, approvalRate: 91 },
]

const news: NewsItem[] = [
  { id: 1, title: '西城法院法官应邀为政务服务中心开展专题培训', summary: '推动司法审判与政务服务深度融合', publishTime: '2026-01-23' },
  { id: 2, title: '最高法电子诉讼服务平台整合升级公告', summary: '全国法院统一平台上线', publishTime: '2025-11-27' },
  { id: 3, title: '盗版侵权获利巨大，罚！企图注销逃避责任，赔！', summary: '著作权侵权惩罚性赔偿典型案例', publishTime: '2024-08-29' },
  { id: 4, title: '"鞋圈"套路多，假"大佬"真诈骗', summary: '社交平台限量款鞋诈骗案', publishTime: '2024-12-05' },
  { id: 5, title: '谎称代缴取暖费，别信！', summary: '物业员工诈骗老人案', publishTime: '2024-09-08' },
]

// 上报事件存储
const reportedEvents: { community: string; description: string; time: string }[] = []

// ===== 查询接口 =====

export function getOverview(): DashboardOverview { return overview }

export function getCommunityRisk(name?: string): CommunityRisk[] {
  if (!name) return communities.sort((a, b) => b.riskScore - a.riskScore)
  return communities.filter(c => c.community.includes(name))
}

export function getCases(keyword?: string): CaseItem[] {
  if (!keyword) return cases
  return cases.filter(c => `${c.caseNo}${c.cause}${c.community}`.includes(keyword))
}

export function getSuggestions(type?: string): Suggestion[] {
  if (!type || type === 'all') return suggestions
  return suggestions.filter(s => s.type.includes(type) || s.status.includes(type))
}

export function getPlans(): LegalPlan[] { return plans }

export function getNews(): NewsItem[] { return news }

export function getEffectRates() {
  return { responseRate: 91.2, closeRate: 86.5, reachRate: 78.3 }
}

export function getHighRiskCommunities(): CommunityRisk[] {
  return communities.filter(c => c.riskScore >= 80)
}

// ===== 写入接口 =====

export function reportEvent(community: string, description: string) {
  reportedEvents.push({ community, description, time: new Date().toLocaleString('zh-CN') })
  return reportedEvents.length
}

export function feedbackSuggestion(id: number, content: string): boolean {
  const s = suggestions.find(x => x.id === id)
  if (!s) return false
  s.status = '已反馈'
  return true
}

export function ratePlan(id: number, rating: string): boolean {
  return plans.some(p => p.id === id)
}
