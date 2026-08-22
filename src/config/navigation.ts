export type PermissionMode = 'any' | 'all'

export interface PermissionRule {
  permissions?: readonly string[]
  permissionMode?: PermissionMode
}

export type HomeCardIcon =
  | 'dashboard'
  | 'risk'
  | 'political'
  | 'alert'
  | 'suggestion'
  | 'legal'
  | 'petition'

export interface NavigationItem extends PermissionRule {
  key: string
  label: string
  homeCard?: {
    icon: HomeCardIcon
    descriptions: readonly [string, string]
  }
}

export interface BusinessWorkspace extends NavigationItem {
  secondary: readonly NavigationItem[]
}

/**
 * 全站统一权限规则。
 * 顶部导航、首页卡片、首页数据请求和 router meta 都从这里取规则，
 * 避免出现“菜单隐藏但首页可见 / 首页隐藏但 URL 可进入”的权限漂移。
 */
export const PERMISSION_RULES = {
  dashboardRead: {
    permissions: ['dashboard:read'] as const,
    permissionMode: 'any' as const
  },
  caseReadAny: {
    permissions: ['case:read:department', 'case:read:all', 'case:read:metadata'] as const,
    permissionMode: 'any' as const
  },
  procuratorateReadAny: {
    permissions: ['case:read:department', 'case:read:all'] as const,
    permissionMode: 'any' as const
  },
  // 新增/编辑检察建议使用案件写权限；后端权限名变化时只改这一处。
  procuratorateWriteAny: {
    permissions: ['case:write:department', 'case:write:all'] as const,
    permissionMode: 'any' as const
  },
  politicalRead: {
    permissions: ['political:read'] as const,
    permissionMode: 'any' as const
  },
  legalRecommendRead: {
    permissions: ['dashboard:read'] as const,
    permissionMode: 'any' as const
  },
  archiveRead: {
    permissions: ['dashboard:read'] as const,
    permissionMode: 'any' as const
  },
  dataImport: {
    permissions: ['data:import'] as const,
    permissionMode: 'any' as const
  },
  userManage: {
    permissions: ['user:manage'] as const,
    permissionMode: 'any' as const
  },
  systemManage: {
    permissions: ['system:manage'] as const,
    permissionMode: 'any' as const
  },
  materialEdit: {
    permissions: ['material:edit'] as const,
    permissionMode: 'any' as const
  }
} satisfies Record<string, PermissionRule>

/** 四个一级业务入口，顺序不得调整。 */
export const HOME_BUSINESS_ITEMS: readonly NavigationItem[] = [
  {
    key: '/political-security',
    label: '政治安全',
    ...PERMISSION_RULES.politicalRead,
    homeCard: { icon: 'political', descriptions: ['四维风险研判', '核心区重点防控'] }
  },
  {
    key: '/petition-litigation/overview',
    label: '民情智析',
    ...PERMISSION_RULES.caseReadAny,
    homeCard: { icon: 'petition', descriptions: ['12345·综治数据', '诉求识别研判'] }
  },
    {
    key: '/dashboard',
    label: '基层治理',
    ...PERMISSION_RULES.dashboardRead,
    homeCard: { icon: 'dashboard', descriptions: ['风险全景感知', '指标地图联动'] }
  },
  {
    key: '/procuratorate-suggestion',
    label: '检察履职',
    ...PERMISSION_RULES.procuratorateReadAny,
    homeCard: { icon: 'suggestion', descriptions: ['线索筛查复核', '履职办理反馈'] }
  }

]

/** 首页顶部仅展示四个一级入口。 */
export const PRIMARY_NAVIGATION_ITEMS: readonly NavigationItem[] = HOME_BUSINESS_ITEMS

/** 进入一级板块后展开的二级导航。 */
export const BUSINESS_WORKSPACES: readonly BusinessWorkspace[] = [
  {
    ...HOME_BUSINESS_ITEMS[0]!,
    secondary: [
      { key: '/political-security', label: '总体态势', ...PERMISSION_RULES.politicalRead },
      { key: '/political-security?panel=dimensions', label: '四维研判', ...PERMISSION_RULES.politicalRead },
      { key: '/political-security?panel=topics&lens=traditional', label: '传统安全', ...PERMISSION_RULES.politicalRead },
      { key: '/political-security?panel=topics&lens=nontraditional', label: '非传统安全', ...PERMISSION_RULES.politicalRead },
      { key: '/political-security?panel=topics', label: '重点事项', ...PERMISSION_RULES.politicalRead }
    ]
  },
  {
    ...HOME_BUSINESS_ITEMS[1]!,
    secondary: [
      { key: '/petition-litigation/overview', label: '整体情况', ...PERMISSION_RULES.caseReadAny },
      { key: '/petition-litigation/clues', label: '监督线索', ...PERMISSION_RULES.caseReadAny },
      { key: '/petition-litigation/reverse-review', label: '反向审视', ...PERMISSION_RULES.caseReadAny }
    ]
  },
  {
    ...HOME_BUSINESS_ITEMS[2]!,
    secondary: [
      { key: '/procuratorate-suggestion', label: '履职总览', ...PERMISSION_RULES.procuratorateReadAny },
      { key: '/procuratorate-suggestion?panel=list', label: '线索复核', ...PERMISSION_RULES.procuratorateReadAny },
      { key: '/alert-push', label: '预警推送', ...PERMISSION_RULES.dashboardRead },
      { key: '/procuratorate-suggestion?panel=analytics', label: '检察建议', ...PERMISSION_RULES.procuratorateReadAny },
      { key: '/legal-recommend', label: '靶向普法', ...PERMISSION_RULES.legalRecommendRead },
      { key: '/effect-stats', label: '办理反馈', ...PERMISSION_RULES.dashboardRead }
    ]
  },
  {
    ...HOME_BUSINESS_ITEMS[3]!,
    secondary: [
      { key: '/dashboard', label: '总体态势', ...PERMISSION_RULES.dashboardRead },
      { key: '/dashboard?panel=indices', label: '风险指数', ...PERMISSION_RULES.dashboardRead },
      { key: '/dashboard?panel=trend', label: '趋势分析', ...PERMISSION_RULES.dashboardRead }
    ]
  }
]

/** “更多”下拉中的非一级核心功能。 */
export const SECONDARY_NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { key: '/effect-stats', label: '效果评估统计', ...PERMISSION_RULES.dashboardRead },
  { key: '/data-management', label: '数据导入', ...PERMISSION_RULES.dataImport },
  { key: '/access-management', label: '权限审计', ...PERMISSION_RULES.userManage },
  { key: '/system-settings', label: '系统设置', ...PERMISSION_RULES.systemManage },
  { key: '/archive', label: '往期窗口', ...PERMISSION_RULES.archiveRead }
]

/** 保留合并列表，兼容仍需遍历全部导航的代码。 */
export const TOP_NAVIGATION_ITEMS: readonly NavigationItem[] = [
  ...PRIMARY_NAVIGATION_ITEMS,
  ...SECONDARY_NAVIGATION_ITEMS
]
