<template>
  <div class="page-contrast" :class="{ 'theme-light': themeMode === 'light' }">
    <BackHome />
    <a-page-header title="预警条目" subtitle="Priority Alerts &amp; Human Review" />

    <p class="data-hint">预警条目与首页、风险分析和政治安全模块共用同一案件数据。离线智能研判只提供风险提示，由检察官完成最终复核。</p>

    <a-row :gutter="16" class="stat-row">
      <a-col :span="6">
        <a-card :bordered="false" class="stat-card stat-card--red">
          <div class="stat-label">当前标签预警</div><div class="stat-value">{{ currentAlerts.length }}</div><div class="stat-sub">同源案件数据</div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false" class="stat-card stat-card--gold">
          <div class="stat-label">高风险</div><div class="stat-value">{{ highCount }}</div><div class="stat-sub">需优先研判</div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false" class="stat-card stat-card--green">
          <div class="stat-label">已复核</div><div class="stat-value stat-ok">{{ reviewedCount }}</div><div class="stat-sub">人工已确认</div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false" class="stat-card stat-card--orange">
          <div class="stat-label">待人工复核</div><div class="stat-value stat-warn">{{ pendingCount }}</div><div class="stat-sub">AI 不作最终判断</div>
        </a-card>
      </a-col>
    </a-row>

    <a-card title="预警条目" :bordered="false" class="task-card">
      <PriorityTopicTabs v-model="selectedTag" :alerts="alerts" compact />
      <PriorityAlertList :alerts="alerts" :tag="selectedTag" compact :limit="20" />
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import BackHome from '../components/back-home.vue'
import PriorityAlertList from '../components/priority-alert-list.vue'
import PriorityTopicTabs from '../components/priority-topic-tabs.vue'
import { fetchPriorityAlerts } from '../api/platform'
import { PRIORITY_TAGS, type PriorityAlert, type PriorityTag } from '../features/priority-alerts'
const alerts = ref<PriorityAlert[]>([])
const selectedTag = ref<PriorityTag>(PRIORITY_TAGS[0])
const currentAlerts = computed(() => alerts.value.filter(item => item.tags.includes(selectedTag.value)))
const highCount = computed(() => currentAlerts.value.filter(item => item.riskLevel === '高').length)
const reviewedCount = computed(() => currentAlerts.value.filter(item => item.alertStatus === '已复核').length)
const pendingCount = computed(() => currentAlerts.value.filter(item => item.alertStatus === '待人工复核').length)

// ---------- 主题检测（与之前项目风格一致） ----------
const isLightTheme = () => localStorage.getItem('platform:theme-mode') === 'light'
const themeMode = ref<'light' | 'dark'>(isLightTheme() ? 'light' : 'dark')

const updateTheme = () => {
  themeMode.value = isLightTheme() ? 'light' : 'dark'
}

let themeObserver: MutationObserver | null = null

const handleStorageChange = (e: StorageEvent) => {
  if (e.key === 'platform:theme-mode') {
    updateTheme()
  }
}

const setupThemeObserver = () => {
  themeObserver = new MutationObserver(() => {
    updateTheme()
  })
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] })
}

onMounted(async () => {
  alerts.value = await fetchPriorityAlerts()

  // 初始化主题
  updateTheme()
  window.addEventListener('storage', handleStorageChange)
  setupThemeObserver()
})

onUnmounted(() => {
  window.removeEventListener('storage', handleStorageChange)
  themeObserver?.disconnect()
})
</script>

<style scoped>
/* ===== 基础深色样式（默认） ===== */
.page-contrast :deep(.arco-page-header-title) {
  color: #eff9ff;
  font-weight: 600;
}
.page-contrast :deep(.arco-page-header-sub-title) {
  color: #bde7ff;
  font-size: 14px;
}

.data-hint {
  margin-top: 12px;
  margin-bottom: 0;
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.65;
  color: #c8e8ff;
  background: rgba(13, 35, 66, 0.45);
  border: 1px solid rgba(98, 189, 255, 0.2);
  border-radius: 8px;
}

