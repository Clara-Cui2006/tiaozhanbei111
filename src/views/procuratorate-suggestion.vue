<template>
  <div class="page-contrast" :class="{ 'theme-light': themeMode === 'light' }">
    <nav v-if="!focusedPanel" class="duty-entry-strip" aria-label="检察履职重点入口">
      <button v-for="entry in dutyEntries" :key="entry.path" type="button" @click="router.push(entry.path)">
        <span>{{ entry.kicker }}</span>
        <strong>{{ entry.title }}</strong>
        <small>{{ entry.description }}</small>
        <i>进入 →</i>
      </button>
    </nav>

    <a-card v-if="focusedPanel === 'list'" class="content-card compact-filter-card">
      <template #title>
        <div class="card-title">
          <span>检察建议管理</span>
          <a-space>
            <a-button type="primary" @click="handleAddSuggestion">新增建议</a-button>
            <a-button type="primary" status="danger" @click="handleAddPoliticalSuggestion">
              政治安全专属模板
            </a-button>
          </a-space>
        </div>
      </template>

      <div class="filter-section">
        <a-form :model="filterForm" layout="vertical" class="filter-form">
          <a-row :gutter="16">
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item label="建议类型">
                <a-select v-model="filterForm.type" placeholder="请选择类型">
                  <a-option value="all">全部</a-option>
                  <a-option value="刑事检察">刑事检察</a-option>
                  <a-option value="民事检察">民事检察</a-option>
                  <a-option value="行政检察">行政检察</a-option>
                  <a-option value="公益诉讼检察">公益诉讼检察</a-option>
                  <a-option value="政治安全专办">政治安全专办</a-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item label="状态">
                <a-select v-model="filterForm.status" placeholder="请选择状态">
                  <a-option value="all">全部</a-option>
                  <a-option value="待处理">待处理</a-option>
                  <a-option value="处理中">处理中</a-option>
                  <a-option value="已反馈">已反馈</a-option>
                  <a-option value="已驳回">已驳回</a-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item label="建议对象">
                <a-input v-model="filterForm.targetKeyword" placeholder="输入被建议单位或对象关键词" allow-clear />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item label="发布日期">
                <a-range-picker v-model="filterForm.dateRange" style="width: 100%" value-format="YYYY-MM-DD" allow-clear />
              </a-form-item>
            </a-col>
          </a-row>
          <a-row :gutter="16">
            <a-col :xs="24" :sm="16" :md="12">
              <a-form-item label="标题 / 正文关键词">
                <a-input-search v-model="filterForm.keyword" placeholder="检索建议标题或正文内容" allow-clear @search="handleSearch" />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="8" :md="12" class="filter-actions-col">
              <a-form-item label=" ">
                <a-space>
                  <a-button type="primary" @click="handleSearch">查询</a-button>
                  <a-button @click="handleReset">重置</a-button>
                </a-space>
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </div>
    </a-card>

    <div class="procuratorial-cockpit-grid" :class="{ 'procuratorial-cockpit-grid--focused': focusedPanel }">
      <DashboardFocusPanel v-model="focusedPanel" panel-key="analytics" title="检察建议分析" eyebrow="DISTRIBUTION · TREND">
        <a-card title="检察建议类别分布" :bordered="false" class="content-card">
          <div ref="pieChartRef" class="chart-container"></div>
        </a-card>
        <a-card title="近六个月建议数量趋势" :bordered="false" class="content-card">
          <div ref="lineChartRef" class="chart-container"></div>
        </a-card>
      </DashboardFocusPanel>

      <DashboardFocusPanel v-model="focusedPanel" panel-key="list" title="线索复核与履职办理" eyebrow="PROCURATORIAL WORKFLOW" class="suggestion-list-panel">
        <template #default="{ focused }">
        <a-card v-if="focused" title="检察建议列表" :bordered="false" class="content-card">
          <template #extra>
            <a-input-search v-model="filterForm.keyword" class="table-quick-search" placeholder="快速检索标题或正文" allow-clear @search="handleSearch" />
          </template>
          <a-table :columns="columns" :data="filteredSuggestions" :loading="loading" row-key="id" :scroll="{ y: focusedPanel === 'list' ? 430 : 270 }">
            <template #title="{ record }">
              <a-space>
                {{ record.title }}
                <a-tag v-if="record.isPolitical" color="red" size="small">高保密</a-tag>
              </a-space>
            </template>
            <template #statusName="{ record }">
              <span class="status-dot" :class="getStatusClass(record.status)"></span>
              {{ record.status }}
            </template>
            <template #actions="{ record }">
              <a-button size="small" type="primary" @click="handleView(record)">查看</a-button>
              <a-tag v-if="record.builtInReference" color="arcoblue" size="small">基础数据·只读</a-tag>
              <template v-else>
                <a-button size="small" @click="handleEdit(record)">编辑</a-button>
                <a-button size="small" @click="handleIgnore(record)">忽略</a-button>
              </template>
            </template>
          </a-table>
        </a-card>
        <div v-else class="workflow-overview">
          <div class="workflow-rail">
            <article v-for="(step, index) in workflowSteps" :key="step.title">
              <b>{{ index + 1 }}</b><div><strong>{{ step.title }}</strong><span>{{ step.description }}</span></div>
            </article>
          </div>
          <div class="duty-action-grid">
            <article v-for="action in dutyActions" :key="action.title">
              <span>{{ action.kicker }}</span><strong>{{ action.title }}</strong><small>{{ action.description }}</small>
            </article>
          </div>
          <p class="workflow-boundary">AI 仅辅助生成标签、依据与草稿；监督价值确认和履职决定均须人工复核。</p>
        </div>
        </template>
      </DashboardFocusPanel>

      <DashboardFocusPanel v-model="focusedPanel" panel-key="feed" title="办理反馈动态" eyebrow="LIVE FEEDBACK">
        <a-card title="实时动态流" :bordered="false" class="content-card">
          <div class="feed-list">
            <div v-for="item in feedItems" :key="item.time" class="feed-item">
              <span class="feed-time">{{ item.time }}</span>
              <span class="feed-content">{{ item.content }}</span>
            </div>
          </div>
        </a-card>
      </DashboardFocusPanel>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, onActivated, nextTick, watch } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'
