<template>
  <router-view v-if="route.meta.public" />

  <div v-else class="app-container" :class="`theme-${theme}`">
    <a-layout class="layout-shell">
      <a-layout-header class="header">
        <button class="brand" type="button" aria-label="返回首页" @click="goTo('/')">
          红墙智检
        </button>

        <nav class="top-nav" aria-label="主导航">
          <button
            v-for="item in primaryMenuItems"
            :key="item.key"
            type="button"
            class="nav-link"
            :class="{ 'nav-link--active': isNavActive(item.key) }"
            @click="goTo(item.key)"
          >
            {{ item.label }}
          </button>

          <!-- 桌面端直接展示次级导航，不再显示“更多” -->
          <button
            v-for="item in moreMenuItems"
            :key="`desktop-${item.key}`"
            type="button"
            class="nav-link nav-secondary-direct"
            :class="{ 'nav-link--active': isNavActive(item.key) }"
            @click="goTo(item.key)"
          >
            {{ item.label }}
          </button>

          <!-- 仅手机端将次级导航收进“更多” -->
          <div v-if="moreMenuItems.length" class="more-nav" @click.stop>
            <button
              type="button"
              class="nav-link more-trigger"
              :class="{ 'nav-link--active': secondaryActive }"
              :aria-expanded="moreOpen"
              @click="moreOpen = !moreOpen"
            >
              更多
              <span class="nav-chevron" :class="{ 'nav-chevron--open': moreOpen }">⌄</span>
            </button>

            <transition name="menu-fade">
              <div v-if="moreOpen" class="more-menu">
                <button
                  v-for="item in moreMenuItems"
                  :key="`mobile-${item.key}`"
                  type="button"
                  class="more-menu-item"
                  :class="{ 'more-menu-item--active': isNavActive(item.key) }"
                  @click="goTo(item.key)"
                >
                  {{ item.label }}
                </button>
              </div>
            </transition>
          </div>
        </nav>

        <div
          class="account-slot"
          :class="{ 'account-slot--hero': isHomeRoute }"
          @click.stop
        >
          <button
            type="button"
            class="account-trigger"
            :aria-expanded="accountMenuOpen"
            @click="accountMenuOpen = !accountMenuOpen"
          >
            <span class="account-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <circle cx="12" cy="8" r="3.1" />
                <path d="M5.5 19c.7-3.5 3-5.4 6.5-5.4s5.8 1.9 6.5 5.4" />
              </svg>
            </span>
            <span class="account-org">{{ organizationLabel }}</span>
            <span class="account-chevron" :class="{ 'account-chevron--open': accountMenuOpen }">⌄</span>
          </button>

          <transition name="menu-fade">
            <div v-if="accountMenuOpen" class="account-menu">
              <div class="account-profile">
                <strong>{{ authState.user?.displayName || authState.user?.username }}</strong>
                <span>{{ roleLabel }}</span>
                <span v-if="authState.user?.department">{{ authState.user.department }}</span>
              </div>
              <div class="account-menu-separator"></div>
              <div class="account-data-scope">
                <span>数据范围</span>
                <strong>院内数据</strong>
              </div>
              <button type="button" class="account-menu-item" @click="toggleTheme">
                {{ theme === 'dark' ? '切换浅色' : '切换深色' }}
              </button>
              <button type="button" class="account-menu-item" @click="openPasswordModal">修改密码</button>
              <button type="button" class="account-menu-item account-menu-item--danger" @click="handleLogout">退出登录</button>
            </div>
          </transition>
        </div>
      </a-layout-header>

      <a-layout-content class="content" :class="{ 'home-content': isHomeRoute }">
        <router-view />
      </a-layout-content>

      <a-layout-footer class="footer">
        <div class="footer-inner">
          <div class="record">
            <span>{{ footerInfo.recordNo }}</span>
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

    <a-modal
      v-model:visible="passwordModalVisible"
      title="修改登录密码"
      :on-before-ok="changePassword"
      @cancel="clearPasswordForm"
    >
      <a-form :model="{ currentPassword, newPassword }" layout="vertical">
        <a-form-item label="当前密码"><a-input-password v-model="currentPassword" /></a-form-item>
        <a-form-item label="新密码"><a-input-password v-model="newPassword" placeholder="至少12位" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { fetchSiteFooterInfo } from './api/platform'
import { http } from './api/http'
import {
  PRIMARY_NAVIGATION_ITEMS,
  SECONDARY_NAVIGATION_ITEMS
} from './config/navigation'
import { authState, hasPermissions, logout } from './services/auth'
import type { SiteFooterInfo } from './types/platform'

