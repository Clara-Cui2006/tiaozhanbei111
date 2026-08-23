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
  builtInReference?: boolean
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
  modelFrontendTimeoutSeconds: number
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
  street?: string
  tags?: string[]
  riskLevel?: RiskLevel
  alertStatus?: string
  summary?: string
  ruleHits?: string[]
  aiHints?: string[]
  confidence?: number
  subject?: { name: string; age: number; occupation: string; specialIdentity: string }
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
  status: '待处理' | '处理中' | '已反馈' | '已驳回' | '参考材料待核验' | string
  ignored?: boolean
  isPolitical?: boolean
  builtInReference?: boolean
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

export type MonthlyReportStatus = '生成中' | '待审核' | '审核退回' | '已发布'

export interface MonthlyReportMetric {
  name: string
  value: number
  percentage: number
  change?: number
}

export interface ProcuratorateMonthlyReport {
  id: number
  month: string
  title: string
  summary: string
  status: MonthlyReportStatus
  sections: Record<string, string[]>
  metrics: {
    total: number
    monthOverMonth: number
    issues: MonthlyReportMetric[]
    streets: MonthlyReportMetric[]
    groups: MonthlyReportMetric[]
    industries: MonthlyReportMetric[]
    trend: number[]
  }
  generatedByAi: boolean
  updatedAt: string
  publishedAt?: string | null
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
  builtInReference?: boolean
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

// ===== 涉访涉诉前置研判 =====
export type PetitionRiskLevel = '蓝色' | '黄色' | '橙色' | '红色'
export type SupervisionCategory = '刑事检察' | '民事检察' | '行政检察' | '公益诉讼检察' | '未成年人检察' | '政治安全'
export type PetitionReviewStatus = '待复核' | '已确认' | '已排除' | '继续核查'

export interface PetitionPartyProfile {
  name?: string
  phone?: string
  idCard?: string
  age?: number | string
  gender?: string
  ethnicity?: string
  currentRegion?: string
  address?: string
  householdRegion?: string
  householdAddress?: string
  employer?: string
}

export interface PetitionRiskReason {
  label: string
  basis: string
}

export interface ReverseReviewInfo {
  matched: boolean
  departmentId?: string
  departmentName?: string
  relatedCaseId?: string
  issueSummary?: string
  issueTags?: string[]
  status?: '待核查' | '核查中' | '已处理'
  possibleStage?: string
  suggestedCheck?: string[]
  dispositionOpinion?: string
  dispositionResult?: string
  feedbackAt?: string
  responsibleDepartment?: string
}

export interface PetitionLitigationItem {
  id: string
  registrationTime?: string
  registrar?: string
  conflictNo?: string
  occurredAt?: string
  occurredAddress?: string
  source?: string
  riskLevel?: PetitionRiskLevel
  street?: string
  community?: string
  eventName?: string
  eventCategory?: string
  summary?: string
  previousMeasures?: string
  industryDepartment?: string
  industryCategory?: string
  resolvedAt?: string
  mediationResult?: string
  legalResolutionPath?: string
  receiver?: string
  receiverPhone?: string
  branchName?: string
  policeStation?: string
  responsibleOfficer?: string
  contactPhone?: string
  mediationInfo?: string
  party?: PetitionPartyProfile
  supervisionCategories?: SupervisionCategory[]
  supervisionScore?: number
  aiTags?: string[]
  aiReasons?: string[]
  riskAnalysis?: PetitionRiskReason[]
  suggestedActions?: string[]
  reviewStatus?: PetitionReviewStatus
  relatedCaseIds?: string[]
  typical?: boolean
  reverseReview?: ReverseReviewInfo
}

/** 保留 Excel 36 个原始表头与前后端字段的单一映射源。 */
export const PETITION_EXCEL_FIELD_MAP = {
  '登记时间': 'registrationTime', '登记人': 'registrar', '矛盾编号': 'conflictNo', '发生时间': 'occurredAt', '发生地址': 'occurredAddress',
  '事件来源': 'source', '风险等级': 'riskLevel', '所属街道': 'street', '所属社区': 'community', '事件名称': 'eventName', '事件类别': 'eventCategory',
  '事件简述': 'summary', '前期工作措施': 'previousMeasures', '行业主管部门': 'industryDepartment', '行业类别': 'industryCategory', '化解时间': 'resolvedAt',
  '调解结果': 'mediationResult', '法治化解决路径': 'legalResolutionPath', '受理人': 'receiver', '受理人联系电话': 'receiverPhone', '当事人姓名': 'party.name',
  '当事人电话': 'party.phone', '当事人身份证': 'party.idCard', '当事人年龄': 'party.age', '当事人性别': 'party.gender', '当事人民族': 'party.ethnicity',
  '当事人现住地区划': 'party.currentRegion', '当事人住址': 'party.address', '当事人户籍地': 'party.householdRegion', '当事人户籍地详细地址': 'party.householdAddress',
  '当事人工作单位': 'party.employer', '分局名称': 'branchName', '派出所名称': 'policeStation', '责任民警': 'responsibleOfficer', '联系电话': 'contactPhone', '调处信息': 'mediationInfo'
} as const
