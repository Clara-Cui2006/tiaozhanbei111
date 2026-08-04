<template>
  <router-view v-if="route.meta.public" />
  <div v-else class="app-container" :class="`theme-${theme}`">
    <a-layout class="layout-shell">
      <a-layout-header class="header">
        <div class="brand">
          <span class="brand-dot"></span>
          社区法律风险预警平台
        </div>

        <a-menu
          mode="horizontal"
          v-model:selected-keys="selectedKeys"
          @menu-item-click="handleMenuClick"
          class="top-menu"
        >
          <a-menu-item v-for="item in menuItems" :key="item.key">
            {{ item.label }}
          </a-menu-item>
        </a-menu>

        <div class="header-right">
          <a-tag color="arcoblue">院内数据</a-tag>
          <a-button size="mini" class="theme-toggle-btn" @click="toggleTheme">
            {{ theme === 'dark' ? '切换浅色' : '切换深色' }}
          </a-button>
          <div class="user-summary">
            <span>{{ authState.user?.displayName }}</span>
            <small>{{ roleLabel }}</small>
          </div>
          <a-button size="mini" @click="passwordModalVisible = true">修改密码</a-button>
          <a-button size="mini" @click="handleLogout">退出</a-button>
        </div>
      </a-layout-header>

      <a-layout-content class="content">
        <router-view />
      </a-layout-content>

      <a-layout-footer class="footer">
        <div class="footer-inner">
          <div class="record">
            <span>{{ footerInfo.recordNo }}</span>
            <span v-if="footerInfo.publicSecurityNo" class="split">|</span>
            <span v-if="footerInfo.publicSecurityNo">{{ footerInfo.publicSecurityNo }}</span>
          </div>
          <a-space size="large">
            <a-link
              v-for="item in footerInfo.links"
              :key="item.label"
              :href="item.url"
              :hoverable="true"
              status="normal"
            >
              {{ item.label }}
            </a-link>
          </a-space>
        </div>
      </a-layout-footer>
    </a-layout>
    <a-modal v-model:visible="passwordModalVisible" title="修改登录密码" :on-before-ok="changePassword" @cancel="clearPasswordForm">
      <a-form layout="vertical">
        <a-form-item label="当前密码"><a-input-password v-model="currentPassword" /></a-form-item>
        <a-form-item label="新密码"><a-input-password v-model="newPassword" placeholder="至少12位" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchSiteFooterInfo } from './api/platform'
import type { SiteFooterInfo } from './types/platform'
import { authState, hasPermission, logout } from './services/auth'
import { http } from './api/http'
import { Message } from '@arco-design/web-vue'

const router = useRouter()
const route = useRoute()
type ThemeMode = 'dark' | 'light'
const themeStorageKey = 'platform:theme-mode'
const theme = ref<ThemeMode>('light')
const selectedKeys = ref<string[]>([route.path])
const footerInfo = ref<SiteFooterInfo>({
  recordNo: '备案信息加载中',
  links: []
})

type MenuItem = { key: string; label: string; permissions?: string[] }
const allMenuItems: MenuItem[] = [
  { key: '/', label: '主页' },
  { key: '/dashboard', label: '风险预警态势盘', permissions: ['dashboard:read'] },
  { key: '/risk-analysis', label: '风险分析管理', permissions: ['case:read:department', 'case:read:all', 'case:read:metadata'] },
  { key: '/alert-push', label: '预警推送', permissions: ['dashboard:read'] },
  { key: '/procuratorate-suggestion', label: '检察建议', permissions: ['case:read:department', 'case:read:all'] },
  { key: '/legal-recommend', label: '普法方案', permissions: ['dashboard:read'] },
  { key: '/political-security', label: '政治安全', permissions: ['political:read'] },
  { key: '/effect-stats', label: '效果评估统计', permissions: ['dashboard:read'] },
  { key: '/data-management', label: '数据导入', permissions: ['data:import'] },
  { key: '/access-management', label: '权限审计', permissions: ['user:manage'] },
  { key: '/system-settings', label: '系统设置', permissions: ['system:manage'] },
  { key: '/archive', label: '往期窗口', permissions: ['dashboard:read'] }
]
const menuItems = computed(() => allMenuItems.filter((item) => !item.permissions || item.permissions.some(hasPermission)))
const roleNames: Record<string, string> = {
  ordinary: '普通用户', department_supervisor: '部门主任/主管', leadership: '院领导',
  data_admin: '数据管理员', system_admin: '系统管理员'
}
const roleLabel = computed(() => roleNames[authState.user?.role || ''] || '')
const passwordModalVisible = ref(false)
const currentPassword = ref('')
const newPassword = ref('')