const router = useRouter()
const route = useRoute()

type ThemeMode = 'dark' | 'light'
const themeStorageKey = 'platform:theme-mode'
const organizationLabel = '北京市西城区人民检察院'

const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'dark'
  const savedTheme = localStorage.getItem(themeStorageKey)
  return savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'dark'
}

const theme = ref<ThemeMode>(getInitialTheme())
provide('appTheme', theme)
const moreOpen = ref(false)
const accountMenuOpen = ref(false)
const passwordModalVisible = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const footerInfo = ref<SiteFooterInfo>({ recordNo: '备案信息加载中', links: [] })

const isHomeRoute = computed(() => route.path === '/')
const primaryMenuItems = computed(() =>
  PRIMARY_NAVIGATION_ITEMS.filter((item) => hasPermissions(item.permissions, item.permissionMode))
)
const moreMenuItems = computed(() =>
  SECONDARY_NAVIGATION_ITEMS.filter((item) => hasPermissions(item.permissions, item.permissionMode))
)

const roleNames: Record<string, string> = {
  ordinary: '普通用户',
  department_supervisor: '部门主任/主管',
  leadership: '院领导',
  data_admin: '数据管理员',
  system_admin: '系统管理员'
}
const roleLabel = computed(() => roleNames[authState.user?.role || ''] || '')

const isNavActive = (key: string) => {
  const path = route.path
  if (key === '/') return path === '/'
  if (key === '/risk-analysis') return path.startsWith('/risk-analysis') || path.startsWith('/case-detail/')
  if (key === '/procuratorate-suggestion') return path.startsWith('/procuratorate-suggestion')
  if (key === '/legal-recommend') return path.startsWith('/legal-recommend') || path.startsWith('/legal-plan/')
  if (key === '/archive') return path === '/archive' || path.startsWith('/archive-item/')
  return path === key || path.startsWith(`${key}/`)
}

const secondaryActive = computed(() => moreMenuItems.value.some((item) => isNavActive(item.key)))

function closeFloatingMenus() {
  moreOpen.value = false
  accountMenuOpen.value = false
}

function goTo(path: string) {
  closeFloatingMenus()
  if (route.path !== path) router.push(path)
}

function clearPasswordForm() {
  currentPassword.value = ''
  newPassword.value = ''
}

function openPasswordModal() {
  accountMenuOpen.value = false
  passwordModalVisible.value = true
}

async function changePassword() {
  if (!currentPassword.value || newPassword.value.length < 12) {
    Message.error('请输入当前密码，新密码不得少于12位')
    return false
  }
  try {
    await http.post('/auth/change-password', {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value
    })
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
  accountMenuOpen.value = false
  await logout()
  await router.replace('/login')
}

const applyBodyThemeClass = (mode: ThemeMode) => {
  document.body.classList.remove('theme-dark', 'theme-light')
  document.body.classList.add(`theme-${mode}`)
}

const toggleTheme = () => {
  accountMenuOpen.value = false
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}

const onDocumentKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') closeFloatingMenus()
}

watch(
  () => route.fullPath,
  () => closeFloatingMenus()
)

watch(
  () => theme.value,
  (mode) => {
    localStorage.setItem(themeStorageKey, mode)
    applyBodyThemeClass(mode)
  },
  { immediate: true }
)

onMounted(async () => {
  document.addEventListener('click', closeFloatingMenus)
  document.addEventListener('keydown', onDocumentKeydown)
  footerInfo.value = await fetchSiteFooterInfo()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeFloatingMenus)
  document.removeEventListener('keydown', onDocumentKeydown)
})
</script>

<style scoped>
:global(html),
:global(body),
:global(#app) {
  min-height: 100%;
  margin: 0;
}

