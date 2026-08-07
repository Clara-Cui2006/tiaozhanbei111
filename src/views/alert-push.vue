<template>
  <div class="page-contrast" :class="{ 'theme-light': themeMode === 'light' }">
    <BackHome />
    <a-page-header title="智能预警" subtitle="Intelligent Alert" />

    <p class="data-hint">
      下方「风险预警推送次数」与<strong>风险预警态势盘</strong>总览卡片同源；任务列表为近期推送<strong>示例明细</strong>（条数可与累计口径不同，联调时由后端对齐）。
    </p>

    <a-row :gutter="16" class="stat-row">
      <a-col :span="6">
        <a-card :bordered="false" class="stat-card">
          <div class="stat-label">风险预警推送次数</div>
          <div class="stat-value">{{ overview.riskAlertPushCount }}</div>
          <div class="stat-sub">态势盘总览</div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false" class="stat-card">
          <div class="stat-label">本页任务条数</div>
          <div class="stat-value">{{ tasks.length }}</div>
          <div class="stat-sub">列表示例</div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false" class="stat-card">
          <div class="stat-label">已发送</div>
          <div class="stat-value stat-ok">{{ sentCount }}</div>
          <div class="stat-sub">当前列表</div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false" class="stat-card">
          <div class="stat-label">待发送</div>
          <div class="stat-value stat-warn">{{ pendingCount }}</div>
          <div class="stat-sub">当前列表</div>
        </a-card>
      </a-col>
    </a-row>

    <a-alert
      :type="socketConnected ? 'success' : 'info'"
      :content="socketConnected ? 'WebSocket 已连接，正在接收实时推送回执。' : 'WebSocket 接口已预留（配置 VITE_WS_URL 后启用）。'"
      style="margin-top: 16px"
    />

    <a-card title="推送任务" :bordered="false" style="margin-top: 16px">
      <a-tabs default-active-key="1">
        <a-tab-pane key="1" title="常规预警">
          <a-table :columns="columns" :data="regularTasks" :pagination="false">
            <template #status="{ record }">
              <a-tag :color="record.status === '已发送' ? 'green' : 'orange'">{{ record.status }}</a-tag>
            </template>
          </a-table>
        </a-tab-pane>
        <a-tab-pane key="2" title="政治安全">
          <a-table :columns="columns" :data="politicalTasks" :pagination="false">
            <template #status="{ record }">
              <a-tag :color="record.status === '已发送' ? 'green' : 'orange'">{{ record.status }}</a-tag>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import BackHome from '../components/back-home.vue'
import { fetchDashboardOverview, fetchPushTasks } from '../api/platform'
import { createPlatformSocket } from '../services/platform-socket'
import type { DashboardOverview, PushTask } from '../types/platform'

const columns = [
  { title: '推送主题', dataIndex: 'title' },
  { title: '目标社区', dataIndex: 'community' },
  { title: '渠道', dataIndex: 'channel' },
  { title: '计划时间', dataIndex: 'time' },
  { title: '状态', slotName: 'status' }
]

const tasks = ref<PushTask[]>([])
const overview = ref<DashboardOverview>({
  totalCasesThisYear: 0,
  highIncidenceTypes: '',
  riskAlertPushCount: 0,
  procuratorateSuggestions: 0,
  legalPushCount: 0
})
const socketConnected = ref(false)

// 分类计算属性
const regularTasks = computed(() => tasks.value.filter((t) => t.category !== '政治安全'))
const politicalTasks = computed(() => tasks.value.filter((t) => t.category === '政治安全'))

const sentCount = computed(() => tasks.value.filter((t) => t.status === '已发送').length)
const pendingCount = computed(() => tasks.value.filter((t) => t.status === '待发送').length)

const socket = createPlatformSocket({
  onOpen: () => {
    socketConnected.value = true
  },
  onClose: () => {
    socketConnected.value = false
  },
  onError: () => {
    socketConnected.value = false
  }
})

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
  const [taskList, dash] = await Promise.all([fetchPushTasks(), fetchDashboardOverview()])
  tasks.value = taskList
  overview.value = dash
  socket.connect()

  // 初始化主题
  updateTheme()
  window.addEventListener('storage', handleStorageChange)
  setupThemeObserver()
})

onUnmounted(() => {
  socket.disconnect()
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
  border: 1px solid rgba(93, 191, 255, 0.22) !important;
  background: linear-gradient(180deg, rgba(14, 39, 78, 0.78), rgba(9, 24, 47, 0.86)) !important;
}

.stat-label {
  font-size: 18px;
  color: #45a8d9;
  margin-bottom: 14px;
  text-align: center;
  font-weight: 900;
}

.stat-value {
  font-size: 38px;
  font-weight: 700;
  color: #43c5f0;
  text-align: center;
}

.stat-value.stat-ok {
  color: #58e9b2;
}

.stat-value.stat-warn {
  color: #efa04c;
}

.stat-sub {
  margin-top: 8px;
  font-size: 14px;
  color: #308acb;
  text-align: center;
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

:global(body.theme-light) .page-contrast .stat-label,
.page-contrast.theme-light .stat-label {
  color: #0e4f84 !important;
}
:global(body.theme-light) .page-contrast .stat-value,
.page-contrast.theme-light .stat-value {
  color: #1a4f7b !important;
}
:global(body.theme-light) .page-contrast .stat-value.stat-ok,
.page-contrast.theme-light .stat-value.stat-ok {
  color: #1f6e53 !important;
}
:global(body.theme-light) .page-contrast .stat-value.stat-warn,
.page-contrast.theme-light .stat-value.stat-warn {
  color: #9c6126 !important;
}
:global(body.theme-light) .page-contrast .stat-sub,
.page-contrast.theme-light .stat-sub {
  color: #1a5f8a !important;
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