function clearPasswordForm() {
  currentPassword.value = ''
  newPassword.value = ''
}

async function changePassword() {
  if (!currentPassword.value || newPassword.value.length < 12) {
    Message.error('请输入当前密码，新密码不得少于12位')
    return false
  }
  try {
    await http.post('/auth/change-password', { currentPassword: currentPassword.value, newPassword: newPassword.value })
    Message.success('密码已修改，请重新登录')
    clearPasswordForm()
    await logout()
    await router.replace('/login')
    return true
  } catch (error: any) {
    Message.error(error.response?.data?.detail || '密码修改失败')
    return false
  }
}

async function handleLogout() {
  await logout()
  await router.replace('/login')
}

watch(
  () => route.path,
  (path) => {
    selectedKeys.value = [path]
  },
  { immediate: true }
)

const handleMenuClick = (key: string) => {
  router.push(key)
}

const applyBodyThemeClass = (mode: ThemeMode) => {
  document.body.classList.remove('theme-dark', 'theme-light')
  document.body.classList.add(`theme-${mode}`)
}

const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}

watch(
  () => theme.value,
  (mode) => {
    localStorage.setItem(themeStorageKey, mode)
    applyBodyThemeClass(mode)
  },
  { immediate: true }
)

onMounted(async () => {
  const savedTheme = localStorage.getItem(themeStorageKey)
  if (savedTheme === 'dark' || savedTheme === 'light') {
    theme.value = savedTheme
  } else {
    // 改为默认浅色，不再跟随系统偏好
    theme.value = 'light'
  }
  footerInfo.value = await fetchSiteFooterInfo()
})
</script>

<style scoped>
:global(html),
:global(body),
:global(#app) {
  min-height: 100%;
  margin: 0;
}

:global(body.theme-dark) {
  background: #0a1225;
}

:global(body.theme-light) {
  background: #f2f8ff;
}

.app-container {
  min-height: 100vh;
  background: var(--app-bg);
  color: var(--text-main);
  transition: background 0.25s ease, color 0.25s ease;
}

