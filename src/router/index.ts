import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
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
import { authState, hasPermission, restoreSession } from '../services/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { public: true }
  },
  {
    path: '/data-management', name: 'DataManagement', component: DataManagement, meta: { permission: 'data:import' }
  },
  {
    path: '/access-management', name: 'AccessManagement', component: AccessManagement, meta: { permission: 'user:manage' }
  },
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    path: '/risk-analysis',
    name: 'RiskAnalysis',
    component: RiskAnalysis
  },
  {
    path: '/case-detail/:id',
    name: 'CaseDetail',
    component: CaseDetail
  },
  {
    path: '/alert-push',
    name: 'AlertPush',
    component: AlertPush
  },
  {
    path: '/procuratorate-suggestion',
    name: 'ProcuratorateSuggestion',
    component: ProcuratorateSuggestion
  },
  {
    path: '/procuratorate-suggestion/detail/:id',
    name: 'ProcuratorateSuggestionDetail',
    component: ProcuratorateSuggestionDetail
  },
  {
    path: '/procuratorate-suggestion/new',
    name: 'ProcuratorateSuggestionNew',
    component: ProcuratorateSuggestionForm
  },
  {
    path: '/procuratorate-suggestion/edit/:id',
    name: 'ProcuratorateSuggestionEdit',
    component: ProcuratorateSuggestionForm
  },
  {
    path: '/legal-recommend',
    name: 'LegalRecommend',
    component: LegalRecommend
  },
  {
    path: '/effect-stats',
    name: 'EffectStats',
    component: EffectStats
  },
  {
    path: '/system-settings',
    name: 'SystemSettings',
    component: SystemSettings,
    meta: { permission: 'system:manage' }
  },
  {
    path: '/archive',
    name: 'Archive',
    component: Archive
  },
  {
    path: '/archive-item/:id',
    name: 'ArchiveItem',
    component: ArchiveItem
  },
  {
    path: '/official-article/:id',
    name: 'OfficialArticle',
    component: OfficialArticle
  },
  {
    path: '/legal-plan/:id',
    name: 'LegalPlan',
    component: LegalPlan
  },
  {
    path: '/political-security',
    name: 'PoliticalSecurity',
    component: PoliticalSecurity,
    meta: { permission: 'political:read' }
  },
  {
      path: '/legal-plan-form',
      name: 'LegalPlanForm',
      component: LegalPlanForm,
      meta: { permission: 'material:edit' }
  }
]

const isElectron = (typeof window !== 'undefined' && (window as Window & { process?: { type?: string } }).process?.type === 'renderer') || location.protocol === 'file:'

const router = createRouter({
  history: isElectron ? createWebHashHistory() : createWebHistory(),
  routes
})

router.beforeEach(async (to) => {
  if (!authState.ready) await restoreSession()
  if (to.meta.public) {
    return authState.user && to.path === '/login' ? '/dashboard' : true
  }
  if (!authState.user) return { path: '/login', query: { redirect: to.fullPath } }
  const permission = typeof to.meta.permission === 'string' ? to.meta.permission : undefined
  if (!hasPermission(permission)) return '/dashboard'
  return true
})

export default router