import DashboardFocusPanel from '../components/dashboard-focus-panel.vue'
import {
  fetchProcuratorateSuggestions,
  fetchProcuratorateFeed,
  fetchProcuratorateMonthlyTrend,
  fetchProcuratorateCategoryDistribution,
  ignoreProcuratorateSuggestion
} from '../api/platform'
import type { ProcuratorateSuggestion, ProcuratorateFeedItem, ProcuratorateMonthlyTrend } from '../types/platform'
import {
  CHART_PALETTES,
  areaGradient,
  buildPieDepthLayers,
  chartAxis,
  chartTooltip,
  raisedPieStyle,
  rgbaHex,
  shadeHex,
  type ChartDatum
} from '../utils/chart-visual'

const router = useRouter()
const route = useRoute()
const isLightTheme = () => localStorage.getItem('platform:theme-mode') === 'light'
const themeMode = ref<'light' | 'dark'>(isLightTheme() ? 'light' : 'dark')
const focusedPanel = ref('')
const focusKeys = new Set(['analytics', 'list', 'feed'])
const dutyEntries = [
  { kicker: 'MONTHLY BRIEFING', title: '检察业务月报', description: '归集业务数据，生成待审核月报草稿', path: '/procuratorate-suggestion/monthly-report' },
  { kicker: 'RISK ALERT', title: '预警推送', description: '查看预警强度与人工复核状态', path: '/alert-push' },
  { kicker: 'TARGETED LEGALITY', title: '靶向普法', description: '查看普法方案、投放对象与执行进度', path: '/legal-recommend' },
  { kicker: 'FEEDBACK', title: '办理反馈', description: '查看履职办理结果与效果观察', path: '/effect-stats' }
]
const workflowSteps = [
  { title: '线索筛查', description: '汇聚各板块转入的待研判事项' },
  { title: '人工复核', description: '核验原始材料、关联记录与研判依据' },
  { title: '履职办理', description: '按事项性质选择相应检察履职方式' },
  { title: '跟踪评估', description: '回写办理反馈并观察同类风险变化' }
]
const dutyActions = [
  { kicker: 'REVIEW', title: '人工复核', description: '确认、排除或继续核查' },
  { kicker: 'ALERT', title: '预警推送', description: '按权限推送待关注事项' },
  { kicker: 'SUGGESTION', title: '检察建议', description: '形成待审核建议材料' },
  { kicker: 'LEGALITY', title: '靶向普法', description: '匹配对象、主题与方案' },
  { kicker: 'TRANSFER', title: '业务移送', description: '保留来源与事项上下文' },
  { kicker: 'FEEDBACK', title: '办理反馈', description: '记录进度、结果与效果' }
]
const updateTheme = () => { themeMode.value = isLightTheme() ? 'light' : 'dark' }
const handleStorageChange = (e: StorageEvent) => { if (e.key === 'platform:theme-mode') updateTheme() }