.app-container.theme-dark {
  --app-bg:
    radial-gradient(circle at 15% 20%, rgba(58, 149, 255, 0.2), transparent 35%),
    radial-gradient(circle at 85% 0%, rgba(65, 216, 255, 0.12), transparent 35%),
    linear-gradient(180deg, #0a1225, #0d1e38 46%, #122a48);
  --header-bg: rgba(6, 14, 33, 0.72);
  --header-border: rgba(108, 201, 255, 0.28);
  --brand-color: #31beff;
  --brand-dot: #57d6ff;
  --menu-text: #e8f4ff;
  --menu-border: rgba(100, 190, 255, 0.25);
  --menu-hover-bg: rgba(81, 182, 255, 0.18);
  --menu-hover-border: rgba(100, 190, 255, 0.4);
  --menu-selected-bg: linear-gradient(180deg, rgba(83, 195, 255, 0.38), rgba(46, 129, 255, 0.3));
  --content-bg:
    radial-gradient(circle at 20% 10%, rgba(71, 165, 255, 0.12), transparent 35%),
    linear-gradient(180deg, rgba(8, 20, 40, 0.55), rgba(10, 24, 46, 0.72));
  --content-glow: rgba(83, 195, 255, 0.2);
  --card-bg: linear-gradient(180deg, rgba(14, 39, 78, 0.78), rgba(9, 24, 47, 0.86));
  --card-border: rgba(93, 191, 255, 0.22);
  --text-main: #e8f8ff;
  --text-sub: #b0d8f0;
  --input-bg: rgba(13, 30, 56, 0.86);
  --input-border: rgba(106, 194, 255, 0.34);
  --footer-bg: rgba(6, 15, 32, 0.82);
  --footer-border: rgba(95, 186, 255, 0.24);
  --footer-text: #9cd8fb;
}

.app-container.theme-light {
  --app-bg:
    radial-gradient(circle at 12% 8%, rgba(40, 132, 211, 0.28), transparent 42%),
    radial-gradient(circle at 82% 6%, rgba(93, 190, 235, 0.3), transparent 38%),
    linear-gradient(180deg, #d6ebff, #c9e3fb 44%, #bddcf8);
  --header-bg: rgba(221, 239, 255, 0.92);
  --header-border: rgba(52, 123, 187, 0.36);
  --brand-color: #0c4f86;
  --brand-dot: #1685d5;
  --menu-text: #123f66;
  --menu-border: rgba(46, 116, 181, 0.44);
  --menu-hover-bg: rgba(39, 123, 200, 0.22);
  --menu-hover-border: rgba(29, 108, 179, 0.56);
  --menu-selected-bg: linear-gradient(180deg, rgba(62, 152, 223, 0.45), rgba(37, 121, 197, 0.42));
  --content-bg:
    radial-gradient(circle at 16% 8%, rgba(49, 141, 214, 0.2), transparent 38%),
    linear-gradient(180deg, rgba(222, 239, 255, 0.9), rgba(206, 229, 249, 0.95));
  --content-glow: rgba(31, 111, 179, 0.24);
  --card-bg: linear-gradient(180deg, rgba(232, 244, 255, 0.96), rgba(214, 234, 252, 0.99));
  --card-border: rgba(57, 130, 193, 0.34);
  --text-main: #103a60;
  --text-sub: #2f638f;
  --input-bg: rgba(234, 247, 255, 0.98);
  --input-border: rgba(67, 133, 195, 0.52);
  --footer-bg: rgba(213, 234, 251, 0.9);
  --footer-border: rgba(69, 136, 198, 0.3);
  --footer-text: #2e638f;
}

.layout-shell {
  min-height: 100vh;
  background: transparent;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.header {
  height: 68px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 16px;
  align-items: center;
  padding: 0 20px;
  background: var(--header-bg);
  border-bottom: 1px solid var(--header-border);
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 20px -18px var(--content-glow);
  position: sticky;
  top: 0;
  z-index: 100;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--brand-color);
  font-weight: bold;
  letter-spacing: 1px;
  font-size: 16px;
}

.brand-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--brand-dot);
  box-shadow: 0 0 14px color-mix(in srgb, var(--brand-dot) 70%, transparent);
}

.top-menu {
  background: transparent;
  border-bottom: none;
}

.top-menu :deep(.arco-menu-inner) {
  justify-content: center;
}

.top-menu :deep(.arco-menu-item) {
  color: var(--menu-text) !important;
  font-size: 14px;
  font-weight: 500;
  background: transparent !important;
  border: 1px solid var(--menu-border) !important;
  border-radius: 8px;
  margin: 0 2px;
  padding: 0 12px;
  transition: all 0.2s ease;
}

.top-menu :deep(.arco-menu-item .arco-menu-item-inner) {
  color: var(--menu-text) !important;
}

.top-menu :deep(.arco-menu-item:hover) {
  color: var(--menu-text) !important;
  background: var(--menu-hover-bg) !important;
  border-color: var(--menu-hover-border) !important;
  transform: translateY(-1px);
}

.top-menu :deep(.arco-menu-item:hover .arco-menu-item-inner) {
  color: var(--menu-text) !important;
}

.top-menu :deep(.arco-menu-selected),
.top-menu :deep(.arco-menu-selected:hover) {
  color: var(--menu-text);
  background: var(--menu-selected-bg) !important;
  border-color: var(--menu-hover-border) !important;
  box-shadow: 0 0 16px color-mix(in srgb, var(--brand-dot) 24%, transparent) inset;
}

.app-container.theme-light .top-menu :deep(.arco-menu-item),
.app-container.theme-light .top-menu :deep(.arco-menu-item .arco-menu-item-inner),
.app-container.theme-light .top-menu :deep(.arco-menu-item:hover .arco-menu-item-inner),
.app-container.theme-light .top-menu :deep(.arco-menu-selected .arco-menu-item-inner) {
  color:rgba(18, 63, 105, 0.95) !important;
  font-weight: 600;
}

.top-menu :deep(.arco-menu-pop-button),
.top-menu :deep(.arco-menu-overflow-wrap) {
  background: transparent !important;
  color: var(--text-sub);
}