:global(html) {
  font-family: "Microsoft YaHei UI", "PingFang SC", "Noto Sans CJK SC", "Noto Sans SC", sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

:global(body.theme-dark) {
  background: #030916;
}

:global(body.theme-light) {
  background: #f2f8ff;
}

.app-container {
  min-height: 100vh;
  background: var(--app-bg);
  color: var(--text-main);
  font-family: "Microsoft YaHei UI", "PingFang SC", "Noto Sans CJK SC", "Noto Sans SC", sans-serif;
  transition: background 0.25s ease, color 0.25s ease;
}

.app-container.theme-dark {
  --app-bg:
    radial-gradient(circle at 14% 14%, rgba(35, 132, 230, 0.18), transparent 33%),
    radial-gradient(circle at 86% 2%, rgba(48, 218, 255, 0.12), transparent 31%),
    linear-gradient(180deg, #040b1a 0%, #07172d 48%, #0a223d 100%);
  --header-bg: rgba(3, 11, 27, 0.88);
  --header-border: rgba(104, 220, 255, 0.34);
  --brand-color: #72e5ff;
  --brand-dot: #53dcff;
  --menu-text: #dff6ff;
  --menu-border: rgba(103, 211, 255, 0.28);
  --menu-hover-bg: rgba(62, 187, 242, 0.17);
  --menu-hover-border: rgba(116, 225, 255, 0.62);
  --menu-selected-bg: linear-gradient(180deg, rgba(48, 186, 238, 0.38), rgba(32, 105, 198, 0.30));
  --content-bg:
    radial-gradient(circle at 18% 8%, rgba(44, 158, 240, 0.11), transparent 34%),
    linear-gradient(180deg, rgba(4, 15, 32, 0.72), rgba(7, 24, 46, 0.88));
  --content-glow: rgba(74, 209, 255, 0.24);
  --card-bg: linear-gradient(155deg, rgba(12, 39, 72, 0.88), rgba(5, 20, 42, 0.94));
  --card-border: rgba(99, 207, 247, 0.30);
  --text-main: #eafaff;
  --text-sub: #a9d7eb;
  --input-bg: rgba(7, 27, 52, 0.90);
  --input-border: rgba(105, 210, 247, 0.40);
  --footer-bg: rgba(3, 13, 29, 0.90);
  --footer-border: rgba(98, 205, 244, 0.28);
  --footer-text: #9ddbf2;
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
  height: 72px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 16px;
  align-items: center;
  padding: 0 20px;
  background: var(--header-bg);
  border-bottom: 1px solid var(--header-border);
  backdrop-filter: blur(10px);
  box-shadow:
    0 12px 28px -20px var(--content-glow),
    inset 0 -1px 0 color-mix(in srgb, var(--brand-dot) 20%, transparent);
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
  font-size: 18px;
  text-shadow: 0 0 18px color-mix(in srgb, var(--brand-dot) 28%, transparent);
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
  font-size: 15px;
  font-weight: 600;
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
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, #ffffff 10%, transparent),
    0 12px 30px rgba(0, 8, 24, 0.16);
}

.content :deep(.arco-page-header-title) {
  color: var(--text-main);
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-shadow: 0 0 18px color-mix(in srgb, var(--brand-dot) 24%, transparent);
}

.content :deep(.arco-page-header-sub-title) {
  color: var(--text-sub);
  font-size: 15px;
}

.content :deep(.arco-card) {
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow:
    inset 0 1px 0 rgba(226, 250, 255, 0.08),
    inset 1px 0 0 rgba(87, 214, 255, 0.04),
    0 14px 30px rgba(0, 5, 20, 0.18),
    0 0 22px color-mix(in srgb, var(--brand-dot) 5%, transparent);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  content-visibility: auto;
  contain-intrinsic-size: 360px;
}

.content :deep(.arco-card:hover) {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--brand-dot) 62%, transparent);
  box-shadow:
    inset 0 1px 0 rgba(232, 252, 255, 0.12),
    0 18px 34px rgba(0, 5, 20, 0.24),
    0 0 24px color-mix(in srgb, var(--brand-dot) 12%, transparent);
}

.content :deep(.arco-card-header) {
  min-height: 56px;
  border-bottom-color: color-mix(in srgb, var(--brand-dot) 22%, transparent);
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--brand-dot) 10%, transparent), transparent 52%);
  box-shadow: inset 0 -1px 0 rgba(219, 247, 255, 0.025);
}

/* 仅为真实图表卡增加缓慢扫光，让动态语言覆盖全部图表而不干扰表格和表单。 */
.content :deep(.arco-card:has(canvas)) {
  position: relative;
  overflow: hidden;
}

.content :deep(.arco-card:has(canvas)::after) {
  position: absolute;
  inset: 0;
  z-index: 6;
  pointer-events: none;
  content: '';
  opacity: 0.34;
  background:
    linear-gradient(
      180deg,
      transparent 0%,
      transparent 46%,
      rgba(121, 224, 255, 0.08) 48.5%,
      rgba(246, 211, 139, 0.28) 50%,
      rgba(208, 235, 245, 0.12) 51.5%,
      transparent 54%,
      transparent 100%
    );
  background-size: 100% 220%;
  animation: chart-energy-sweep 7.2s linear infinite;
}

@keyframes chart-energy-sweep {
  from { background-position: 0 -120%; }
  to { background-position: 0 120%; }
}

