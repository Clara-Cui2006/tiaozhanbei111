<template>
  <div class="page-contrast" :class="{ 'theme-light': themeMode === 'light' }">
    <button class="monthly-report-entry" @click="router.push('/procuratorate-suggestion/monthly-report')">
      <span class="entry-kicker">AI MONTHLY BRIEFING</span>
      <span class="entry-title">检察业务月报智能生成</span>
      <span class="entry-flow"><b>数据归集</b><i>→</i><b>风险识别</b><i>→</i><b>自动生成初稿</b><i>→</i><b>人工审核发布</b></span>
      <span class="entry-action">进入月报工作台 →</span>
    </button>

    <a-card class="content-card compact-filter-card">
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

      <DashboardFocusPanel v-model="focusedPanel" panel-key="list" title="检察建议列表" eyebrow="PROCURATORIAL WORKFLOW" class="suggestion-list-panel">
        <a-card title="检察建议列表" :bordered="false" class="content-card">
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
import { useRouter } from 'vue-router'
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
const isLightTheme = () => localStorage.getItem('platform:theme-mode') === 'light'
const themeMode = ref<'light' | 'dark'>(isLightTheme() ? 'light' : 'dark')
const focusedPanel = ref('')
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
  const radius: [string, string] = ['38%', '64%']
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
watch(focusedPanel, async () => { await nextTick(); requestAnimationFrame(handleChartResize) })

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

.page-contrast .monthly-report-entry {
  min-height: 54px;
  flex: 0 0 54px;
  margin: 0;
  padding: 7px 190px 7px 18px;
}

.page-contrast .entry-title { display: inline; margin: 0 18px 0 0; font-size: 21px; }
.page-contrast .entry-kicker { display: inline; margin-right: 12px; }
.page-contrast .entry-flow { display: inline-flex; }
.page-contrast .entry-action { right: 16px; bottom: 10px; padding: 6px 10px; }

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
  grid-template-columns: minmax(250px, 1fr) minmax(0, 2fr) minmax(250px, 1fr);
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
.procuratorial-cockpit-grid :deep(.arco-card-body) { padding: 8px; }
.procuratorial-cockpit-grid .chart-container { height: calc(100% - 4px); min-height: 110px; }
.procuratorial-cockpit-grid .feed-list { height: 100%; overflow: auto; }

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
