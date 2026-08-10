import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import Home from '../views/home.vue'
import Dashboard from '../views/index.vue'
import RiskAnalysis from '../views/risk-analysis.vue'
import CaseDetail from '../views/case-detail.vue'
import LegalRecommend from '../views/legal-recommend.vue'
import AlertPush from '../views/alert-push.vue'
import EffectStats from '../views/effect-stats.vue'
import SystemSettings from '../views/system-settings.vue'
import Archive from '../views/archive.vue'
import ArchiveItem from '../views/archive-item.vue'
import OfficialArticle from '../views/official-article.vue'
import LegalPlan from '../views/legal-plan.vue'
import ProcuratorateSuggestion from '../views/procuratorate-suggestion.vue'
import ProcuratorateSuggestionDetail from '../views/procuratorate-suggestion-detail.vue'
import ProcuratorateSuggestionForm from '../views/procuratorate-suggestion-form.vue'
import PoliticalSecurity from '../views/political-security.vue'
import LegalPlanForm from '../views/legal-plan-form.vue'
import Login from '../views/login.vue'
import DataManagement from '../views/data-management.vue'
import AccessManagement from '../views/access-management.vue'
import { authState, hasPermissions, restoreSession } from '../services/auth'
import { HOME_BUSINESS_ITEMS, PERMISSION_RULES, type PermissionMode } from '../config/navigation'

const permissionMeta = (rule: { permissions?: readonly string[]; permissionMode?: PermissionMode }) => ({
  permissions: rule.permissions ? [...rule.permissions] : undefined,
  permissionMode: rule.permissionMode ?? 'any'
})

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { public: true }
  },
  {
    path: '/data-management',
    name: 'DataManagement',
    component: DataManagement,
    meta: permissionMeta(PERMISSION_RULES.dataImport)
  },
  {
    path: '/access-management',
    name: 'AccessManagement',
    component: AccessManagement,
    meta: permissionMeta(PERMISSION_RULES.userManage)
  },
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: permissionMeta(PERMISSION_RULES.dashboardRead)
  },
  {
    path: '/risk-analysis',
    name: 'RiskAnalysis',
    component: RiskAnalysis,
    meta: permissionMeta(PERMISSION_RULES.caseReadAny)
  },
  {
    path: '/case-detail/:id',
    name: 'CaseDetail',
    component: CaseDetail,
    meta: permissionMeta(PERMISSION_RULES.caseReadAny)
  },
  {
    path: '/alert-push',
    name: 'AlertPush',
    component: AlertPush,
    meta: permissionMeta(PERMISSION_RULES.dashboardRead)
  },
  {
    path: '/procuratorate-suggestion',
    name: 'ProcuratorateSuggestion',
    component: ProcuratorateSuggestion,
    meta: permissionMeta(PERMISSION_RULES.procuratorateReadAny)
  },
  {
    path: '/procuratorate-suggestion/detail/:id',
    name: 'ProcuratorateSuggestionDetail',
    component: ProcuratorateSuggestionDetail,
    meta: permissionMeta(PERMISSION_RULES.procuratorateReadAny)
  },
  {
    path: '/procuratorate-suggestion/new',
    name: 'ProcuratorateSuggestionNew',
    component: ProcuratorateSuggestionForm,
    meta: permissionMeta(PERMISSION_RULES.procuratorateWriteAny)
  },
  {
    path: '/procuratorate-suggestion/edit/:id',
    name: 'ProcuratorateSuggestionEdit',
    component: ProcuratorateSuggestionForm,
    meta: permissionMeta(PERMISSION_RULES.procuratorateWriteAny)
  },
  {
    path: '/legal-recommend',
    name: 'LegalRecommend',
    component: LegalRecommend,
    meta: permissionMeta(PERMISSION_RULES.legalRecommendRead)
  },
  {
    path: '/effect-stats',
    name: 'EffectStats',
    component: EffectStats,
    meta: permissionMeta(PERMISSION_RULES.dashboardRead)
  },
  {
    path: '/system-settings',
    name: 'SystemSettings',
    component: SystemSettings,
    meta: permissionMeta(PERMISSION_RULES.systemManage)
  },
  {
    path: '/archive',
    name: 'Archive',
    component: Archive,
    meta: permissionMeta(PERMISSION_RULES.archiveRead)
  },
  {
    path: '/archive-item/:id',
    name: 'ArchiveItem',
    component: ArchiveItem,
    meta: permissionMeta(PERMISSION_RULES.archiveRead)
  },
  {
    path: '/official-article/:id',
    name: 'OfficialArticle',
    component: OfficialArticle,
    meta: permissionMeta(PERMISSION_RULES.dashboardRead)
  },
  {
    path: '/legal-plan/:id',
    name: 'LegalPlan',
    component: LegalPlan,
    meta: permissionMeta(PERMISSION_RULES.legalRecommendRead)
  },
  {
    path: '/political-security',
    name: 'PoliticalSecurity',
    component: PoliticalSecurity,
    meta: permissionMeta(PERMISSION_RULES.politicalRead)
  },
  {
    path: '/legal-plan-form',
    name: 'LegalPlanForm',
    component: LegalPlanForm,
    meta: permissionMeta(PERMISSION_RULES.materialEdit)
  }
]

const isElectron =
  (typeof window !== 'undefined' &&
    (window as Window & { process?: { type?: string } }).process?.type === 'renderer') ||
  location.protocol === 'file:'

const router = createRouter({
  history: isElectron ? createWebHashHistory() : createWebHistory(),
  routes
})

const getFirstAccessibleBusinessPath = () =>
  HOME_BUSINESS_ITEMS.find((item) => hasPermissions(item.permissions, item.permissionMode))?.key

const getRequiredPermissions = (meta: Record<PropertyKey, unknown>) => {
  if (Array.isArray(meta.permissions)) {
    return meta.permissions.filter((permission): permission is string => typeof permission === 'string')
  }
  return typeof meta.permission === 'string' ? [meta.permission] : undefined
}

router.beforeEach(async (to) => {
  if (!authState.ready) await restoreSession()

  if (to.meta.public) {
    if (!authState.user || to.path !== '/login') return true
    return '/'
  }

  if (!authState.user) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  const permissions = getRequiredPermissions(to.meta)
  const permissionMode: PermissionMode = to.meta.permissionMode === 'all' ? 'all' : 'any'

  if (!hasPermissions(permissions, permissionMode)) {
    const fallback = getFirstAccessibleBusinessPath() ?? '/'
    return fallback === to.path ? '/' : fallback
  }

  return true
})

export default router