const pieChartRef = ref<HTMLElement | null>(null); const lineChartRef = ref<HTMLElement | null>(null)
let pieChart: echarts.ECharts | null = null; let lineChart: echarts.ECharts | null = null; let themeObserver: MutationObserver | null = null

const filterForm = reactive({ type: 'all', status: 'all', keyword: '', targetKeyword: '', dateRange: [] as string[] })
const suggestions = ref<ProcuratorateSuggestion[]>([]); const feedItems = ref<ProcuratorateFeedItem[]>([]); const monthlyTrend = ref<ProcuratorateMonthlyTrend[]>([]); const categoryDistribution = ref<{ name: string; value: number }[]>([]); const loading = ref(false)

const filteredSuggestions = computed(() => {
  return suggestions.value.filter((item) => {
    if (filterForm.type !== 'all' && item.type !== filterForm.type) return false
    if (filterForm.status !== 'all' && item.status !== filterForm.status) return false
    return true
  })
})

const columns = [
  { title: '建议标题', dataIndex: 'title', key: 'title', slotName: 'title', width: 250 },
  { title: '建议类型', dataIndex: 'type', key: 'type', width: 120 },
  { title: '建议对象', dataIndex: 'target', key: 'target', width: 150 },
  { title: '发布日期', dataIndex: 'issueDate', key: 'issueDate', width: 120 },
  { title: '状态', dataIndex: 'status', key: 'statusName', slotName: 'statusName', width: 120 },
  { title: '操作', dataIndex: 'actions', key: 'actions', slotName: 'actions', width: 220 }
]

const getStatusClass = (status: string) => { const map: Record<string, string> = { '已反馈': 'status-feedback', '处理中': 'status-processing', '待处理': 'status-pending', '已驳回': 'status-rejected' }; return map[status] || 'status-pending' }