.header-right {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}

.theme-toggle-btn {
  border: 1px solid var(--menu-border) !important;
  background: color-mix(in srgb, var(--header-bg) 72%, transparent) !important;
  color: var(--menu-text) !important;
  border-radius: 999px !important;
  font-weight: 600;
  transition: all 0.2s ease;
}

.theme-toggle-btn:hover {
  border-color: var(--menu-hover-border) !important;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand-dot) 24%, transparent);
  transform: translateY(-1px);
}

.content {
  flex: 1;
  padding: 22px 24px 26px;
  background: var(--content-bg);
  overflow: auto;
}

.content :deep(.arco-layout-content) {
  background: transparent;
}

.content :deep(.arco-page-header) {
  background: linear-gradient(90deg, color-mix(in srgb, var(--brand-dot) 14%, transparent), color-mix(in srgb, var(--header-bg) 86%, transparent));
  border: 1px solid var(--card-border);
  border-radius: 10px;
}

.content :deep(.arco-page-header-title) {
  color: var(--text-main);
  font-size: 22px;
  font-weight: 700;
}

.content :deep(.arco-page-header-sub-title) {
  color: var(--text-sub);
}

.content :deep(.arco-card) {
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  content-visibility: auto;
  contain-intrinsic-size: 360px;
}

.content :deep(.arco-card:hover) {
  transform: translateY(-2px);
  box-shadow: 0 16px 28px rgba(0, 0, 0, 0.18);
}

.content :deep(.arco-card-header-title),
.content :deep(.arco-form-item-label-col > label),
.content :deep(.arco-descriptions-item-label),
.content :deep(.arco-table-th-item),
.content :deep(.arco-table-td),
.content :deep(.arco-typography),
.content :deep(.arco-descriptions-item-value),
.content :deep(.arco-list-item-meta-description) {
  color: var(--text-main);
}

.content :deep(.arco-form-item-extra),
.content :deep(.arco-form-item-message),
.content :deep(.arco-table-cell),
.content :deep(.arco-list-item-meta-title),
.content :deep(.arco-descriptions-item-value),
.content :deep(.arco-statistic-title),
.content :deep(.arco-statistic-content) {
  color: var(--text-main);
}

.content :deep(.arco-tag) {
  border-color: color-mix(in srgb, var(--brand-dot) 36%, transparent);
}

.content :deep(.arco-typography-secondary),
.content :deep(.arco-list-item-meta-description),
.content :deep(.arco-descriptions-item-label),
.content :deep(.arco-form-item-extra),
.content :deep(.arco-radio-label),
.content :deep(.arco-checkbox-label),
.content :deep(.arco-select-view-value .arco-select-view-value-text),
.content :deep(.arco-input::placeholder),
.content :deep(.arco-textarea::placeholder) {
  color: var(--text-sub) !important;
}

.content :deep(.arco-card-header-title) {
  font-size: 16px;
  font-weight: 600;
}

.app-container.theme-light .content :deep(.arco-page-header-title),
.app-container.theme-light .content :deep(.arco-card-header-title),
.app-container.theme-light .brand {
  color: #0d3a60;
  font-weight: 700;
}

.app-container.theme-light .content :deep(.arco-page-header),
.app-container.theme-light .content :deep(.arco-card),
.app-container.theme-light .content :deep(.arco-descriptions),
.app-container.theme-light .content :deep(.arco-table),
.app-container.theme-light .content :deep(.arco-empty) {
  color: #103a60;
}

.app-container.theme-light .content :deep(.arco-table-container) {
  background: rgba(229, 243, 255, 0.96);
}

.app-container.theme-light .content :deep(.arco-table-tr .arco-table-th) {
  background: rgba(88, 171, 239, 0.75);
}

.app-container.theme-light .content :deep(.arco-table-td),
.app-container.theme-light .content :deep(.arco-table-th-item),
.app-container.theme-light .content :deep(.arco-list-item-meta-title),
.app-container.theme-light .content :deep(.arco-link),
.app-container.theme-light .content :deep(.arco-tabs-nav-title),
.app-container.theme-light .content :deep(.arco-breadcrumb-item .arco-breadcrumb-item-link) {
  color: #103a60 !important;
}