@media (prefers-reduced-motion: reduce) {
  .content :deep(.arco-card:has(canvas)::after) {
    animation: none;
    opacity: 0;
  }
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
  position: relative;
  display: block;
  width: 100%;
  min-width: 0;
  min-height: 32px;
  padding: 3px 14px 3px 12px;
  border-left: 3px solid var(--brand-dot);
  border-radius: 3px 9px 9px 3px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--brand-dot) 16%, transparent), transparent);
  font-size: 24px;
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: 0.03em;
  text-shadow: 0 0 14px color-mix(in srgb, var(--brand-dot) 18%, transparent);
}

.content :deep(.arco-card-header-title > *) {
  width: 100%;
  min-width: 0;
}

.app-container.theme-light .content:not(.home-content) :deep(.arco-page-header-title),
.app-container.theme-light .content:not(.home-content) :deep(.arco-card-header-title),
.app-container.theme-light .brand {
  color: #0d3a60;
  font-weight: 700;
}

.app-container.theme-light .content:not(.home-content) :deep(.arco-page-header),
.app-container.theme-light .content:not(.home-content) :deep(.arco-card),
.app-container.theme-light .content:not(.home-content) :deep(.arco-descriptions),
.app-container.theme-light .content:not(.home-content) :deep(.arco-table),
.app-container.theme-light .content:not(.home-content) :deep(.arco-empty) {
  color: #103a60;
}

.app-container.theme-light .content:not(.home-content) :deep(.arco-table-container) {
  background: rgba(229, 243, 255, 0.96);
}

.app-container.theme-light .content:not(.home-content) :deep(.arco-table-tr .arco-table-th) {
  background: rgba(88, 171, 239, 0.75);
}

.app-container.theme-light .content:not(.home-content) :deep(.arco-table-td),
.app-container.theme-light .content:not(.home-content) :deep(.arco-table-th-item),
.app-container.theme-light .content:not(.home-content) :deep(.arco-list-item-meta-title),
.app-container.theme-light .content:not(.home-content) :deep(.arco-link),
.app-container.theme-light .content:not(.home-content) :deep(.arco-tabs-nav-title),
.app-container.theme-light .content:not(.home-content) :deep(.arco-breadcrumb-item .arco-breadcrumb-item-link) {
  color: #103a60 !important;
}

.app-container.theme-light .content:not(.home-content) :deep(.arco-card.arco-card-size-medium) {
  background: linear-gradient(180deg, rgba(239, 248, 255, 0.98), rgba(225, 240, 253, 0.98)) !important;
}

.app-container.theme-light .content:not(.home-content) :deep(.arco-table-td) {
  background: rgba(234, 246, 255, 0.95) !important;
}

.app-container.theme-light .content:not(.home-content) :deep(h1),
.app-container.theme-light .content:not(.home-content) :deep(h2),
.app-container.theme-light .content:not(.home-content) :deep(h3),
.app-container.theme-light .content:not(.home-content) :deep(h4),
.app-container.theme-light .content:not(.home-content) :deep(h5),
.app-container.theme-light .content:not(.home-content) :deep(h6),
.app-container.theme-light .content:not(.home-content) :deep(p),
.app-container.theme-light .content:not(.home-content) :deep(span),
.app-container.theme-light .content:not(.home-content) :deep(label),
.app-container.theme-light .content:not(.home-content) :deep(li),
.app-container.theme-light .content:not(.home-content) :deep(td),
.app-container.theme-light .content:not(.home-content) :deep(th),
.app-container.theme-light .content:not(.home-content) :deep(strong),
.app-container.theme-light .content:not(.home-content) :deep(em) {
  color: #123f66;
}

.app-container.theme-light .content:not(.home-content) :deep(.arco-btn-text),
.app-container.theme-light .content:not(.home-content) :deep(.arco-link) {
  color: #0f3d63 !important;
}

.app-container.theme-light .content:not(.home-content) :deep(.arco-form-item-label),
.app-container.theme-light .content:not(.home-content) :deep(.arco-form-item-message),
.app-container.theme-light .content:not(.home-content) :deep(.arco-descriptions-item-label),
.app-container.theme-light .content:not(.home-content) :deep(.arco-descriptions-item-value),
.app-container.theme-light .content:not(.home-content) :deep(.arco-list-item-meta-title),
.app-container.theme-light .content:not(.home-content) :deep(.arco-list-item-meta-description),
.app-container.theme-light .content:not(.home-content) :deep(.arco-statistic-title),
.app-container.theme-light .content:not(.home-content) :deep(.arco-statistic-content),
.app-container.theme-light .content:not(.home-content) :deep(.arco-empty-description) {
  color: #103a60 !important;
}