.stat-row {
  margin-top: 14px;
}

.stat-card {
  --stat-accent: #64d8ff;
  position: relative;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--stat-accent) 42%, transparent) !important;
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--stat-accent) 14%, transparent), transparent 52%),
    linear-gradient(180deg, rgba(14, 39, 65, 0.82), rgba(7, 23, 40, 0.9)) !important;
  box-shadow:
    inset 0 0 24px color-mix(in srgb, var(--stat-accent) 7%, transparent),
    0 14px 26px rgba(0, 0, 0, 0.18) !important;
}

.stat-card::before {
  position: absolute;
  inset: 0 16px auto;
  height: 2px;
  content: '';
  pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--stat-accent), #eef2ee, var(--stat-accent), transparent);
  box-shadow: 0 0 13px color-mix(in srgb, var(--stat-accent) 62%, transparent);
}

.stat-card::after {
  position: absolute;
  inset: auto -18px -34px auto;
  width: 96px;
  height: 96px;
  content: '';
  pointer-events: none;
  border: 1px solid color-mix(in srgb, var(--stat-accent) 28%, transparent);
  border-radius: 50%;
  box-shadow: inset 0 0 24px color-mix(in srgb, var(--stat-accent) 8%, transparent);
  opacity: 0.58;
}

.stat-card--red { --stat-accent: #ff726b; }
.stat-card--gold { --stat-accent: #f2c86f; }
.stat-card--green { --stat-accent: #59dfa7; }
.stat-card--orange { --stat-accent: #ff9b52; }

.stat-label {
  font-size: 18px;
  color: color-mix(in srgb, var(--stat-accent) 72%, #d9edf4);
  margin-bottom: 14px;
  text-align: center;
  font-weight: 700;
}

.stat-value {
  font-size: 38px;
  font-weight: 700;
  color: var(--stat-accent);
  text-align: center;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 17px color-mix(in srgb, var(--stat-accent) 52%, transparent);
}

.stat-value.stat-ok {
  color: var(--stat-accent);
}

.stat-value.stat-warn {
  color: var(--stat-accent);
}

.stat-sub {
  margin-top: 8px;
  font-size: 14px;
  color: color-mix(in srgb, var(--stat-accent) 58%, #89aab9);
  text-align: center;
}

.task-card {
  position: relative;
  margin-top: 16px;
  overflow: hidden;
}

.task-card::before {
  position: absolute;
  inset: 0 0 auto;
  z-index: 2;
  height: 2px;
  content: '';
  pointer-events: none;
  background: linear-gradient(90deg, transparent, #64d8ff, #edf2ef, #f2c86f, transparent);
  box-shadow: 0 0 14px rgba(100, 216, 255, 0.48);
}

.task-card :deep(.arco-card-body) { padding-top: 8px; }

.task-tab-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.task-tab-label i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #64d8ff;
  box-shadow: 0 0 9px rgba(100, 216, 255, 0.74);
}

.task-tab-label--political i {
  background: #ff756c;
  box-shadow: 0 0 9px rgba(255, 117, 108, 0.74);
}

.task-table {
  border-top: 1px solid rgba(100, 206, 248, 0.2);
  box-shadow: inset 0 8px 20px rgba(43, 171, 221, 0.035);
}

.task-table--political {
  border-top-color: rgba(255, 117, 108, 0.28);
  box-shadow: inset 0 8px 20px rgba(255, 117, 108, 0.04);
}

.task-table--regular :deep(.arco-table-th:first-child) {
  box-shadow: inset 3px 0 0 rgba(100, 216, 255, 0.68);
}

.task-table--political :deep(.arco-table-th:first-child) {
  box-shadow: inset 3px 0 0 rgba(255, 117, 108, 0.72);
}

/* 标签页样式 */
.page-contrast :deep(.arco-tabs-nav-tab) {
  margin-bottom: 8px;
}
.page-contrast :deep(.arco-tabs-tab-title) {
  color: #bde7ff;
  font-size: 16px;
}
.page-contrast :deep(.arco-tabs-tab-active .arco-tabs-tab-title) {
  color: #eff9ff;
  font-weight: 600;
}
.page-contrast :deep(.arco-tabs-nav-ink) {
  background-color: #43c5f0;
}

/* 表格样式 */
.page-contrast :deep(.arco-table-th-item) {
  color: #dbf2ff;
  font-size: 18px;
  font-weight: 700;
}
.page-contrast :deep(.arco-table-td) {
  color: #dbf2ff;
  font-size: 16px;
}

.page-contrast :deep(.arco-table-tr .arco-table-th) {
  background: rgba(13, 35, 66, 0.95);
}
.page-contrast :deep(.arco-table-container),
.page-contrast :deep(.arco-table-element),
.page-contrast :deep(.arco-table-tr),
.page-contrast :deep(.arco-table-td) {
  background: rgba(8, 23, 44, 0.92) !important;
}
.page-contrast :deep(.arco-table .arco-table-th),
.page-contrast :deep(.arco-table .arco-table-td) {
  border-color: rgba(110, 196, 255, 0.2);
}

/* 卡片与 Alert */
.page-contrast :deep(.arco-card) {
  border: 1px solid rgba(93, 191, 255, 0.22);
  background: linear-gradient(180deg, rgba(14, 39, 78, 0.78), rgba(9, 24, 47, 0.86));
}
.page-contrast :deep(.arco-card-header-title) {
  color: #eff9ff;
  font-size: 18px;
  font-weight: 600;
}
.page-contrast :deep(.arco-alert) {
  background: rgba(13, 30, 56, 0.8);
  border-color: rgba(108, 201, 255, 0.28);
}
.page-contrast :deep(.arco-alert-content) {
  color: #d8f2ff;
  font-size: 14px;
}

/* ===== 浅色主题覆盖（通过 body.theme-light 或组件级类 .theme-light） ===== */
:global(body.theme-light) .page-contrast :deep(.arco-page-header-title),
.page-contrast.theme-light :deep(.arco-page-header-title) {
  color: #0a2f4d !important;
}
:global(body.theme-light) .page-contrast :deep(.arco-page-header-sub-title),
.page-contrast.theme-light :deep(.arco-page-header-sub-title) {
  color: #1f5a85 !important;
}

:global(body.theme-light) .page-contrast .data-hint,
.page-contrast.theme-light .data-hint {
  color: #0e4f84 !important;
  background: rgba(221, 239, 255, 0.92) !important;
  border-color: rgba(70, 136, 192, 0.35) !important;
}

:global(body.theme-light) .page-contrast .stat-card,
:global(body.theme-light) .page-contrast :deep(.arco-card),
.page-contrast.theme-light .stat-card,
.page-contrast.theme-light :deep(.arco-card) {
  background: rgba(235, 246, 255, 0.92) !important;
  border-color: rgba(74, 140, 198, 0.28) !important;
}

:global(body.theme-light) .page-contrast .stat-card,
.page-contrast.theme-light .stat-card {
  border-color: color-mix(in srgb, var(--stat-accent) 46%, transparent) !important;
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--stat-accent) 17%, transparent), transparent 52%),
    rgba(235, 246, 251, 0.94) !important;
  box-shadow: inset 0 0 20px color-mix(in srgb, var(--stat-accent) 7%, transparent), 0 10px 20px rgba(48, 86, 104, 0.12) !important;
}

:global(body.theme-light) .page-contrast .stat-label,
.page-contrast.theme-light .stat-label {
  color: color-mix(in srgb, var(--stat-accent) 70%, #21465b) !important;
}
:global(body.theme-light) .page-contrast .stat-value,
.page-contrast.theme-light .stat-value {
  color: color-mix(in srgb, var(--stat-accent) 76%, #173f55) !important;
  text-shadow: none;
}
:global(body.theme-light) .page-contrast .stat-value.stat-ok,
.page-contrast.theme-light .stat-value.stat-ok {
  color: color-mix(in srgb, var(--stat-accent) 76%, #173f55) !important;
}
:global(body.theme-light) .page-contrast .stat-value.stat-warn,
.page-contrast.theme-light .stat-value.stat-warn {
  color: color-mix(in srgb, var(--stat-accent) 76%, #173f55) !important;
}
:global(body.theme-light) .page-contrast .stat-sub,
.page-contrast.theme-light .stat-sub {
  color: color-mix(in srgb, var(--stat-accent) 58%, #47687a) !important;
}

:global(body.theme-light) .page-contrast .task-table,
.page-contrast.theme-light .task-table {
  border-top-color: rgba(32, 117, 158, 0.25);
  box-shadow: inset 0 8px 18px rgba(39, 124, 163, 0.04);
}

:global(body.theme-light) .page-contrast .task-table--political,
.page-contrast.theme-light .task-table--political {
  border-top-color: rgba(189, 68, 61, 0.27);
  box-shadow: inset 0 8px 18px rgba(189, 68, 61, 0.04);
}

/* 标签页浅色 */
:global(body.theme-light) .page-contrast :deep(.arco-tabs-tab-title),
.page-contrast.theme-light :deep(.arco-tabs-tab-title) {
  color: #1f5a85 !important;
}
:global(body.theme-light) .page-contrast :deep(.arco-tabs-tab-active .arco-tabs-tab-title),
.page-contrast.theme-light :deep(.arco-tabs-tab-active .arco-tabs-tab-title) {
  color: #0a2f4d !important;
}
:global(body.theme-light) .page-contrast :deep(.arco-tabs-nav-ink),
.page-contrast.theme-light :deep(.arco-tabs-nav-ink) {
  background-color: #1a4f7b !important;
}

/* 表格浅色 */
:global(body.theme-light) .page-contrast :deep(.arco-table-th-item),
.page-contrast.theme-light :deep(.arco-table-th-item) {
  color: #0a2f4d !important;
}
:global(body.theme-light) .page-contrast :deep(.arco-table-td),
.page-contrast.theme-light :deep(.arco-table-td) {
  color: #103a60 !important;
}
:global(body.theme-light) .page-contrast :deep(.arco-table-tr .arco-table-th),
.page-contrast.theme-light :deep(.arco-table-tr .arco-table-th) {
  background: rgba(196, 224, 247, 0.94) !important;
}
:global(body.theme-light) .page-contrast :deep(.arco-table-container),
:global(body.theme-light) .page-contrast :deep(.arco-table-element),
:global(body.theme-light) .page-contrast :deep(.arco-table-tr),
:global(body.theme-light) .page-contrast :deep(.arco-table-td),
.page-contrast.theme-light :deep(.arco-table-container),
.page-contrast.theme-light :deep(.arco-table-element),
.page-contrast.theme-light :deep(.arco-table-tr),
.page-contrast.theme-light :deep(.arco-table-td) {
  background: rgba(235, 246, 255, 0.92) !important;
  border-color: rgba(70, 136, 192, 0.26) !important;
}

/* Alert 浅色 */
:global(body.theme-light) .page-contrast :deep(.arco-alert),
.page-contrast.theme-light :deep(.arco-alert) {
  background: rgba(235, 246, 255, 0.92) !important;
  border-color: rgba(74, 140, 198, 0.35) !important;
}
:global(body.theme-light) .page-contrast :deep(.arco-alert-content),
.page-contrast.theme-light :deep(.arco-alert-content) {
  color: #0e4f84 !important;
}

/* 卡片标题浅色 */
:global(body.theme-light) .page-contrast :deep(.arco-card-header-title),
.page-contrast.theme-light :deep(.arco-card-header-title) {
  color: #0a2f4d !important;
}
</style>