.app-container.theme-light .content :deep(.arco-card.arco-card-size-medium) {
  background: linear-gradient(180deg, rgba(239, 248, 255, 0.98), rgba(225, 240, 253, 0.98)) !important;
}

.app-container.theme-light .content :deep(.arco-table-td) {
  background: rgba(234, 246, 255, 0.95) !important;
}

.app-container.theme-light .content :deep(h1),
.app-container.theme-light .content :deep(h2),
.app-container.theme-light .content :deep(h3),
.app-container.theme-light .content :deep(h4),
.app-container.theme-light .content :deep(h5),
.app-container.theme-light .content :deep(h6),
.app-container.theme-light .content :deep(p),
.app-container.theme-light .content :deep(span),
.app-container.theme-light .content :deep(label),
.app-container.theme-light .content :deep(li),
.app-container.theme-light .content :deep(td),
.app-container.theme-light .content :deep(th),
.app-container.theme-light .content :deep(strong),
.app-container.theme-light .content :deep(em) {
  color: #123f66;
}

.app-container.theme-light .content :deep(.arco-btn-text),
.app-container.theme-light .content :deep(.arco-link) {
  color: #0f3d63 !important;
}

.app-container.theme-light .content :deep(.arco-form-item-label),
.app-container.theme-light .content :deep(.arco-form-item-message),
.app-container.theme-light .content :deep(.arco-descriptions-item-label),
.app-container.theme-light .content :deep(.arco-descriptions-item-value),
.app-container.theme-light .content :deep(.arco-list-item-meta-title),
.app-container.theme-light .content :deep(.arco-list-item-meta-description),
.app-container.theme-light .content :deep(.arco-statistic-title),
.app-container.theme-light .content :deep(.arco-statistic-content),
.app-container.theme-light .content :deep(.arco-empty-description) {
  color: #103a60 !important;
}

.app-container.theme-light .content :deep(.arco-radio-group-button) {
  background: rgba(219, 236, 252, 0.86) !important;
  border-color: rgba(70, 136, 192, 0.34) !important;
}

.app-container.theme-light .content :deep(.arco-radio-button) {
  color: #123f66 !important;
  border-color: rgba(70, 136, 192, 0.3) !important;
  background: transparent !important;
}

.app-container.theme-light .content :deep(.arco-radio-button:hover) {
  color: #0f3d63 !important;
  background: rgba(115, 176, 228, 0.16) !important;
}

.app-container.theme-light .content :deep(.arco-radio-button.arco-radio-button-checked),
.app-container.theme-light .content :deep(.arco-radio-button.arco-radio-button-checked:hover) {
  color: #0a2f4d !important;
  background: linear-gradient(180deg, rgba(152, 206, 246, 0.9), rgba(123, 188, 236, 0.9)) !important;
  border-color: rgba(52, 123, 180, 0.56) !important;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.55);
}

/* 浅色模式全局对比度安全网：修复各页低对比场景 */
.app-container.theme-light .content :deep(.hero-bottom-bar) {
  background: linear-gradient(to top, rgba(8, 46, 80, 0.82) 0%, rgba(8, 46, 80, 0.48) 58%, rgba(8, 46, 80, 0.14) 100%) !important;
  border-top: 1px solid rgba(181, 226, 255, 0.32) !important;
}

.app-container.theme-light .content :deep(.hero-bottom-bar .hero-stat-number),
.app-container.theme-light .content :deep(.hero-bottom-bar .hero-stat-label),
.app-container.theme-light .content :deep(.hero-bottom-bar .feature-title),
.app-container.theme-light .content :deep(.hero-bottom-bar .feature-desc) {
  color: #e8f8ff !important;
  text-shadow: 0 1px 4px rgba(4, 24, 43, 0.55) !important;
}

.app-container.theme-light .content :deep(.detail-panel) {
  background: linear-gradient(180deg, rgba(240, 249, 255, 1), rgba(214, 233, 249, 1)) !important;
  border-color: rgba(52, 123, 180, 0.45) !important;
}