.app-container.theme-light .content:not(.home-content) :deep(.arco-radio-group-button) {
  background: rgba(219, 236, 252, 0.86) !important;
  border-color: rgba(70, 136, 192, 0.34) !important;
}

.app-container.theme-light .content:not(.home-content) :deep(.arco-radio-button) {
  color: #123f66 !important;
  border-color: rgba(70, 136, 192, 0.3) !important;
  background: transparent !important;
}

.app-container.theme-light .content:not(.home-content) :deep(.arco-radio-button:hover) {
  color: #0f3d63 !important;
  background: rgba(115, 176, 228, 0.16) !important;
}

.app-container.theme-light .content:not(.home-content) :deep(.arco-radio-button.arco-radio-button-checked),
.app-container.theme-light .content:not(.home-content) :deep(.arco-radio-button.arco-radio-button-checked:hover) {
  color: #0a2f4d !important;
  background: linear-gradient(180deg, rgba(152, 206, 246, 0.9), rgba(123, 188, 236, 0.9)) !important;
  border-color: rgba(52, 123, 180, 0.56) !important;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.55);
}

/* 浅色模式全局对比度安全网：修复各页低对比场景 */
.app-container.theme-light .content:not(.home-content) :deep(.hero-bottom-bar) {
  background: linear-gradient(to top, rgba(8, 46, 80, 0.82) 0%, rgba(8, 46, 80, 0.48) 58%, rgba(8, 46, 80, 0.14) 100%) !important;
  border-top: 1px solid rgba(181, 226, 255, 0.32) !important;
}

.app-container.theme-light .content:not(.home-content) :deep(.hero-bottom-bar .hero-stat-number),
.app-container.theme-light .content:not(.home-content) :deep(.hero-bottom-bar .hero-stat-label),
.app-container.theme-light .content:not(.home-content) :deep(.hero-bottom-bar .feature-title),
.app-container.theme-light .content:not(.home-content) :deep(.hero-bottom-bar .feature-desc) {
  color: #e8f8ff !important;
  text-shadow: 0 1px 4px rgba(4, 24, 43, 0.55) !important;
}

.app-container.theme-light .content:not(.home-content) :deep(.detail-panel) {
  background: linear-gradient(180deg, rgba(240, 249, 255, 1), rgba(214, 233, 249, 1)) !important;
  border-color: rgba(52, 123, 180, 0.45) !important;
}

.app-container.theme-light .content:not(.home-content) :deep(.detail-panel .panel-title),
.app-container.theme-light .content:not(.home-content) :deep(.detail-panel .history-title),
.app-container.theme-light .content:not(.home-content) :deep(.detail-panel .event-main),
.app-container.theme-light .content:not(.home-content) :deep(.detail-panel .event-sub),
.app-container.theme-light .content:not(.home-content) :deep(.detail-panel .history-empty),
.app-container.theme-light .content:not(.home-content) :deep(.detail-panel .empty-tip),
.app-container.theme-light .content:not(.home-content) :deep(.detail-panel .detail-item),
.app-container.theme-light .content:not(.home-content) :deep(.detail-panel .label),
.app-container.theme-light .content:not(.home-content) :deep(.detail-panel .value),
.app-container.theme-light .content:not(.home-content) :deep(.detail-panel span) {
  color: #0f3658 !important;
}