const initPieChart = () => {
  if (!pieChartRef.value) return
  if (!pieChart) pieChart = echarts.init(pieChartRef.value)
  const light = isLightTheme()
  const palette = CHART_PALETTES.violetCyan.map((color) => light ? shadeHex(color, -24) : color)
  const center: [string, string] = ['50%', '42%']
  const radius: [string, string] = ['42%', '74%']
  const prepared: ChartDatum[] = categoryDistribution.value.map((item, index) => ({
    ...item,
    baseColor: palette[index % palette.length],
    itemStyle: raisedPieStyle(palette[index % palette.length]!, index)
  }))
  pieChart.setOption({
    animationDuration: 1000,
    animationEasing: 'cubicOut',
    animationDelay: (index: number) => index * 75,
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)', ...chartTooltip(light, '#e6c675') },
    legend: { bottom: 0, textStyle: { color: light ? '#234f72' : '#cbe8f7', fontSize: 12 } },
    series: [
      ...buildPieDepthLayers('建议类别', prepared, radius, center, 6),
      {
        name: '建议类别',
        type: 'pie',
        radius,
        center,
        z: 20,
        selectedMode: 'single',
        selectedOffset: 0,
        padAngle: 3,
        label: { color: light ? '#173f60' : '#e5f6ff', fontSize: 12, textBorderWidth: 2, textBorderColor: light ? '#fff' : '#07162c' },
        labelLine: { length: 8, length2: 6, smooth: 0.2 },
        emphasis: { scale: true, scaleSize: 8, itemStyle: { shadowBlur: 28, shadowOffsetY: 13 } },
        data: prepared
      }
    ]
  }, true)
}
const initLineChart = () => {
  if (!lineChartRef.value) return
  if (!lineChart) lineChart = echarts.init(lineChartRef.value)
  const light = isLightTheme()
  const axis = chartAxis(light)
  const color = light ? shadeHex(CHART_PALETTES.amberTeal[0], -24) : CHART_PALETTES.amberTeal[0]
  lineChart.setOption({
    animationDuration: 1100,
    animationEasing: 'cubicOut',
    animationDelay: (index: number) => index * 65,
    grid: { left: 42, right: 18, top: 28, bottom: 34 },
    tooltip: { trigger: 'axis', ...chartTooltip(light, color) },
    xAxis: {
      type: 'category',
      data: monthlyTrend.value.map(i => i.month),
      axisLine: { lineStyle: { color: axis.line } },
      axisLabel: { color: axis.text, fontSize: 12 },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: axis.text, fontSize: 12 },
      splitLine: { lineStyle: { color: axis.split, type: 'dashed' } }
    },
    series: [{
      name: '建议数量',
      type: 'line',
      data: monthlyTrend.value.map(i => i.count),
      smooth: true,
      symbol: 'circle',
      symbolSize: 9,
      lineStyle: { width: 3, color, shadowBlur: 14, shadowColor: rgbaHex(color, 0.65) },
      itemStyle: { color, borderColor: '#f3d38e', borderWidth: 1.5, shadowBlur: 12, shadowColor: rgbaHex(color, 0.68) },
      areaStyle: { color: areaGradient(color, 0.44) },
      emphasis: { scale: true, scaleSize: 5 }
    }]
  }, true)
}

const handleChartResize = () => { pieChart?.resize(); lineChart?.resize() }
watch(focusedPanel, async () => {
  const panel = focusedPanel.value || undefined
  if (route.query.panel !== panel) {
    await router.replace({ path: '/procuratorate-suggestion', query: panel ? { panel } : {} })
  }
  await nextTick()
  requestAnimationFrame(handleChartResize)
})

watch(
  () => route.query.panel,
  (panel) => {
    const nextPanel = typeof panel === 'string' && focusKeys.has(panel) ? panel : ''
    if (focusedPanel.value !== nextPanel) focusedPanel.value = nextPanel
  },
  { immediate: true }
)

const handleSearch = () => { loading.value = true; setTimeout(() => { loading.value = false }, 500) }
const handleReset = () => { filterForm.type = 'all'; filterForm.status = 'all' }
const handleAddSuggestion = () => router.push({ name: 'ProcuratorateSuggestionNew' })
const handleAddPoliticalSuggestion = () => router.push({ name: 'ProcuratorateSuggestionNew', query: { type: 'political' } })
const handleView = (r: any) => router.push({ name: 'ProcuratorateSuggestionDetail', params: { id: String(r.id) } })
const handleEdit = (r: any) => router.push({ name: 'ProcuratorateSuggestionEdit', params: { id: String(r.id) } })
const handleIgnore = (r: any) => { Modal.confirm({ title: '忽略建议', content: '确认忽略该条建议？此操作将写入审计日志。', onOk: async () => { await ignoreProcuratorateSuggestion(r.id); suggestions.value = await fetchProcuratorateSuggestions() } }) }