.app-container.theme-light .content :deep(.detail-panel .panel-title),
.app-container.theme-light .content :deep(.detail-panel .history-title),
.app-container.theme-light .content :deep(.detail-panel .event-main),
.app-container.theme-light .content :deep(.detail-panel .event-sub),
.app-container.theme-light .content :deep(.detail-panel .history-empty),
.app-container.theme-light .content :deep(.detail-panel .empty-tip),
.app-container.theme-light .content :deep(.detail-panel .detail-item),
.app-container.theme-light .content :deep(.detail-panel .label),
.app-container.theme-light .content :deep(.detail-panel .value),
.app-container.theme-light .content :deep(.detail-panel span) {
  color: #0f3658 !important;
}

.app-container.theme-light .content :deep(.kpi-item),
.app-container.theme-light .content :deep(.kpi-card) {
  background: linear-gradient(180deg, #f4f9ff, #dcecff) !important;
  border-color: rgba(74, 138, 196, 0.56) !important;
}

.app-container.theme-light .content :deep(.kpi-label),
.app-container.theme-light .content :deep(.kpi-hint),
.app-container.theme-light .content :deep(.kpi-value),
.app-container.theme-light .content :deep(.chart-extra),
.app-container.theme-light .content :deep(.map-note),
.app-container.theme-light .content :deep(.ai-assessment),
.app-container.theme-light .content :deep(.ai-loading-text),
.app-container.theme-light .content :deep(.ai-empty-text),
.app-container.theme-light .content :deep(.ai-report),
.app-container.theme-light .content :deep(.ai-report-content) {
  color: #0f3658 !important;
}

.app-container.theme-light .content :deep(.kpi-label),
.app-container.theme-light .content :deep(.kpi-hint) {
  background: rgba(226, 241, 253, 0.92) !important;
  border: 1px solid rgba(96, 153, 205, 0.35) !important;
  border-radius: 6px;
  padding: 2px 8px;
}

.app-container.theme-light .content :deep(.filter-section),
.app-container.theme-light .content :deep(.content-card) {
  background: rgba(226, 241, 255, 0.9) !important;
  border-color: rgba(74, 138, 196, 0.32) !important;
}

.content :deep(.arco-table-tr .arco-table-th) {
  background: color-mix(in srgb, var(--brand-dot) 18%, transparent);
}

.content :deep(.arco-table-tbody .arco-table-tr:hover .arco-table-td) {
  background: color-mix(in srgb, var(--brand-dot) 12%, transparent);
}

.content :deep(.arco-input-wrapper),
.content :deep(.arco-select-view),
.content :deep(.arco-input-number),
.content :deep(.arco-textarea-wrapper) {
  background: var(--input-bg);
  border-color: var(--input-border);
}

.footer {
  padding: 12px 20px;
  border-top: 1px solid var(--footer-border);
  background: var(--footer-bg);
}

.footer-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--footer-text);
  font-size: 12px;
}

.record {
  display: flex;
  align-items: center;
  gap: 8px;
}

.split {
  opacity: 0.55;
}

.footer :deep(.arco-link) {
  color: var(--footer-text);
}

.content::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.content::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand-dot) 45%, transparent);
}

.content::-webkit-scrollbar-track {
  background: color-mix(in srgb, var(--header-bg) 55%, transparent);
}

.content :deep(.arco-btn-primary) {
  background: linear-gradient(180deg, color-mix(in srgb, var(--brand-dot) 88%, #2d7ff7) 0%, #1a6dd4 100%);
  border: none;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--brand-dot) 30%, transparent), inset 0 1px 1px rgba(255, 255, 255, 0.2);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  transition: all 0.2s;
}

.content :deep(.arco-btn-primary:hover) {
  filter: brightness(1.05);
  box-shadow: 0 6px 16px color-mix(in srgb, var(--brand-dot) 40%, transparent), inset 0 1px 1px rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
}

.content :deep(.arco-btn-primary:active) {
  filter: brightness(0.94);
  transform: translateY(0);
}

