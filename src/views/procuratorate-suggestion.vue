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
        <a-card title="检察建议类别分布" :bordered="false" class="content-card analytics-chart-card">
          <div ref="pieChartRef" class="chart-container"></div>
        </a-card>
        <a-card title="近六个月建议数量趋势" :bordered="false" class="content-card analytics-chart-card">
          <div ref="lineChartRef" class="chart-container"></div>
        </a-card>
        <section class="overview-mini-card alert-summary">
          <h3>当前履职概况 <small>数据实时更新</small></h3>
          <div><span><small>建议总数</small><b>{{ suggestions.length }}</b></span><span><small>办理中</small><b>{{ suggestionStatusCount('处理中') }}</b></span><span><small>已反馈</small><b>{{ suggestionStatusCount('已反馈') }}</b></span><span class="is-warn"><small>待处理</small><b>{{ suggestionStatusCount('待处理') }}</b></span></div>
        </section>
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
          <div class="workflow-stage">
            <div class="workflow-grid-lines"></div>
            <div class="workflow-orbit workflow-orbit--outer"></div>
            <div class="workflow-orbit workflow-orbit--middle"></div>
            <div class="workflow-orbit workflow-orbit--inner"></div>
            <div class="workflow-core">
              <i></i><strong>履职闭环</strong><small>全流程监督</small>
            </div>
            <article v-for="(action, index) in dutyActions" :key="action.title" class="duty-node" :class="`duty-node--${index + 1}`">
              <div class="duty-node__icon">{{ action.title.slice(0, 1) }}</div>
              <strong>{{ action.title }}</strong><small>{{ action.description }}</small>
            </article>
            <div v-for="(step, index) in workflowSteps.slice(0, 3)" :key="step.title" class="workflow-step" :class="`workflow-step--${index + 1}`">
              <b>{{ index + 1 }}</b><span>{{ step.title }}</span>
            </div>
          </div>
          <section class="workflow-stat-strip">
            <article v-for="stat in workflowStats" :key="stat.label"><span>{{ stat.icon }}</span><div><small>{{ stat.label }}</small><strong>{{ stat.value }}</strong><em>{{ stat.unit }}</em><p>较上月 <b>+{{ stat.delta }}</b></p></div></article>
          </section>
          <p class="workflow-boundary">AI 仅辅助生成标签、依据与草稿；监督价值确认和履职决定均须人工复核。</p>
        </div>
        </template>
      </DashboardFocusPanel>

      <DashboardFocusPanel v-model="focusedPanel" panel-key="feed" title="办理反馈动态" eyebrow="LIVE FEEDBACK">
        <section class="response-gauges">
          <article v-for="metric in responseMetrics" :key="metric.label"><div class="response-ring" :style="{ '--value': metric.value, '--tone': metric.tone }"><strong>{{ metric.text }}</strong></div><b>{{ metric.label }}</b><small>较上月 <em>{{ metric.delta }}</em></small></article>
        </section>
        <a-card title="实时动态流" :bordered="false" class="content-card feedback-feed-card">
          <div class="feed-list">
            <div v-for="item in displayFeedItems" :key="`${item.time}-${item.content}`" class="feed-item">
              <span class="feed-time">{{ item.time }}</span>
              <span class="feed-content">{{ item.content }}</span>
            </div>
          </div>
        </a-card>
        <section class="overview-mini-card handling-table-card">
          <h3>重点业务办理与闭环情况（本月）</h3>
          <table><thead><tr><th>业务条线</th><th>本月办理</th><th>已闭环</th></tr></thead><tbody><tr v-for="row in handlingRows" :key="row.name"><td>{{ row.name }}</td><td>{{ row.total }}</td><td>{{ row.closed }}</td></tr></tbody></table>
        </section>
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
const workflowStats = [
  { icon: '册', label: '普法方案', value: '11', unit: '个', delta: '2' },
  { icon: '送', label: '线上推送', value: '136', unit: '次', delta: '18' },
  { icon: '众', label: '线下活动', value: '42', unit: '场', delta: '6' },
  { icon: '人', label: '受众覆盖', value: '51,500', unit: '人次', delta: '6,200' }
]
const responseMetrics = [
  { label: '预警响应率', text: '81.4%', value: '81.4%', delta: '+6.2%', tone: '#2dd7ff' },
  { label: '纠纷化解率', text: '66.2%', value: '66.2%', delta: '+4.5%', tone: '#3f89ff' },
  { label: '建议反馈率', text: '88.2%', value: '88.2%', delta: '+3.7%', tone: '#24c8ff' },
  { label: '平均响应', text: '4.2h', value: '72%', delta: '-0.6h', tone: '#e8b65c' }
]
const handlingRows = [
  { name: '刑事检察', total: 18, closed: 15 },
  { name: '民事检察', total: 16, closed: 13 },
  { name: '行政检察', total: 18, closed: 15 }
]
const fallbackFeedItems = [
  { time: '14:02', content: '嫌疑单位已接收《规范经营检察建议》' },
  { time: '13:45', content: '金融街街道办事处提交问题检察建议，待处理确认' },
  { time: '11:30', content: '市场监督管理部门回复检察建议处理进展' },
  { time: '11:15', content: '区民政局提交养老服务合同整改方案' },
  { time: '10:50', content: '区教育委员会反馈培训机构预付费监管计划' },
  { time: '09:45', content: '新街口街道办事处反馈整改完成' }
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
const displayFeedItems = computed(() => feedItems.value.length ? feedItems.value : fallbackFeedItems)

const columns = [
  { title: '建议标题', dataIndex: 'title', key: 'title', slotName: 'title', width: 250 },
  { title: '建议类型', dataIndex: 'type', key: 'type', width: 120 },
  { title: '建议对象', dataIndex: 'target', key: 'target', width: 150 },
  { title: '发布日期', dataIndex: 'issueDate', key: 'issueDate', width: 120 },
  { title: '状态', dataIndex: 'status', key: 'statusName', slotName: 'statusName', width: 120 },
  { title: '操作', dataIndex: 'actions', key: 'actions', slotName: 'actions', width: 220 }
]

const getStatusClass = (status: string) => { const map: Record<string, string> = { '已反馈': 'status-feedback', '处理中': 'status-processing', '待处理': 'status-pending', '已驳回': 'status-rejected' }; return map[status] || 'status-pending' }
const suggestionStatusCount = (status: string) => suggestions.value.filter(item => item.status === status).length

const initPieChart = () => {
  if (!pieChartRef.value) return
  if (!pieChart) pieChart = echarts.init(pieChartRef.value)
  const light = false
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
  const light = false
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
.duty-entry-strip span { color: #5cddff; font-size: 11px; font-weight: 800; letter-spacing: 1px; }
.duty-entry-strip strong { margin: 3px 0; color: #eefbff; font-size: 19px; }
.duty-entry-strip small { overflow: hidden; color: #84afc4; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.duty-entry-strip i { position: absolute; right: 12px; bottom: 12px; color: #f1cf73; font-size: 13px; font-style: normal; }
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
  grid-template-columns: minmax(320px, 1.2fr) minmax(430px, 1.55fr) minmax(320px, 1.2fr);
  gap: 6px;
  overflow: hidden;
  color: #dff5ff;
  background: #03152e;
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

.workflow-overview { display: flex; height: 100%; min-height: 0; flex-direction: column; padding: 5px 8px 8px; }
.workflow-stage { position: relative; min-height: 0; flex: 1; overflow: hidden; background: linear-gradient(rgba(51, 135, 222, .035) 1px, transparent 1px), linear-gradient(90deg, rgba(51, 135, 222, .035) 1px, transparent 1px), radial-gradient(ellipse at 50% 53%, rgba(16, 112, 239, .34), rgba(3, 27, 61, .08) 48%, transparent 72%); background-size: 24px 24px, 24px 24px, auto; }
.workflow-grid-lines { position: absolute; inset: 28% 2% -21%; transform: perspective(380px) rotateX(62deg); border: 1px solid rgba(53, 150, 255, .24); border-radius: 50%; background: repeating-radial-gradient(circle, transparent 0 23px, rgba(54, 145, 255, .12) 24px 25px), repeating-linear-gradient(90deg, transparent 0 29px, rgba(54, 145, 255, .07) 30px 31px); box-shadow: inset 0 0 45px rgba(25, 117, 240, .18); }
.workflow-orbit { position: absolute; left: 50%; top: 53%; border: 1px solid rgba(57, 158, 255, .68); border-radius: 50%; transform: translate(-50%, -50%) rotateX(61deg); box-shadow: 0 0 9px rgba(51, 159, 255, .45), inset 0 0 12px rgba(51, 159, 255, .15); }
.workflow-orbit--outer { width: 82%; height: 48%; }
.workflow-orbit--middle { width: 63%; height: 37%; border-style: dashed; }
.workflow-orbit--inner { width: 43%; height: 26%; border-width: 2px; }
.workflow-core { position: absolute; z-index: 3; left: 50%; top: 53%; width: 126px; height: 126px; display: flex; align-items: center; justify-content: center; flex-direction: column; transform: translate(-50%, -50%); border: 2px solid #3bbaff; border-radius: 50%; color: #effcff; background: radial-gradient(circle, rgba(24, 119, 239, .82), rgba(2, 23, 57, .97) 66%); box-shadow: 0 0 11px #248fff, 0 0 34px rgba(22, 105, 240, .48), inset 0 0 26px rgba(63, 181, 255, .48); }
.workflow-core::before, .workflow-core::after { position: absolute; border: 1px solid rgba(73, 182, 255, .58); border-radius: 50%; content: ''; }
.workflow-core::before { inset: 10px; }
.workflow-core::after { inset: -9px; }
.workflow-core i { position: absolute; top: 24px; width: 35px; height: 12px; border-radius: 50%; background: #4ec7ff; filter: blur(7px); }
.workflow-core strong { font-size: 21px; letter-spacing: 3px; text-shadow: 0 0 10px #50ceff; }
.workflow-core small { margin-top: 5px; color: #68cfff; font-size: 11px; }
.duty-node { position: absolute; z-index: 4; width: 104px; padding: 7px 4px 5px; box-sizing: border-box; border: 1px solid rgba(50, 144, 238, .2); color: #ecfbff !important; text-align: center; background: linear-gradient(180deg, rgba(8, 50, 97, .42), rgba(3, 22, 48, .12)); box-shadow: inset 0 0 14px rgba(35, 126, 225, .08); }
.duty-node::before { position: absolute; left: 50%; bottom: -15px; width: 1px; height: 15px; background: linear-gradient(#279bff, transparent); box-shadow: 0 0 5px #279bff; content: ''; }
.duty-node__icon { width: 52px; height: 38px; margin: 0 auto 5px; display: grid; place-items: center; border: 1px solid #389dfa; border-radius: 50%; color: #c7efff; font-size: 17px; background: radial-gradient(ellipse, #1a75d8, #061c40 70%); box-shadow: 0 7px 0 -3px #0c438b, 0 11px 0 -5px #1a6ab5, 0 0 16px rgba(38, 150, 255, .68); text-shadow: 0 0 7px #4dccff; }
.duty-node strong, .duty-node small { display: block; }
.duty-node strong { color: #ecfbff !important; font-size: 15px; letter-spacing: 1px; text-shadow: 0 0 7px rgba(62, 190, 255, .7); }
.duty-node small { margin-top: 3px; overflow: hidden; color: #91bad1 !important; font-size: 10px; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
.duty-node--1 { left: 5%; top: 31%; }
.duty-node--2 { left: 50%; top: 4%; transform: translateX(-50%); }
.duty-node--3 { right: 5%; top: 31%; }
.duty-node--4 { right: 5%; bottom: 7%; }
.duty-node--5 { left: 50%; bottom: 1%; transform: translateX(-50%); }
.duty-node--6 { left: 5%; bottom: 7%; }
.workflow-step { position: absolute; z-index: 5; color: #f1fbff; text-align: center; text-shadow: 0 0 7px #42bfff; }
.workflow-step b, .workflow-step span { display: block; }
.workflow-step b { font-size: 21px; }
.workflow-step span { font-size: 11px; }
.workflow-step--1 { left: 28%; top: 47%; }
.workflow-step--2 { right: 27%; top: 47%; }
.workflow-step--3 { left: 48%; top: 69%; }
.workflow-boundary { margin: 0; padding: 8px 10px; border-left: 3px solid #55dcff; color: #9fc7da; font-size: 12px; background: rgba(16, 82, 117, .16); }

/* 参考大屏补充卡片 */
.procuratorial-cockpit-grid :deep(.focus-panel) { border-radius: 5px; border-color: rgba(61, 168, 255, .46); box-shadow: inset 0 0 28px rgba(17, 96, 186, .08), 0 0 10px rgba(21, 105, 209, .12); }
.procuratorial-cockpit-grid :deep(.focus-panel__header) { min-height: 36px; flex-basis: 36px; padding: 0 10px; background: linear-gradient(90deg, rgba(13, 78, 134, .46), rgba(4, 29, 60, .12)); }
.procuratorial-cockpit-grid :deep(.focus-panel__header h2) { font-size: 17px; letter-spacing: 1px; }
.procuratorial-cockpit-grid :deep(.focus-panel__eyebrow) { font-size: 9px; }
.procuratorial-cockpit-grid :deep(.focus-panel__action) { min-height: 25px; padding: 0 9px; font-size: 12px; }
.analytics-chart-card { height: 37% !important; }
.overview-mini-card { position: relative; border-top: 1px solid rgba(67, 160, 244, .34); background: linear-gradient(145deg, rgba(7, 37, 73, .88), rgba(3, 21, 44, .9)); }
.overview-mini-card::before { position: absolute; left: 8px; top: 0; width: 48px; height: 2px; background: #33c8ff; box-shadow: 0 0 8px #33c8ff; content: ''; }
.overview-mini-card h3 { height: 31px; margin: 0; padding: 0 9px; display: flex; align-items: center; color: #dff5ff; font-size: 14px; letter-spacing: .5px; }
.overview-mini-card h3 small { margin-left: auto; color: #759ab5; font-size: 9px; font-weight: 400; }
.alert-summary { height: 26%; min-height: 126px; }
.alert-summary > div { height: calc(100% - 29px); display: grid; grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr); }
.alert-summary span { display: flex; align-items: center; justify-content: center; flex-direction: column; border-right: 1px solid rgba(56, 130, 202, .25); }
.alert-summary span:nth-child(-n+2) { border-bottom: 1px solid rgba(56, 130, 202, .25); }
.alert-summary small { color: #93b5ca; font-size: 12px; }
.alert-summary b { margin-top: 2px; color: #eefaff; font-size: 29px; text-shadow: 0 0 9px #2798ff; }
.alert-summary .is-warn b { color: #ffd36e; text-shadow: 0 0 9px rgba(218, 151, 31, .72); }
.workflow-stat-strip { height: 126px; flex: 0 0 126px; display: grid; grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr); gap: 4px; margin-top: 4px; }
.workflow-stat-strip article { min-width: 0; padding: 8px 12px; display: flex; align-items: center; gap: 11px; border: 1px solid rgba(52, 147, 239, .4); background: linear-gradient(145deg, rgba(10, 52, 101, .66), rgba(3, 25, 52, .76)); }
.workflow-stat-strip > article > span { width: 40px; height: 40px; flex: 0 0 40px; display: grid; place-items: center; border-radius: 50%; color: #bceaff; font-size: 15px; background: radial-gradient(circle, #1c7bdd, #08244a 70%); box-shadow: 0 0 12px rgba(43, 149, 255, .5); }
.workflow-stat-strip small { display: block; color: #a4c3d5; font-size: 12px; }
.workflow-stat-strip strong { color: #f0faff; font-size: 26px; }
.workflow-stat-strip em { margin-left: 3px; color: #82c5e5; font-size: 11px; font-style: normal; }
.workflow-stat-strip p { margin: 1px 0 0; color: #789bb4; font-size: 10px; }
.workflow-stat-strip p b { color: #53d8a4; }
.response-gauges { height: 150px; flex: 0 0 150px; display: grid; grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr); padding: 6px 8px; box-sizing: border-box; border-bottom: 1px solid rgba(56, 145, 226, .3); background: rgba(4, 27, 56, .7); }
.response-gauges article { min-width: 0; text-align: center; }
.response-ring { width: 56px; height: 56px; margin: auto; display: grid; place-items: center; border-radius: 50%; background: radial-gradient(circle, #061b38 55%, transparent 57%), conic-gradient(var(--tone) var(--value), rgba(45, 98, 151, .25) 0); box-shadow: 0 0 10px color-mix(in srgb, var(--tone) 30%, transparent); }
.response-ring strong { color: #effbff; font-size: 14px; }
.response-gauges article > b { display: block; margin-top: 2px; color: #cce3ef; font-size: 11px; white-space: nowrap; }
.response-gauges article > small { color: #7897ad; font-size: 10px; }
.response-gauges em { color: #4bd4a0; font-style: normal; }
.procuratorial-cockpit-grid > :last-child .feedback-feed-card { height: calc(100% - 295px) !important; min-height: 120px; }
.feedback-feed-card :deep(.arco-card-header) { min-height: 29px; }
.feedback-feed-card :deep(.arco-card-header-title) { font-size: 14px; }
.feedback-feed-card :deep(.arco-card-body) { height: calc(100% - 30px); padding: 4px 8px; }
.feedback-feed-card .feed-item { padding: 6px 0; font-size: 11px; line-height: 1.45; }
.feedback-feed-card .feed-time { font-size: 11px; }
.handling-table-card { height: 145px; flex: 0 0 145px; }
.handling-table-card table { width: calc(100% - 12px); margin: 0 6px 5px; border-collapse: collapse; color: #c9dfec; text-align: center; font-size: 11px; }
.handling-table-card th, .handling-table-card td { padding: 5px 3px; border: 1px solid rgba(57, 126, 193, .28); }
.handling-table-card th { color: #cfe8f7; background: rgba(17, 58, 104, .8); }
.handling-table-card td:first-child { text-align: left; padding-left: 10px; }
.suggestion-list-panel :deep(.focus-panel__body), .procuratorial-cockpit-grid > :last-child :deep(.focus-panel__body) { display: flex; min-height: 0; flex-direction: column; }
.procuratorial-cockpit-grid :deep(.arco-card),
.page-contrast.theme-light .procuratorial-cockpit-grid :deep(.arco-card) { color: #dff5ff !important; background: linear-gradient(180deg, rgba(8, 35, 67, .96), rgba(3, 18, 39, .98)) !important; }
.page-contrast.theme-light .procuratorial-cockpit-grid :deep(.focus-panel),
:global(body.theme-light) .procuratorial-cockpit-grid :deep(.focus-panel) { background: linear-gradient(180deg, rgba(8, 35, 67, .98), rgba(3, 18, 39, .99)) !important; }
.page-contrast.theme-light .procuratorial-cockpit-grid :deep(.arco-card-header-title),
:global(body.theme-light) .procuratorial-cockpit-grid :deep(.arco-card-header-title) { color: #e8f8ff !important; }
.page-contrast.theme-light .procuratorial-cockpit-grid .feed-content,
.page-contrast.theme-light .procuratorial-cockpit-grid .feed-time,
:global(body.theme-light) .procuratorial-cockpit-grid .feed-content,
:global(body.theme-light) .procuratorial-cockpit-grid .feed-time { color: #a9cae0 !important; }
.page-contrast.theme-light .procuratorial-cockpit-grid .feed-time,
:global(body.theme-light) .procuratorial-cockpit-grid .feed-time { color: #3bc7ff !important; }
.page-contrast.theme-light .procuratorial-cockpit-grid .workflow-step,
.page-contrast.theme-light .procuratorial-cockpit-grid .workflow-core,
:global(body.theme-light) .procuratorial-cockpit-grid .workflow-step,
:global(body.theme-light) .procuratorial-cockpit-grid .workflow-core { color: #effcff !important; }

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

/* 履职驾驶舱在全站浅色模式下仍保持参考图的深蓝大屏观感 */
:global(body.theme-light) .procuratorial-cockpit-grid,
.page-contrast.theme-light .procuratorial-cockpit-grid { background: #03152e !important; }
:global(body.theme-light) .procuratorial-cockpit-grid :deep(.focus-panel),
.page-contrast.theme-light .procuratorial-cockpit-grid :deep(.focus-panel),
:global(body.theme-light) .procuratorial-cockpit-grid :deep(.arco-card),
.page-contrast.theme-light .procuratorial-cockpit-grid :deep(.arco-card) { color: #dff5ff !important; background: linear-gradient(180deg, rgba(8, 35, 67, .98), rgba(3, 18, 39, .99)) !important; border-color: rgba(61, 168, 255, .42) !important; }
:global(body.theme-light) .procuratorial-cockpit-grid :deep(.focus-panel__header h2),
.page-contrast.theme-light .procuratorial-cockpit-grid :deep(.focus-panel__header h2),
:global(body.theme-light) .procuratorial-cockpit-grid :deep(.arco-card-header-title),
.page-contrast.theme-light .procuratorial-cockpit-grid :deep(.arco-card-header-title),
:global(body.theme-light) .procuratorial-cockpit-grid .duty-node strong,
.page-contrast.theme-light .procuratorial-cockpit-grid .duty-node strong,
:global(body.theme-light) .procuratorial-cockpit-grid .workflow-core strong,
.page-contrast.theme-light .procuratorial-cockpit-grid .workflow-core strong,
:global(body.theme-light) .procuratorial-cockpit-grid .workflow-step,
.page-contrast.theme-light .procuratorial-cockpit-grid .workflow-step { color: #effbff !important; }
:global(body.theme-light) .procuratorial-cockpit-grid .duty-node small,
.page-contrast.theme-light .procuratorial-cockpit-grid .duty-node small { color: #79a8c4 !important; }
:global(body.theme-light) .procuratorial-cockpit-grid .response-gauges b,
.page-contrast.theme-light .procuratorial-cockpit-grid .response-gauges b,
:global(body.theme-light) .procuratorial-cockpit-grid .response-ring strong,
.page-contrast.theme-light .procuratorial-cockpit-grid .response-ring strong,
:global(body.theme-light) .procuratorial-cockpit-grid .overview-mini-card h3,
.page-contrast.theme-light .procuratorial-cockpit-grid .overview-mini-card h3,
:global(body.theme-light) .procuratorial-cockpit-grid .workflow-stat-strip strong,
.page-contrast.theme-light .procuratorial-cockpit-grid .workflow-stat-strip strong { color: #e8f8ff !important; }
:global(body.theme-light) .procuratorial-cockpit-grid .chart-container,
.page-contrast.theme-light .procuratorial-cockpit-grid .chart-container { background-color: #061a36 !important; }
:global(body.theme-light) .procuratorial-cockpit-grid .feedback-feed-card :deep(.arco-card-body),
.page-contrast.theme-light .procuratorial-cockpit-grid .feedback-feed-card :deep(.arco-card-body) { background: #061a36 !important; }
</style>