onMounted(async () => {
  loading.value = true; try { [suggestions.value, feedItems.value, monthlyTrend.value, categoryDistribution.value] = await Promise.all([fetchProcuratorateSuggestions(), fetchProcuratorateFeed(), fetchProcuratorateMonthlyTrend(), fetchProcuratorateCategoryDistribution()]) } finally { loading.value = false }
  await nextTick(); initPieChart(); initLineChart()
  window.addEventListener('resize', handleChartResize)
  themeObserver = new MutationObserver(() => { updateTheme(); initPieChart(); initLineChart() })
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] })
  updateTheme(); window.addEventListener('storage', handleStorageChange)
})
onActivated(async () => { suggestions.value = await fetchProcuratorateSuggestions() })
onUnmounted(() => {
  pieChart?.dispose(); lineChart?.dispose(); pieChart = null; lineChart = null
  themeObserver?.disconnect(); themeObserver = null
  window.removeEventListener('resize', handleChartResize)
  window.removeEventListener('storage', handleStorageChange)
})
</script>

<style scoped>
.page-contrast {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}

.duty-entry-strip {
  display: grid;
  min-height: 84px;
  flex: 0 0 84px;
  grid-template-columns: 1.25fr repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.duty-entry-strip button {
  position: relative;
  min-width: 0;
  padding: 10px 72px 10px 13px;
  overflow: hidden;
  border: 1px solid rgba(86, 203, 247, .3);
  border-radius: 9px;
  color: #dff7ff;
  text-align: left;
  background: radial-gradient(circle at 95% 15%, rgba(65, 196, 255, .16), transparent 35%), linear-gradient(145deg, rgba(10, 54, 92, .9), rgba(3, 22, 45, .94));
  cursor: pointer;
}
.duty-entry-strip button:hover { border-color: #5edfff; box-shadow: 0 0 18px rgba(54, 211, 255, .16); transform: translateY(-1px); }
.duty-entry-strip span,
.duty-entry-strip strong,
.duty-entry-strip small { display: block; }
.duty-entry-strip span { color: #5cddff; font-size: 9px; font-weight: 800; letter-spacing: 1px; }
.duty-entry-strip strong { margin: 3px 0; color: #eefbff; font-size: 16px; }
.duty-entry-strip small { overflow: hidden; color: #84afc4; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.duty-entry-strip i { position: absolute; right: 12px; bottom: 12px; color: #f1cf73; font-size: 11px; font-style: normal; }
.duty-entry-strip button:first-child {
  border-color: rgba(104, 220, 255, .66);
  background:
    radial-gradient(circle at 90% 12%, rgba(134, 231, 255, .35), transparent 38%),
    linear-gradient(135deg, rgba(23, 118, 174, .96), rgba(7, 55, 103, .98));
  box-shadow: inset 0 1px 0 rgba(216, 250, 255, .16), 0 0 20px rgba(67, 202, 255, .16);
}
.duty-entry-strip button:first-child strong {
  color: #f3fdff;
  font-size: 22px;
  text-shadow: 0 0 14px rgba(117, 229, 255, .46);
}
.duty-entry-strip button:first-child small { color: #c0ebfa; }

.compact-filter-card {
  flex: 0 0 130px;
  margin: 0 !important;
  overflow: hidden;
}

.compact-filter-card :deep(.arco-card-header) { min-height: 38px; padding: 0 12px; }
.compact-filter-card :deep(.arco-card-body) { padding: 6px 12px; }
.compact-filter-card .filter-section { padding: 0; }
.compact-filter-card :deep(.arco-form-item) { margin-bottom: 5px; }
.compact-filter-card :deep(.arco-form-item-label-col) { padding-bottom: 2px; }

.procuratorial-cockpit-grid {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: minmax(330px, 1.18fr) minmax(430px, 1.55fr) minmax(250px, .92fr);
  gap: 8px;
  overflow: hidden;
}

.procuratorial-cockpit-grid :deep(.focus-panel__body) { min-height: 0; }
.procuratorial-cockpit-grid .content-card {
  height: 50%;
  margin: 0;
  overflow: hidden;
  border: 0;
  border-radius: 0;
}
.suggestion-list-panel .content-card,
.procuratorial-cockpit-grid > :last-child .content-card { height: 100%; }
.procuratorial-cockpit-grid :deep(.arco-card-header) { min-height: 36px; padding: 0 10px; }
.procuratorial-cockpit-grid :deep(.arco-card-body) { box-sizing: border-box; height: calc(100% - 46px); padding: 8px; }
.procuratorial-cockpit-grid .chart-container { height: 100%; min-height: 150px; }
.procuratorial-cockpit-grid .feed-list { height: 100%; overflow: auto; }

.workflow-overview { display: flex; height: 100%; min-height: 0; flex-direction: column; gap: 12px; padding: 14px; }
.workflow-rail { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.workflow-rail article { position: relative; display: flex; min-width: 0; align-items: center; gap: 9px; padding: 11px; border: 1px solid rgba(83, 203, 247, .2); border-radius: 9px; background: rgba(8, 43, 74, .62); }
.workflow-rail article:not(:last-child)::after { position: absolute; z-index: 2; right: -9px; color: #48d8ff; content: '›'; }
.workflow-rail b { display: grid; width: 28px; height: 28px; flex: 0 0 28px; place-items: center; border-radius: 50%; color: #56e0ff; background: rgba(26, 126, 177, .28); box-shadow: 0 0 14px rgba(68, 210, 255, .16); }
.workflow-rail strong,
.workflow-rail span { display: block; }
.workflow-rail strong { color: #e9faff; font-size: 13px; }
.workflow-rail span { margin-top: 3px; color: #7fa9bd; font-size: 9px; line-height: 1.35; }
.duty-action-grid { display: grid; min-height: 0; flex: 1; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 8px; }
.duty-action-grid article { min-width: 0; padding: 13px; border: 1px solid rgba(83, 203, 247, .18); border-radius: 9px; background: radial-gradient(circle at 90% 15%, rgba(60, 195, 245, .12), transparent 34%), linear-gradient(145deg, rgba(8, 46, 79, .72), rgba(3, 23, 47, .82)); }
.duty-action-grid span,
.duty-action-grid strong,
.duty-action-grid small { display: block; }
.duty-action-grid span { color: #56dfff; font-size: 8px; font-weight: 800; letter-spacing: 1px; }
.duty-action-grid strong { margin: 7px 0 5px; color: #e8faff; font-size: 16px; }
.duty-action-grid small { color: #83afc3; font-size: 10px; }
.workflow-boundary { margin: 0; padding: 8px 10px; border-left: 3px solid #55dcff; color: #8ebbd0; font-size: 10px; background: rgba(16, 82, 117, .16); }

/* ===== 基础深色样式（默认） ===== */
.page-contrast :deep(.arco-page-header-title) {
  color: #eff9ff;
  font-size: 22px;
  font-weight: 600;
}
.page-contrast :deep(.arco-page-header-sub-title) {
  color: #bde7ff;
  font-size: 14px;
}
.page-contrast :deep(.arco-card-header-title) {
  color: #eff9ff;
  font-size: 18px;
  font-weight: 600;
}
.page-contrast :deep(.arco-table-th-item) {
  color: #dbf2ff;
  font-size: 16px;
  font-weight: 700;
}
.page-contrast :deep(.arco-table-td) {
  color: #dbf2ff;
  font-size: 14px;
}
.page-contrast :deep(.arco-select-view-value),
.page-contrast :deep(.arco-input) {
  color: #e8f6ff;
  font-size: 15px;
}
.page-contrast :deep(.arco-form-item-label) {
  color: #c8e8ff;
  font-size: 15px;
  font-weight: 500;
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

.page-header {
  margin-bottom: 20px;
}

.monthly-report-entry{position:relative;width:100%;min-height:122px;margin:0 0 20px;padding:20px 230px 20px 26px;border:1px solid rgba(105,190,255,.58);border-radius:12px;text-align:left;color:#eff9ff;cursor:pointer;overflow:hidden;background:radial-gradient(circle at 80% 20%,rgba(45,153,255,.3),transparent 30%),linear-gradient(120deg,#082656,#074c9f);box-shadow:0 12px 28px rgba(0,9,35,.26)}.monthly-report-entry:before{content:"";position:absolute;right:40px;top:-70px;width:250px;height:250px;border:1px solid rgba(120,205,255,.2);border-radius:50%;box-shadow:0 0 0 25px rgba(120,205,255,.05),0 0 0 55px rgba(120,205,255,.04)}.entry-kicker,.entry-title,.entry-flow{display:block;position:relative}.entry-kicker{color:#e8c66e;font-size:11px;letter-spacing:2px}.entry-title{font-family:"STKaiti","KaiTi",serif;font-size:28px;font-weight:700;color:#f5db8a;margin:5px 0 10px}.entry-flow{display:flex;align-items:center;gap:10px;font-size:13px}.entry-flow i{font-style:normal;color:#60d7ff}.entry-action{position:absolute;right:28px;bottom:24px;border:1px solid rgba(255,224,143,.72);border-radius:6px;padding:10px 16px;color:#ffe199;background:rgba(2,35,85,.7);font-weight:700}.monthly-report-entry:hover{transform:translateY(-2px);border-color:#e8c66e;box-shadow:0 16px 34px rgba(0,15,55,.38)}

.content-card {
  margin-bottom: 20px;
  border: 1px solid rgba(93, 191, 255, 0.22);
  background: linear-gradient(180deg, rgba(14, 39, 78, 0.78), rgba(9, 24, 47, 0.86));
}

.card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-section {
  margin-bottom: 20px;
  padding: 16px;
  background: rgba(13, 30, 56, 0.5);
  border-radius: 8px;
  border: 1px solid rgba(93, 191, 255, 0.15);
}

.filter-form :deep(.arco-form-item-label) {
  color: #c8e8ff;
}

.filter-actions-col :deep(.arco-form-item-label) {
  visibility: hidden;
}

.table-quick-search {
  width: min(100%, 240px);
}

.page-contrast :deep(.arco-picker) {
  background: rgba(8, 23, 44, 0.85);
  border-color: rgba(110, 196, 255, 0.25);
  color: #e8f6ff;
}

.chart-container {
  width: 100%;
  height: 260px;
  border-radius: 8px;
  background:
    linear-gradient(rgba(71, 152, 205, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(71, 152, 205, 0.045) 1px, transparent 1px),
    radial-gradient(ellipse at 50% 80%, rgba(89, 175, 226, 0.1), transparent 56%);
  background-size: 30px 30px, 30px 30px, auto;
  box-shadow: inset 0 -22px 42px rgba(0, 8, 24, 0.2);
}

.feed-list {
  max-height: 500px;
  overflow-y: auto;
}

.feed-item {
  padding: 8px 0;
  border-bottom: 1px dashed rgba(108, 192, 248, 0.2);
  font-size: 13px;
}

.feed-time {
  color: #5ad6ff;
  margin-right: 8px;
  font-weight: 600;
}

.feed-content {
  color: #d8f2ff;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
  animation: blink 1.5s ease-in-out infinite;
}

.status-feedback { background: #165DFF; box-shadow: 0 0 8px rgba(22, 93, 255, 0.6); }
.status-processing { background: #FF7D00; box-shadow: 0 0 8px rgba(255, 125, 0, 0.6); }
.status-pending { background: #00B42A; box-shadow: 0 0 8px rgba(0, 180, 42, 0.6); }
.status-rejected { background: #F53F3F; box-shadow: 0 0 8px rgba(245, 63, 63, 0.6); }

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* ===== 浅色主题覆盖 ===== */
:global(body.theme-light) .page-contrast :deep(.arco-page-header-title),
.page-contrast.theme-light :deep(.arco-page-header-title) {
  color: #0a2f4d !important;
}
:global(body.theme-light) .page-contrast :deep(.arco-page-header-sub-title),
.page-contrast.theme-light :deep(.arco-page-header-sub-title) {
  color: #1f5a85 !important;
}
:global(body.theme-light) .page-contrast :deep(.arco-card-header-title),
.page-contrast.theme-light :deep(.arco-card-header-title) {
  color: #0a2f4d !important;
}
:global(body.theme-light) .page-contrast :deep(.arco-table-th-item),
.page-contrast.theme-light :deep(.arco-table-th-item) {
  color: #0a2f4d !important;
}
:global(body.theme-light) .page-contrast :deep(.arco-table-td),
.page-contrast.theme-light :deep(.arco-table-td) {
  color: #103a60 !important;
}
:global(body.theme-light) .page-contrast :deep(.arco-form-item-label),
.page-contrast.theme-light :deep(.arco-form-item-label) {
  color: #0a2f4d !important;
}
:global(body.theme-light) .page-contrast .feed-content,
:global(body.theme-light) .page-contrast .feed-time,
.page-contrast.theme-light .feed-content,
.page-contrast.theme-light .feed-time {
  color: #103a60 !important;
}

:global(body.theme-light) .page-contrast .filter-section,
.page-contrast.theme-light .filter-section {
  background: rgba(221, 239, 255, 0.92) !important;
  border-color: rgba(70, 136, 192, 0.35) !important;
}
:global(body.theme-light) .page-contrast .content-card,
:global(body.theme-light) .page-contrast :deep(.arco-card),
.page-contrast.theme-light .content-card,
.page-contrast.theme-light :deep(.arco-card) {
  background: rgba(235, 246, 255, 0.92) !important;
  border-color: rgba(74, 140, 198, 0.28) !important;
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
:global(body.theme-light) .page-contrast :deep(.arco-table-tr .arco-table-th),
.page-contrast.theme-light :deep(.arco-table-tr .arco-table-th) {
  background: rgba(196, 224, 247, 0.94) !important;
}

:global(body.theme-light) .page-contrast :deep(.arco-btn-secondary),
.page-contrast.theme-light :deep(.arco-btn-secondary) {
  color: #103a60 !important;
  border-color: rgba(70, 136, 192, 0.42) !important;
  background: rgba(233, 245, 255, 0.95) !important;
}
:global(body.theme-light) .page-contrast :deep(.arco-btn-primary),
.page-contrast.theme-light :deep(.arco-btn-primary) {
  background: #1e6eb5 !important;
  border-color: #1e6eb5 !important;
  color: #fff !important;
}

:global(body.theme-light) .page-contrast .feed-item,
.page-contrast.theme-light .feed-item {
  border-bottom-color: rgba(70, 136, 192, 0.34) !important;
}

/* 核心修复：输入框包裹层的灰色背景移除，并将字体统一设为黑色 */
:global(body.theme-light) .page-contrast :deep(.arco-select-view-value),
:global(body.theme-light) .page-contrast :deep(.arco-input),
.page-contrast.theme-light :deep(.arco-select-view-value),
.page-contrast.theme-light :deep(.arco-input) {
  color: #1d2129 !important;
}
:global(body.theme-light) .page-contrast :deep(.arco-picker),
:global(body.theme-light) .page-contrast :deep(.arco-input-wrapper),
:global(body.theme-light) .page-contrast :deep(.arco-select-view-single),
.page-contrast.theme-light :deep(.arco-picker),
.page-contrast.theme-light :deep(.arco-input-wrapper),
.page-contrast.theme-light :deep(.arco-select-view-single) {
  background: #ffffff !important;
  background-color: #ffffff !important;
  border-color: rgba(74, 140, 198, 0.4) !important;
}
</style>
