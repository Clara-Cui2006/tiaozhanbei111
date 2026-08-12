export type RiskLevel = '高' | '中' | '低'

export type MapClassification =
  | '15街道行政区划' | '政治安全' | '商业商圈' | '历史文化街区' | '15分钟生活圈' | '功能属性'
  | '人口流动' | '潮汐特征' | '风险承载力' | '社会资本'
  | '产业生态' | '数字化程度'

export type MapDimensionScores = Partial<Record<MapClassification, number>>

// ===== 新增：政治安全专项类型 =====
export type PoliticalSecurityCategory =
  | '危害国家安全类'
  | '极端宗教与意识形态渗透类'
  | '重大活动安保风险类'
  | '网络政治安全类'

export interface PoliticalSecurityAlert {
  id: number
  topic: string
  area: string
  time: string
  tags: string[]
  level: '高保密级' | '内部参考'
  status: '待发送' | '已发送'
}
// ===================================

export interface DashboardOverview {
  totalCasesThisYear: number
  highIncidenceTypes: string
  riskAlertPushCount: number
  procuratorateSuggestions: number
  legalPushCount: number
}

export interface RiskTrendPoint {
  date: string
  value: number
}

export interface CommunityRiskPoint {
  community: string
  longitude: number
  latitude: number
  level: RiskLevel
  riskScore: number
  annualCases?: number
  alertPushCount?: number;               // 风险预警推送次数
  procuratorateSuggestionCount?: number; // 检察建议发送次数
  legalPlanDeliveryCount?: number;       // 普法方案投递次数
  highIncidenceTypes?: string
  dimensionScores?: MapDimensionScores
}

export interface RiskEvent {
  id: number
  community: string
  event: string
  level: RiskLevel
  riskScore: number
  time: string
  status: string
  detail: string
  suggestion: string
}

export interface RiskEventQuery {
  level?: RiskLevel
  keyword?: string
  minRiskScore?: number
  community?: string
}

export interface RiskScoringConfig {
  highThreshold: number
  mediumThreshold: number
}

export interface LegalRecommendation {
  id: number
  title: string
  group: string
  scene: string
  type: string
  planId?: number
}

export interface LegalPlan {
  id: number
  title: string
  content: string
  fileUrl?: string
  pageRoute?: string
  updatedTime: string
  applicableGroup?: string
  triggerScene?: string
  relatedCategory?: string
  riskContext?: {
    trendPortrait: string;
    subjectPortrait: string;
    featureWords: string;
    riskLevel: string;
  }
  legalBasis?: { type: string; name: string; content?: string }[]
  reviewStatus?: '待人工审核' | '已提交审核' | '已审核' | '已驳回' | string
}

export interface PushTask {
  id: number
  title: string
  community: string
  channel: string
  time: string
  status: '已发送' | '待发送'
  category?: string; // <-- 添加这一行
}

export interface EffectRate {
  responseRate: number
  closeRate: number
  reachRate: number
  mediationRate?: number
  gridCoverage?: number
  satisfactionRate?: number
  avgResponseHours?: number
  politicalResolutionRate?: number // 新增：政治安全预警化解率
}

export interface CommunityEffectStat {
  community: string
  alerts: number
  closed: number
  activities: number
}

export interface SystemSettings {
  name: string
  dataScopeNotice: string
  modelBaseUrl: string
  modelChatPath: string
  modelName: string
  modelApiKey: string
  modelTimeoutSeconds: number
}

export interface OfficialDynamic {
  id: number
  title: string
  summary: string
  content: string
  publishTime: string
  cover?: string
  url?: string
}

export interface OfficialDynamicPayload {
  title: string
  summary: string
  content: string
  cover?: string
  url?: string
}

export type ArchiveCategory = '新闻资讯' | '往期公告' | '官微推送' | '其他栏目'

export interface ArchiveItem {
  id: number
  category: ArchiveCategory
  title: string
  publishTime: string
  summary?: string
  content?: string
  url?: string
}

export interface FooterLink {
  label: string
  url: string
}

export interface SiteFooterInfo {
  recordNo: string
  links: FooterLink[]
}

export interface DashboardOverviewV2 {
  totalCasesThisYear: number
  highIncidenceType: string
  riskAlertPushCount: number
  procuratorateSuggestionCount: number
  legalPlanDeliveryCount: number
}

export interface MultiTrendData {
  date: string
  totalCases: number
  highIncidenceCount: number
  riskAlertPush: number
  procuratorateSuggestion: number
  legalPlanDelivery: number
}

export interface CaseCategory {
  name: string
  children: { name: string; value: number }[]
  value: number
}

export interface CaseSubject {
  id: number
  name: string
  age: number | null
  gender: '男' | '女' | '未知'
  occupation: string
  specialIdentity: string
  isResident: boolean
  crime: string
  summary: string
}

export interface CaseTimeTrend {
  period: string
  count: number
  category: string
}

export interface CaseFeatureWord {
  name: string
  value: number
}

export interface CaseDetail {
  id: number
  caseName: string
  procedureType: string
  caseNumber: string
  keywords: string
  judgmentReason: string
  category: string
}

export interface CaseDetailQuery {
  keyword?: string
  category?: string
}

export type ProcuratorateCategory = '刑事检察' | '民事检察' | '行政检察' | '公益诉讼检察' | '政治安全专办'

export interface ProcuratorateSuggestion {
  id: number
  title: string
  type: ProcuratorateCategory | string
  content: string
  target: string
  issueDate: string
  status: '待处理' | '处理中' | '已反馈' | '已驳回'
  ignored?: boolean
  isPolitical?: boolean
}

export interface ProcuratorateSuggestionInput {
  title: string
  type: ProcuratorateCategory | string
  content: string
  target: string
  issueDate: string
  status: ProcuratorateSuggestion['status']
  isPolitical?: boolean
  politicalCategory?: PoliticalSecurityCategory
}

export interface ProcuratorateFeedItem {
  time: string
  content: string
}

export interface ProcuratorateMonthlyTrend {
  month: string
  count: number
}

export interface LegalRecommendationV2 {
  id: number
  title: string
  group: string
  scene: string
  type: string
  planId?: number
  tags: string[]
  autoGenNote: string
  coverageTarget: number
  durationDays: number
  approvalRate?: number
  pilotCommunities?: number
  resources: { icon: string; label: string; count: number }[]
}

export interface LegalPushStats {
  totalPlans: number
  onlinePushCount: number
  offlineActivityCount: number
  audienceCoverage: number
  todayPushCommunities: number
}

export interface EffectTrendPoint {
  date: string
  alertCount: number
  closeRate: number
  politicalCases?: number // 新增：政治案件趋势数
}

export interface PoliticalMonthlyTrend {
  month: string;
  count: number;
}

export interface PoliticalStreetStat {
  community: string;
  count: number;
  longitude: number;
  latitude: number;
  riskLevel?: '关注' | '低风险' | '中风险' | '高风险' | string;
  reviewStatus?: '待人工复核' | '人工研判' | '研判确认' | '纳入统计' | string;
}

export interface PoliticalOverview {
  totalSignalsThisYear: number;
  highIncidenceTypes: string;
  riskAlertPushCount: number;
  procuratorateSuggestions: number;
  majorEventCoupling: string;
  pendingManualReview?: number;
  pendingManualReviewRate?: number;
  highConcernRisks?: number;
  highConcernRiskRate?: number;
  highRiskCases?: number;
  highRiskRate?: number;
  yearOverYearRate?: number | null;
  fourDimensionMethod?: Array<{ name: string; description: string }>;
  priorityTopics?: string[];
}
