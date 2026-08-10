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

export interface NavigationItem extends PermissionRule {
  key: string
  label: string
  homeCard?: {
    icon: HomeCardIcon
    descriptions: readonly [string, string]
  }
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

/**
 * 首页六个主要业务入口。
 * 顺序同时作为“进入平台”的默认跳转优先级。
 */
export const HOME_BUSINESS_ITEMS: readonly NavigationItem[] = [
  {
    key: '/dashboard',
    label: '风险预警态势盘',
    ...PERMISSION_RULES.dashboardRead,
    homeCard: { icon: 'dashboard', descriptions: ['风险态势全景感知', '预警趋势动态掌握'] }
  },
  {
    key: '/risk-analysis',
    label: '风险分析管理',
    ...PERMISSION_RULES.caseReadAny,
    homeCard: { icon: 'risk', descriptions: ['风险深度分析研判', '管理闭环提质增效'] }
  },
  {
    key: '/political-security',
    label: '政治安全',
    ...PERMISSION_RULES.politicalRead,
    homeCard: { icon: 'political', descriptions: ['政治风险精准识别', '风险隐患有效防控'] }
  },
  {
    key: '/alert-push',
    label: '预警推送',
    ...PERMISSION_RULES.dashboardRead,
    homeCard: { icon: 'alert', descriptions: ['预警信息及时送达', '联动处置高效响应'] }
  },
  {
    key: '/procuratorate-suggestion',
    label: '检察建议',
    ...PERMISSION_RULES.procuratorateReadAny,
    homeCard: { icon: 'suggestion', descriptions: ['问题线索精准反馈', '建议跟踪闭环管理'] }
  },
  {
    key: '/legal-recommend',
    label: '普法方案',
    ...PERMISSION_RULES.legalRecommendRead,
    homeCard: { icon: 'legal', descriptions: ['普法资源智能匹配', '普法方案科学制定'] }
  }
]

/** 顶部一级导航：效果图中固定展示“首页 + 六个主要业务”。 */
export const PRIMARY_NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { key: '/', label: '首页' },
  ...HOME_BUSINESS_ITEMS
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