.app-container.theme-light .content:not(.home-content) :deep(.kpi-item),
.app-container.theme-light .content:not(.home-content) :deep(.kpi-card) {
  background: linear-gradient(180deg, #f4f9ff, #dcecff) !important;
  border-color: rgba(74, 138, 196, 0.56) !important;
}

.app-container.theme-light .content:not(.home-content) :deep(.kpi-label),
.app-container.theme-light .content:not(.home-content) :deep(.kpi-hint),
.app-container.theme-light .content:not(.home-content) :deep(.kpi-value),
.app-container.theme-light .content:not(.home-content) :deep(.chart-extra),
.app-container.theme-light .content:not(.home-content) :deep(.map-note),
.app-container.theme-light .content:not(.home-content) :deep(.ai-assessment),
.app-container.theme-light .content:not(.home-content) :deep(.ai-loading-text),
.app-container.theme-light .content:not(.home-content) :deep(.ai-empty-text),
.app-container.theme-light .content:not(.home-content) :deep(.ai-report),
.app-container.theme-light .content:not(.home-content) :deep(.ai-report-content) {
  color: #0f3658 !important;
}

.app-container.theme-light .content:not(.home-content) :deep(.kpi-label),
.app-container.theme-light .content:not(.home-content) :deep(.kpi-hint) {
  background: rgba(226, 241, 253, 0.92) !important;
  border: 1px solid rgba(96, 153, 205, 0.35) !important;
  border-radius: 6px;
  padding: 2px 8px;
}

.app-container.theme-light .content:not(.home-content) :deep(.filter-section),
.app-container.theme-light .content:not(.home-content) :deep(.content-card) {
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
  .nav-secondary-direct {
    display: none;
  }

  .more-nav {
    display: block;
  }

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
    width: 100% !important;
    margin-right: 0 !important;
    margin-left: 0 !important;
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


/* ===== 首页视觉稿顶部导航（第二轮） ===== */
.header {
  height: 86px !important;
  min-height: 86px;
  display: grid !important;
  grid-template-columns: 240px minmax(0, 1fr) auto !important;
  align-items: center;
  gap: 20px !important;
  padding: 0 42px !important;
  overflow: visible;
  background: rgba(2, 9, 22, 0.97) !important;
  border-bottom: 1px solid rgba(86, 148, 191, 0.22) !important;
  backdrop-filter: none !important;
  box-shadow: none !important;
  position: sticky;
  top: 0;
  z-index: 100;
}

.brand {
  appearance: none;
  display: block !important;
  width: max-content;
  padding: 0 !important;
  border: 0;
  color: transparent !important;
  font-family: "Microsoft YaHei UI", "PingFang SC", "Source Han Sans SC", sans-serif;
  font-size: clamp(31px, 1.78vw, 36px) !important;
  font-weight: 900 !important;
  font-style: normal;
  line-height: 1;
  letter-spacing: 1px !important;
  cursor: pointer;
  background: linear-gradient(180deg, #42efff 0%, #00c9f5 48%, #078edb 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 8px rgba(29, 215, 255, 0.28);
  transform: skewX(-8deg);
  transform-origin: left center;
}

.top-nav {
  display: flex;
  min-width: 0;
  height: 100%;
  align-items: center;
  justify-content: flex-start;
  gap: clamp(18px, 1.55vw, 30px);
  white-space: nowrap;
}

.nav-link {
  position: relative;
  appearance: none;
  height: 100%;
  padding: 2px 0 0;
  border: 0;
  border-radius: 0;
  color: rgba(255, 255, 255, 0.88);
  font-family: "Microsoft YaHei UI", "PingFang SC", sans-serif;
  font-size: clamp(16px, 0.98vw, 19px);
  font-weight: 600;
  line-height: 86px;
  letter-spacing: 0.01em;
  cursor: pointer;
  background: transparent;
  transition: color 0.18s ease, text-shadow 0.18s ease;
}

.nav-link::after {
  position: absolute;
  right: 50%;
  bottom: 0;
  width: 0;
  height: 2px;
  content: '';
  background: #20e6ff;
  box-shadow: 0 0 8px rgba(32, 230, 255, 0.6);
  transform: translateX(50%);
  transition: width 0.18s ease;
}

.nav-link:hover,
.nav-link:focus-visible,
.nav-link--active {
  outline: none;
  color: #26e9ff;
  text-shadow: 0 0 9px rgba(38, 233, 255, 0.2);
  background: transparent;
}

.nav-link--active::after {
  width: 40px;
}

.nav-secondary-direct {
  display: inline-flex;
}

.more-nav {
  position: relative;
  display: none;
  height: 100%;
}

.more-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.nav-chevron,
.account-chevron {
  display: inline-block;
  font-size: 17px;
  font-weight: 400;
  transition: transform 0.18s ease;
}

.nav-chevron--open,
.account-chevron--open {
  transform: rotate(180deg);
}

.more-menu,
.account-menu {
  position: absolute;
  z-index: 180;
  padding: 8px;
  border: 1px solid rgba(84, 176, 226, 0.28);
  background: rgba(3, 15, 32, 0.97);
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.42);
}

.more-menu {
  top: 72px;
  left: 50%;
  min-width: 168px;
  transform: translateX(-50%);
}

.more-menu-item,
.account-menu-item {
  appearance: none;
  width: 100%;
  border: 0;
  color: rgba(236, 247, 255, 0.88);
  text-align: left;
  cursor: pointer;
  background: transparent;
}

.more-menu-item {
  padding: 11px 14px;
  font-size: 15px;
  border-radius: 2px;
}

.more-menu-item:hover,
.more-menu-item:focus-visible,
.more-menu-item--active {
  outline: none;
  color: #4deaff;
  background: rgba(28, 153, 207, 0.12);
}

.account-slot {
  position: relative;
  z-index: 160;
  justify-self: end;
}

.account-slot--hero {
  position: fixed;
  top: 122px;
  right: 38px;
}

.account-trigger {
  appearance: none;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 6px 2px;
  border: 0;
  color: rgba(244, 249, 253, 0.9);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  background: transparent;
  text-shadow: 0 1px 5px rgba(0, 0, 0, 0.7);
}

.account-trigger:hover,
.account-trigger:focus-visible {
  outline: none;
  color: #fff;
}

.account-icon {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border: 1px solid rgba(76, 191, 255, 0.48);
  border-radius: 50%;
  background: rgba(13, 77, 142, 0.48);
  box-shadow: inset 0 0 12px rgba(48, 178, 255, 0.16);
}

.account-icon svg {
  width: 17px;
  height: 17px;
  fill: rgba(249, 252, 255, 0.92);
  stroke: rgba(249, 252, 255, 0.92);
  stroke-width: 1.45;
  stroke-linecap: round;
  fill-rule: evenodd;
}

.account-menu {
  top: calc(100% + 10px);
  right: 0;
  width: 236px;
}

.account-profile {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px 11px 12px;
}

.account-profile strong {
  color: #f4fbff;
  font-size: 15px;
}

.account-profile span {
  color: rgba(183, 210, 228, 0.72);
  font-size: 12px;
}

.account-menu-separator {
  height: 1px;
  margin: 0 8px 5px;
  background: rgba(94, 171, 216, 0.17);
}

.account-data-scope {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 11px;
  color: rgba(180, 210, 231, 0.72);
  font-size: 12px;
}

.account-data-scope strong {
  color: #71dcff;
  font-weight: 600;
}

.account-menu-item {
  padding: 10px 11px;
  border-radius: 2px;
  font-size: 13px;
}

.account-menu-item:hover,
.account-menu-item:focus-visible {
  outline: none;
  color: #52e7ff;
  background: rgba(27, 154, 209, 0.12);
}

.account-menu-item--danger:hover,
.account-menu-item--danger:focus-visible {
  color: #ffaaa6;
  background: rgba(208, 76, 68, 0.11);
}

.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
}

.content.home-content {
  padding: 0 !important;
  overflow: visible !important;
  background: #020914 !important;
}

/* 首页视觉稿始终保持深色，不让浅色模式的全局安全样式覆盖首页设计字色。 */
.app-container.theme-light .content.home-content :deep(.hero-kicker),
.app-container.theme-light .content.home-content :deep(.hero-title) {
  color: #f8fbff !important;
}

.app-container.theme-light .content.home-content :deep(.hero-subtitle) {
  color: rgba(238, 244, 249, 0.88) !important;
}

.app-container.theme-light .content.home-content :deep(.feature-copy strong) {
  color: #123f60 !important;
}

.app-container.theme-light .content.home-content :deep(.feature-copy small) {
  color: #557084 !important;
}

.app-container.theme-light .content.home-content :deep(.feature-arrow) {
  color: #b27a28 !important;
}


/* ===== 浅色模式顶部导航：真正使用亮色外壳，避免深色字压在深色背景上 ===== */
.app-container.theme-light .content.home-content {
  background: #eef7ff !important;
}

.app-container.theme-light .header {
  background: rgba(239, 248, 255, 0.98) !important;
  border-bottom-color: rgba(51, 139, 193, 0.30) !important;
  box-shadow: 0 7px 20px rgba(32, 100, 147, 0.10) !important;
}

.app-container.theme-light .brand {
  color: transparent !important;
  background: linear-gradient(180deg, #16cde7 0%, #0799c6 50%, #0873ad 100%) !important;
  -webkit-background-clip: text !important;
  background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  text-shadow: 0 2px 7px rgba(6, 122, 167, 0.18) !important;
}

.app-container.theme-light .nav-link,
.app-container.theme-light .more-trigger {
  color: #234b69 !important;
  text-shadow: none !important;
}

.app-container.theme-light .nav-link:hover,
.app-container.theme-light .nav-link:focus-visible,
.app-container.theme-light .nav-link--active {
  color: #008bb5 !important;
  text-shadow: 0 0 8px rgba(0, 167, 204, 0.18) !important;
}

.app-container.theme-light .nav-link::after {
  background: #06bfd9 !important;
  box-shadow: 0 0 8px rgba(6, 191, 217, 0.42) !important;
}

/* 首页右上用户信息位于深色主视觉上，浅色模式下给它独立的浅色玻璃底。 */
.app-container.theme-light .account-slot--hero .account-trigger {
  padding: 7px 11px !important;
  border: 1px solid rgba(132, 209, 235, 0.58) !important;
  border-radius: 18px !important;
  color: #123f60 !important;
  background: rgba(240, 250, 255, 0.90) !important;
  box-shadow: 0 5px 16px rgba(7, 37, 63, 0.14) !important;
  text-shadow: none !important;
}

.app-container.theme-light .account-slot--hero .account-trigger:hover,
.app-container.theme-light .account-slot--hero .account-trigger:focus-visible {
  color: #075f84 !important;
  background: rgba(248, 253, 255, 0.96) !important;
}

.app-container.theme-light .account-slot:not(.account-slot--hero) .account-trigger {
  color: #234b69 !important;
  text-shadow: none !important;
}

.app-container.theme-light .account-icon {
  border-color: rgba(25, 151, 201, 0.60) !important;
  background: linear-gradient(180deg, #2db7d7, #1688bd) !important;
}

.app-container.theme-light .more-menu,
.app-container.theme-light .account-menu {
  border-color: rgba(69, 145, 192, 0.30) !important;
  background: rgba(247, 252, 255, 0.99) !important;
  box-shadow: 0 18px 38px rgba(37, 91, 126, 0.18) !important;
}

.app-container.theme-light .more-menu-item,
.app-container.theme-light .account-menu-item,
.app-container.theme-light .account-profile strong {
  color: #173f5f !important;
}

.app-container.theme-light .more-menu-item:hover,
.app-container.theme-light .more-menu-item:focus-visible,
.app-container.theme-light .more-menu-item--active,
.app-container.theme-light .account-menu-item:hover,
.app-container.theme-light .account-menu-item:focus-visible {
  color: #007fa8 !important;
  background: rgba(32, 166, 205, 0.10) !important;
}

.app-container.theme-light .account-profile span,
.app-container.theme-light .account-data-scope {
  color: #59778d !important;
}

.app-container.theme-light .account-data-scope strong {
  color: #0785ad !important;
}

/* home.vue 自己负责首页浅色态；这里阻止通用浅色规则把首页文字改成深蓝。 */
.app-container.theme-light .content.home-content :deep(.home-page),
.app-container.theme-light .content.home-content :deep(.home-page p),
.app-container.theme-light .content.home-content :deep(.home-page span),
.app-container.theme-light .content.home-content :deep(.home-page strong),
.app-container.theme-light .content.home-content :deep(.home-page small) {
  color: inherit;
}

.app-container.theme-light .content.home-content :deep(.hero-kicker),
.app-container.theme-light .content.home-content :deep(.hero-title) {
  color: #ffffff !important;
}

.app-container.theme-light .content.home-content :deep(.hero-subtitle) {
  color: rgba(246, 252, 255, 0.96) !important;
}

.app-container.theme-light .content.home-content :deep(.feature-copy strong) {
  color: #123f60 !important;
}

.app-container.theme-light .content.home-content :deep(.feature-copy small) {
  color: #557084 !important;
}

@media (max-width: 1500px) {
  .header {
    grid-template-columns: 205px minmax(0, 1fr) auto !important;
    gap: 14px !important;
    padding: 0 28px !important;
  }

  .brand {
    font-size: 30px !important;
  }

  .top-nav {
    gap: 18px;
  }

  .nav-link {
    font-size: 16px;
  }

  .account-org {
    max-width: 190px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}

@media (max-width: 1180px) {
  .header {
    grid-template-columns: 172px minmax(0, 1fr) auto !important;
    padding: 0 18px !important;
  }

  .brand {
    font-size: 25px !important;
  }

  .top-nav {
    gap: 14px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .top-nav::-webkit-scrollbar {
    display: none;
  }

  .nav-link {
    flex: 0 0 auto;
    font-size: 14px;
  }

  .account-slot:not(.account-slot--hero) .account-org {
    display: none;
  }
}

@media (max-width: 768px) {
  .nav-secondary-direct {
    display: none;
  }

  .more-nav {
    display: block;
  }

  .header {
    height: 68px !important;
    min-height: 68px;
    display: grid !important;
    grid-template-columns: 126px minmax(0, 1fr) auto !important;
    gap: 8px !important;
    padding: 0 10px !important;
    flex-direction: initial !important;
  }

  .brand {
    justify-content: initial !important;
    font-size: 21px !important;
    text-align: left !important;
  }

  .top-nav {
    justify-content: flex-start;
    gap: 12px;
  }

  .nav-link {
    font-size: 13px;
    line-height: 68px;
  }

  .more-menu {
    top: 58px;
  }

  .account-slot {
    display: block !important;
  }

  .account-slot--hero {
    top: 86px;
    right: 16px;
  }

  .account-slot--hero .account-org,
  .account-slot:not(.account-slot--hero) .account-org {
    display: none;
  }

  .content.home-content {
    padding: 0 !important;
  }
}

</style>