.content :deep(.arco-btn-outline),
.content :deep(.arco-btn-secondary) {
  background: linear-gradient(180deg, color-mix(in srgb, var(--brand-dot) 15%, var(--header-bg)) 0%, color-mix(in srgb, var(--header-bg) 85%, #0f2f5c) 100%);
  border: 1px solid var(--menu-border);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.16), inset 0 1px 1px rgba(255, 255, 255, 0.1);
  color: var(--menu-text);
}

.content :deep(.arco-btn-outline:hover),
.content :deep(.arco-btn-secondary:hover) {
  border-color: var(--menu-hover-border);
  transform: translateY(-1px);
}

@media (max-width: 1280px) {
  .header {
    grid-template-columns: auto 1fr auto;
    gap: 10px;
    padding: 0 14px;
  }

  .brand {
    font-size: 14px;
  }

  .theme-toggle-btn {
    padding: 0 8px;
    font-size: 12px;
  }

  .top-menu :deep(.arco-menu-item) {
    margin: 0 2px;
    padding: 0 8px;
    font-size: 13px;
  }
}

/* ===== 手机端适配（全面重构） ===== */
@media (max-width: 768px) {
  .header {
    height: auto !important;
    display: flex !important;
    flex-direction: column !important;
    padding: 6px 10px !important;
    gap: 4px !important;
    grid-template-columns: none !important;
  }

  .brand {
    font-size: 13px !important;
    justify-content: center !important;
    text-align: center !important;
  }

  .brand-dot { width: 7px; height: 7px; }

  .top-menu {
    width: 100% !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .top-menu::-webkit-scrollbar { display: none; }

  .top-menu :deep(.arco-menu-inner) {
    flex-wrap: nowrap !important;
    justify-content: center !important;
    gap: 2px !important;
  }

  .top-menu :deep(.arco-menu-item) {
    font-size: 11px !important;
    padding: 3px 6px !important;
    white-space: nowrap !important;
    flex-shrink: 0 !important;
    border-radius: 4px !important;
    min-width: auto !important;
  }

  .header-right {
    display: none !important;
  }

  .content {
    padding: 6px !important;
  }

  .content :deep(.arco-page-header) {
    padding: 8px 10px !important;
    border-radius: 6px !important;
    margin-bottom: 6px !important;
  }
  .content :deep(.arco-page-header-title) {
    font-size: 15px !important;
  }
  .content :deep(.arco-page-header-sub-title),
  .content :deep(.arco-page-header-back) {
    display: none !important;
  }

  .content :deep(.arco-card) {
    border-radius: 8px !important;
    margin-bottom: 6px !important;
  }
  .content :deep(.arco-card-header) {
    padding: 8px 10px !important;
  }
  .content :deep(.arco-card-body) {
    padding: 8px 10px !important;
  }
  .content :deep(.arco-card-header-title) {
    font-size: 13px !important;
  }

  .content :deep(.arco-row) {
    display: flex !important;
    flex-direction: column !important;
    gap: 6px !important;
  }
  .content :deep(.arco-col) {
    max-width: 100% !important;
    flex: none !important;
    width: 100% !important;
    padding: 0 !important;
  }

  .content :deep(.arco-table-container) {
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
  }
  .content :deep(.arco-table) {
    min-width: 560px !important;
  }

  .content :deep(div[style*="height: 600px"]),
  .content :deep(div[style*="height: 620px"]) {
    height: 300px !important;
  }
  .content :deep(div[style*="height: 420px"]),
  .content :deep(div[style*="height: 380px"]),
  .content :deep(div[style*="height: 360px"]),
  .content :deep(div[style*="height: 320px"]) {
    height: 250px !important;
  }

  .content :deep(.arco-radio-group-button),
  .content :deep(.arco-radio-group) {
    overflow-x: auto !important;
    flex-wrap: nowrap !important;
    scrollbar-width: none;
  }
  .content :deep(.arco-radio-group-button::-webkit-scrollbar),
  .content :deep(.arco-radio-group::-webkit-scrollbar) { display: none; }
  .content :deep(.arco-radio-button),
  .content :deep(.arco-radio) {
    white-space: nowrap !important;
    flex-shrink: 0 !important;
    font-size: 11px !important;
  }

  .content :deep(.arco-tabs-tab) {
    padding: 4px 8px !important;
    font-size: 12px !important;
  }

  .content :deep(.arco-form-item) {
    margin-bottom: 8px !important;
  }

  .content :deep(.map-note),
  .content :deep(.map-intro),
  .content :deep(.data-hint),
  .content :deep(.classification-hint),
  .content :deep(.detail-panel) {
    display: none !important;
  }

  .footer {
    padding: 6px 10px !important;
  }
  .footer-inner {
    flex-direction: column !important;
    gap: 4px !important;
    text-align: center !important;
    font-size: 10px !important;
  }
}
</style>
