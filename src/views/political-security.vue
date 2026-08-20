<template>
  <div class="political-security-page political-cockpit-page">
    <div v-if="focusedPanel === 'dimensions'" class="kpi-strip dimension-kpi-strip">
      <button
        v-for="item in dimensionCards"
        :key="item.key"
        type="button"
        class="kpi-item dimension-kpi-card"
        :class="[{ active: activeCockpitPanel === item.key }, `kpi-${item.tone}`]"
        @click="openCockpitPanel(item.key)"
      >
        <span>{{ item.eyebrow }}</span>
        <strong>{{ item.title }}</strong>
        <small>{{ item.summary }}</small>
      </button>
    </div>
    <div v-else class="kpi-strip">
      <div class="kpi-item kpi-red">
        <div class="kpi-accent"></div>
        <div class="kpi-label">年度政治安全案件总数</div>
        <div class="kpi-value">{{ overview.totalSignalsThisYear }}</div>
        <div class="kpi-sub">同比 {{ formatSignedRate(overview.yearOverYearRate) }}</div>
      </div>
      <div class="kpi-item kpi-cyan">
        <div class="kpi-accent"></div>
        <div class="kpi-label">高发风险类型</div>
        <div class="kpi-value kpi-value-text">{{ overview.highIncidenceTypes }}</div>
      </div>
      <div class="kpi-item kpi-orange">
        <div class="kpi-accent"></div>
        <div class="kpi-label">风险预警推送</div>
        <div class="kpi-value">{{ overview.riskAlertPushCount }}</div>
      </div>
      <div class="kpi-item kpi-yellow">
        <div class="kpi-accent"></div>
        <div class="kpi-label">政治安全相关检察建议</div>
        <div class="kpi-value">{{ overview.procuratorateSuggestions }}</div>
      </div>
      <div class="kpi-item kpi-blue">
        <div class="kpi-accent"></div>
        <div class="kpi-label">重大活动耦合度</div>
        <div class="kpi-value kpi-value-text">{{ overview.majorEventCoupling }}</div>
      </div>
    </div>

    <div class="political-cockpit-grid" :class="{ 'political-cockpit-grid--focused': focusedPanel }">
      <DashboardFocusPanel v-model="focusedPanel" panel-key="map" title="政治安全风险空间分布" eyebrow="FOUR-DIMENSIONAL ANALYSIS" class="political-map-panel">
        <template #default="{ focused }">
          <RiskMapPanel :height="focused ? 350 : 345" :default-overlay-political="true" :display-mode="focused ? 'focus' : 'cockpit'" />
        </template>
      </DashboardFocusPanel>

      <DashboardFocusPanel v-model="focusedPanel" panel-key="topics" title="重点事项与人工复核" eyebrow="PRIORITY ITEMS" class="political-topic-panel">
        <template #default="{ focused }">
        <a-card :bordered="false" class="chart-card topic-card">
          <div class="topic-card-layout">
            <div class="topic-list">
              <PriorityTopicTabs v-model="selectedPriorityTag" :alerts="priorityAlerts" />
            </div>
            <div class="review-metrics">
              <div class="review-pod review-pod-cyan">
                <div class="review-metric-copy">
                  <span class="review-pod-kicker">HUMAN REVIEW</span>
                  <h3>人工复核案件总量</h3>
                  <strong>{{ overview.pendingManualReview || 0 }}<small>件</small></strong>
                  <p>进入人工复核流程的政治安全案件</p>
                </div>
                <div class="review-ring" :style="ringStyle(overview.pendingManualReviewRate)">
                  <div><i>{{ formatRate(overview.pendingManualReviewRate) }}</i><small>复核占比</small></div>
                </div>
              </div>
              <div class="review-pod review-pod-amber">
                <div class="review-metric-copy">
                  <span class="review-pod-kicker">PRIORITY TOPICS</span>
                  <h3>重点专题案件总量</h3>
                  <strong>{{ overview.highConcernRisks || 0 }}<small>件</small></strong>
                  <p>命中重点专题规则并纳入联动研判</p>
                </div>
                <div class="review-ring" :style="ringStyle(overview.highConcernRiskRate)">
                  <div><i>{{ formatRate(overview.highConcernRiskRate) }}</i><small>专题占比</small></div>
                </div>
              </div>
              <div class="review-pod review-pod-portrait">
                <div class="portrait-heading">
                  <span class="review-pod-kicker">TOPIC PORTRAIT</span>
                  <em>动态画像</em>
                </div>
                <h3>重点专题画像</h3>
                <strong class="portrait-topic">{{ selectedPriorityTag }}</strong>
                <div class="portrait-facts">
                  <div><span>关联案件</span><b>{{ selectedTopicAlerts.length }}</b><small>件</small></div>
                  <div><span>高发街道</span><b>{{ selectedTopStreet }}</b></div>
                  <div><span>待复核</span><b>{{ selectedPendingReview }}</b><small>件</small></div>
                </div>
                <p>综合专题规则命中、案件文本风险特征与人工复核状态，形成专题联动研判画像。</p>
              </div>
            </div>
          </div>
          <a-alert type="info" class="method-alert">“高风险/高关注”不单纯依据案件数量判断，需结合案件分类标签、风险规则匹配和人工复核结果；高发风险类型可按案件数量排序。</a-alert>
          <div class="political-ai-strip">
            <a-button type="primary" status="danger" size="small" :loading="aiAssessing" @click="generateAssessment">
              {{ aiAssessment ? '重新生成草稿' : '生成研判草稿' }}
            </a-button>
            <div v-if="aiAssessing" class="ai-loading-text">AI 正在综合分析政治安全风险态势...</div>
            <div v-else-if="aiAssessment" class="ai-assessment" v-html="formatAssessment(aiAssessment)"></div>
            <div v-else class="ai-empty-text">AI 仅辅助生成草稿，最终结论须由人工复核。</div>
          </div>
          <div v-if="focused" class="topic-focus-detail">
            <section class="security-lens-panel">
              <h3>政治安全分析视角</h3>
              <div class="security-lens-grid">
                <article :class="{ active: activeSecurityLens === 'traditional' }"><strong>传统政治安全</strong><span>作为重点事项的专题标签和人工研判视角，不自动定性。</span></article>
                <article :class="{ active: activeSecurityLens === 'nontraditional' }"><strong>非传统政治安全</strong><span>围绕金融、网络、公共安全等交叉风险设置关联分析位置。</span></article>
                <article><strong>涉访涉诉关联</strong><span>承接外部治理数据中经人工确认需继续专题研判的事项。</span></article>
              </div>
            </section>
            <section class="priority-item-panel">
              <h3>{{ selectedPriorityTag }} · 当前事项</h3>
              <div class="priority-item-list">
                <article v-for="item in selectedTopicAlerts" :key="item.id">
                  <div><strong>{{ item.caseName }}</strong><span>{{ item.caseNumber }} · {{ item.street }}</span></div>
                  <p>{{ item.summary }}</p>
                  <div class="priority-item-tags"><i>{{ item.riskLevel }}风险</i><i>{{ item.alertStatus }}</i><i>{{ item.caseType }}</i></div>
                </article>
                <div v-if="!selectedTopicAlerts.length" class="ai-empty-text">当前专题暂无匹配事项。</div>
              </div>
            </section>
          </div>
        </a-card>
        </template>
      </DashboardFocusPanel>

      <DashboardFocusPanel v-model="focusedPanel" panel-key="dimensions" title="四维研判数据驾驶舱" eyebrow="LOCATION · CONTENT · SUBJECT · IMPACT" class="political-dimension-panel">
        <a-card class="chart-card" :bordered="false">
          <div v-if="activeCockpitPanel" class="dimension-analysis-layout">
            <section class="dimension-chart-pane">
              <div class="dimension-pane-heading">
                <div><span>{{ activeDimensionCard?.eyebrow }}</span><h3>{{ activeCockpitPanelTitle }}分析</h3></div>
                <small>{{ activeDimensionCard?.description }}</small>
              </div>
              <div v-if="activeCockpitPanel === 'location'" ref="locationChartRef" class="dimension-chart-box"></div>
              <div v-else-if="activeCockpitPanel === 'behavior'" ref="behaviorChartRef" class="dimension-chart-box"></div>
              <div v-else-if="activeCockpitPanel === 'subject'" ref="subjectChartRef" class="dimension-chart-box"></div>
              <div v-else ref="timeChartRef" class="dimension-chart-box"></div>
            </section>
            <section class="dimension-alert-pane">
              <div class="dimension-pane-heading">
                <div><span>POLITICAL SECURITY ALERT</span><h3>{{ activeCockpitPanelTitle }}筛查预警</h3></div>
                <small>仅作辅助提示 · 须人工复核</small>
              </div>
              <div class="dimension-alert-list">
                <button v-for="alert in dimensionAlerts" :key="alert.id" type="button" @click="openDimensionAlert(alert)">
                  <div class="dimension-alert-topline"><i :class="`risk-${alert.riskLevel}`">{{ alert.riskLevel }}风险</i><span>{{ alert.alertStatus }}</span></div>
                  <strong>{{ dimensionWarningTitle(alert) }}</strong>
                  <p>{{ alert.summary }}</p>
                  <footer><span>{{ alert.caseNumber }}</span><em>查看案件分析 →</em></footer>
                </button>
                <div v-if="!dimensionAlerts.length" class="ai-empty-text">当前数据口径下暂无待展示预警。</div>
              </div>
            </section>
          </div>
          <div v-else class="dimension-empty-state">
            <strong>请选择上方四维研判卡片</strong>
            <span>按地点因素、行为内容、涉及主体、传播影响查看对应图表和政治安全预警。</span>
          </div>
        </a-card>
      </DashboardFocusPanel>
    </div>

    <a-drawer v-model:visible="dimensionDrawerVisible" :width="560" :footer="false" unmount-on-close>
      <template #title>{{ selectedDimensionAlert?.caseName || '政治安全预警案件分析' }}</template>
      <div v-if="selectedDimensionAlert" class="dimension-case-detail">
        <section><h3>案件基础信息</h3><div class="dimension-case-grid"><label>案号<strong>{{ selectedDimensionAlert.caseNumber }}</strong></label><label>案由<strong>{{ selectedDimensionAlert.caseType }}</strong></label><label>所属街道<strong>{{ selectedDimensionAlert.street }}</strong></label><label>风险状态<strong>{{ selectedDimensionAlert.riskLevel }}风险 · {{ selectedDimensionAlert.alertStatus }}</strong></label></div><p>{{ selectedDimensionAlert.summary }}</p></section>
        <section><h3>人物画像</h3><div class="dimension-case-grid"><label>姓名<strong>{{ selectedDimensionAlert.subject.name }}</strong></label><label>年龄<strong>{{ selectedDimensionAlert.subject.age }}</strong></label><label>职业<strong>{{ selectedDimensionAlert.subject.occupation }}</strong></label><label>特殊身份<strong>{{ selectedDimensionAlert.subject.specialIdentity }}</strong></label></div></section>
        <section><h3>重点标签</h3><div class="dimension-detail-tags"><i v-for="tag in selectedDimensionAlert.tags" :key="tag">{{ tag }}</i><i>{{ activeCockpitPanelTitle }}</i></div></section>
        <section><h3>AI辅助研判依据</h3><ul><li v-for="item in selectedDimensionAlert.ruleHits" :key="`rule-${item}`">{{ item }}</li><li v-for="item in selectedDimensionAlert.aiHints" :key="`hint-${item}`">{{ item }}</li></ul><p v-if="!selectedDimensionAlert.ruleHits.length && !selectedDimensionAlert.aiHints.length">当前数据未提供额外模型依据，需结合原始材料人工核实。</p></section>
        <section><h3>下一步处置意见</h3><p>建议结合原始案件材料进一步核实。是否形成政治安全预警、转入检察履职或采取其他措施，须由检察官人工决定。</p></section>
      </div>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'
import DashboardFocusPanel from '../components/dashboard-focus-panel.vue'
import RiskMapPanel from '../components/risk-map-panel.vue'
import PriorityTopicTabs from '../components/priority-topic-tabs.vue'
import { fetchPoliticalMonthlyTrend, fetchPoliticalStreetStats, fetchPoliticalOverview, fetchPriorityAlerts } from '../api/platform'
import { PRIORITY_TAGS, type PriorityAlert, type PriorityTag } from '../features/priority-alerts'
import type { PoliticalMonthlyTrend, PoliticalStreetStat, PoliticalOverview } from '../types/platform'
import {
  CHART_PALETTES,
  areaGradient,
  buildPieDepthLayers,
  chartTooltip,
  raisedPieStyle,
  rgbaHex,
  shadeHex,
  type ChartDatum
} from '../utils/chart-visual'

// 引入 LLM 相关服务
import { chatWithLLM } from '../services/llm'
import { USER_PROMPT_TEMPLATES } from '../services/prompts'

const locationChartRef = ref<HTMLElement | null>(null)
const route = useRoute()
const router = useRouter()
const behaviorChartRef = ref<HTMLElement | null>(null)
const subjectChartRef = ref<HTMLElement | null>(null)
const timeChartRef = ref<HTMLElement | null>(null)
type CockpitPanelKey = 'location' | 'behavior' | 'subject' | 'time'
const activeCockpitPanel = ref<CockpitPanelKey | null>(null)
const focusedPanel = ref('')
const focusKeys = new Set(['map', 'topics', 'dimensions'])
const activeSecurityLens = computed(() => route.query.lens === 'traditional' || route.query.lens === 'nontraditional' ? route.query.lens : '')
const cockpitPanelTitles: Record<CockpitPanelKey, string> = {
  location: '地点因素',
  behavior: '行为内容',
  subject: '涉及主体',
  time: '传播影响'
}
const activeCockpitPanelTitle = computed(() => activeCockpitPanel.value ? cockpitPanelTitles[activeCockpitPanel.value] : '')
const dimensionDrawerVisible = ref(false)
const selectedDimensionAlert = ref<PriorityAlert | null>(null)

let locationChart: echarts.ECharts | null = null
let behaviorChart: echarts.ECharts | null = null
let subjectChart: echarts.ECharts | null = null
let timeChart: echarts.ECharts | null = null
let themeObserver: MutationObserver | null = null

const trendData = ref<PoliticalMonthlyTrend[]>([])
const streetData = ref<PoliticalStreetStat[]>([])
const priorityAlerts = ref<PriorityAlert[]>([])
const selectedPriorityTag = ref<PriorityTag>(PRIORITY_TAGS[0])
const selectedTopicAlerts = computed(() => priorityAlerts.value.filter(item => item.tags.includes(selectedPriorityTag.value)))
const selectedTopStreet = computed(() => {
  const counts: Record<string, number> = {}
  selectedTopicAlerts.value.forEach(item => { counts[item.street] = (counts[item.street] || 0) + 1 })
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '暂无'
})
const selectedPendingReview = computed(() => selectedTopicAlerts.value.filter(item => item.alertStatus === '待人工复核').length)
const dimensionCards = computed(() => [
  { key: 'location' as const, eyebrow: 'LOCATION', title: '地点因素', tone: 'cyan', summary: `${streetData.value.length}个街道纳入研判`, description: '分析案发或发生地点、重点区域属性与空间聚集情况' },
  { key: 'behavior' as const, eyebrow: 'CONTENT', title: '行为内容', tone: 'orange', summary: overview.value.highIncidenceTypes || '按案件内容分类研判', description: '识别言论、行为、诉求及案件内容中的政治安全关联特征' },
  { key: 'subject' as const, eyebrow: 'SUBJECT', title: '涉及主体', tone: 'purple', summary: `${new Set(priorityAlerts.value.map(item => item.subject.specialIdentity).filter(item => item && item !== '无')).size}类重点身份`, description: '分析主体身份、职业、组织属性和背景关系' },
  { key: 'time' as const, eyebrow: 'IMPACT', title: '传播影响', tone: 'yellow', summary: `${trendData.value.at(-1)?.count ?? 0}条近期信号`, description: '研判传播范围、扩散趋势和社会影响' }
])
const activeDimensionCard = computed(() => dimensionCards.value.find(item => item.key === activeCockpitPanel.value))
const dimensionAlerts = computed(() => {
  const all = priorityAlerts.value
  let matched: PriorityAlert[] = []
  if (activeCockpitPanel.value === 'location') matched = all.filter(item => item.street && item.riskLevel !== '低')
  if (activeCockpitPanel.value === 'behavior') matched = all.filter(item => item.ruleHits.length || item.aiHints.length)
  if (activeCockpitPanel.value === 'subject') matched = all.filter(item => item.subject.specialIdentity && item.subject.specialIdentity !== '无')
  if (activeCockpitPanel.value === 'time') matched = all.filter(item => /网络|跨境|群体|集中|传播|多起/.test(`${item.summary} ${item.ruleHits.join(' ')}`))
  return (matched.length ? matched : all).slice(0, 2)
})
const dimensionWarningTitle = (alert: PriorityAlert) => {
  if (activeCockpitPanel.value === 'location') return `检测到${alert.street}政治安全关联事项`
  if (activeCockpitPanel.value === 'behavior') return `${alert.caseType}行为内容需进一步研判`
  if (activeCockpitPanel.value === 'subject') return `${alert.subject.specialIdentity || alert.subject.occupation}主体特征需人工复核`
  return '传播影响与扩散范围需人工复核'
}
const openDimensionAlert = (alert: PriorityAlert) => {
  selectedDimensionAlert.value = alert
  dimensionDrawerVisible.value = true
}

// ================== AI 研判逻辑 ==================
const overview = ref<PoliticalOverview>({
  totalSignalsThisYear: 0,
  highIncidenceTypes: '',
  riskAlertPushCount: 0,
  procuratorateSuggestions: 0,
  majorEventCoupling: ''
})
const aiAssessing = ref(false)
const aiAssessment = ref('')

const generateAssessment = async () => {
  aiAssessing.value = true
  try {
    const o = overview.value
    const sortedStreets = [...streetData.value].sort((a, b) => b.count - a.count)
    const topStreets = sortedStreets.slice(0, 3).map(s => `${s.community}(${s.count}个信号)`).join('、')

    const prompt = USER_PROMPT_TEMPLATES.politicalDashboard({
      totalSignals: o.totalSignalsThisYear,
      highIncidenceTypes: o.highIncidenceTypes,
      riskAlertPushCount: o.riskAlertPushCount,
      procuratorateSuggestions: o.procuratorateSuggestions,
      majorEventCoupling: o.majorEventCoupling,
      topStreets
    })

    aiAssessment.value = await chatWithLLM(prompt, 'dashboard')
  } catch (e) {
    aiAssessment.value = '研判失败，请稍后重试。'
  } finally {
    aiAssessing.value = false
  }
}

const formatAssessment = (content: string) => {
  return content
    .replace(/【(.+?)】/g, '<strong class="ai-section-title">$1</strong>')
    .replace(/\n/g, '<br>')
}
// ====================================================

// 动态主题配色函数
const isLightTheme = () => document.body.classList.contains('theme-light') || localStorage.getItem('platform:theme-mode') === 'light'
const chartTextPrimary = () => isLightTheme() ? '#1d4f79' : '#dbf2ff'
const chartTextSecondary = () => isLightTheme() ? '#2f638f' : '#8ec7e8'
const chartAxisColor = () => isLightTheme() ? 'rgba(52, 123, 180, 0.46)' : 'rgba(110,196,255,0.3)'
const chartSplitColor = () => isLightTheme() ? 'rgba(52, 123, 180, 0.16)' : 'rgba(110,196,255,0.12)'

const formatRate = (value?: number | null) => typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : '暂无'
const formatSignedRate = (value?: number | null) => {
  if (typeof value !== 'number') return '暂无'
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`
}
const ringStyle = (value?: number | null) => {
  const rate = typeof value === 'number' ? Math.max(0, Math.min(1, value)) : 0
  return { '--ring-value': `${rate * 100}%` } as Record<string, string>
}

const behaviorNames = ['涉密材料异常流转', '重点人员异常聚集', '涉外敏感接触', '网络政治安全线索', '重大活动周边异常']
const subjectNames = ['重点关注人员', '涉外关联人员', '重点单位从业人员', '网络账号主体', '群体性诉求参与人员']
const buildSyntheticDistribution = (names: string[], total: number, seed: number) => {
  const safeTotal = Math.max(0, total)
  const weights = names.map((_, index) => ((seed + 5) * (index + 3) * 11) % 23 + 8)
  const sum = weights.reduce((acc, item) => acc + item, 0)
  return names.map((name, index) => ({ name, value: Math.max(0, Math.round(safeTotal * weights[index]! / sum)) }))
}

const renderPie = (
  container: HTMLElement | null,
  instance: echarts.ECharts | null,
  title: string,
  data: Array<{ name: string; value: number }>,
  palette: readonly string[]
) => {
  if (!container) return instance
  instance?.dispose()
  const chart = echarts.init(container)
  const light = isLightTheme()
  const center: [string, string] = ['50%', '51%']
  const radius: [string, string] = ['34%', '62%']
  const prepared: ChartDatum[] = data.map((item, index) => {
    const color = light ? shadeHex(palette[index % palette.length]!, -24) : palette[index % palette.length]!
    return { ...item, baseColor: color, itemStyle: raisedPieStyle(color, index) }
  })
  chart.setOption({
    backgroundColor: 'transparent',
    animationDuration: 1050,
    animationEasing: 'cubicOut',
    animationDelay: (index: number) => index * 55,
    tooltip: {
      trigger: 'item',
      ...chartTooltip(light, palette[0]),
      formatter: (params: any) => `${params.name}<br/>政治安全案件数量：${params.value} 件<br/>占比：${params.percent}%`
    },
    series: [
      ...buildPieDepthLayers(title, prepared, radius, center, 6),
      {
        name: title,
        type: 'pie',
        radius,
        center,
        z: 20,
        selectedMode: 'single',
        selectedOffset: 0,
        padAngle: 2.5,
        minShowLabelAngle: 4,
        avoidLabelOverlap: true,
        label: {
          color: chartTextPrimary(),
          fontSize: 12,
          lineHeight: 17,
          formatter: '{b}\n{d}%',
          textBorderWidth: 2,
          textBorderColor: light ? 'rgba(255,255,255,.88)' : 'rgba(2,12,30,.84)'
        },
        labelLine: { length: 8, length2: 7, smooth: 0.2, lineStyle: { color: chartAxisColor(), width: 1.1 } },
        labelLayout: { hideOverlap: true },
        emphasis: { scale: true, scaleSize: 8, itemStyle: { shadowBlur: 30, shadowOffsetY: 14 } },
        data: prepared
      }
    ]
  })
  return chart
}

const renderCharts = () => {
  locationChart?.dispose(); behaviorChart?.dispose(); subjectChart?.dispose(); timeChart?.dispose()
  locationChart = null; behaviorChart = null; subjectChart = null; timeChart = null
  const total = overview.value.totalSignalsThisYear || streetData.value.reduce((sum, item) => sum + item.count, 0)
  if (activeCockpitPanel.value === 'location') locationChart = renderPie(locationChartRef.value, null, '地点因素', streetData.value.map((item) => ({ name: item.community, value: item.count })), CHART_PALETTES.caseBlue)
  if (activeCockpitPanel.value === 'behavior') behaviorChart = renderPie(behaviorChartRef.value, null, '行为内容', buildSyntheticDistribution(behaviorNames, total, 7), CHART_PALETTES.political)
  if (activeCockpitPanel.value === 'subject') subjectChart = renderPie(subjectChartRef.value, null, '涉及主体', buildSyntheticDistribution(subjectNames, total, 13), CHART_PALETTES.violetCyan)
  if (activeCockpitPanel.value === 'time' && timeChartRef.value) {
    timeChart = echarts.init(timeChartRef.value)
    const light = isLightTheme()
    const lineColor = light ? '#c82f45' : '#f0445e'
    timeChart.setOption({
      backgroundColor: 'transparent',
      animationDuration: 1200,
      animationEasing: 'cubicOut',
      animationDelay: (index: number) => index * 60,
      tooltip: {
        trigger: 'axis',
        ...chartTooltip(light, '#e8c36a'),
        formatter: (params: any) => {
          const item = params?.[0]
          return `${item?.axisValue || ''}<br/>政治安全案件数量：${item?.data ?? 0}`
        }
      },
      grid: { left: 46, right: 18, top: 26, bottom: 36 },
      xAxis: {
        type: 'category',
        data: trendData.value.map(d => d.month),
        axisLabel: { color: chartTextSecondary(), fontSize: 12 },
        axisLine: { lineStyle: { color: chartAxisColor() } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: chartTextSecondary(), fontSize: 12 },
        splitLine: { lineStyle: { color: chartSplitColor() } }
      },
      series: [{
        name: '政治安全案件数量',
        data: trendData.value.map(d => d.count),
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 9,
        lineStyle: { color: lineColor, width: 3, shadowBlur: 16, shadowColor: rgbaHex(lineColor, 0.72) },
        itemStyle: { color: lineColor, borderColor: '#f2d18d', borderWidth: 1.5, shadowBlur: 14, shadowColor: rgbaHex(lineColor, 0.72) },
        areaStyle: { color: areaGradient(lineColor, 0.46) },
        emphasis: { scale: true, scaleSize: 6 }
      }]
    })
  }
}

const initDataAndRender = async () => {
  const [tData, sData, oData, alertData] = await Promise.all([
    fetchPoliticalMonthlyTrend(),
    fetchPoliticalStreetStats(),
    fetchPoliticalOverview(),
    fetchPriorityAlerts()
  ])
  trendData.value = tData
  streetData.value = sData
  overview.value = oData
  priorityAlerts.value = alertData
  renderCharts()
}

const handleResize = () => {
  locationChart?.resize()
  behaviorChart?.resize()
  subjectChart?.resize()
  timeChart?.resize()
}

const resizeCockpitCharts = async () => {
  await nextTick()
  window.requestAnimationFrame(() => {
    renderCharts()
    handleResize()
    window.setTimeout(handleResize, 260)
  })
}

const openCockpitPanel = async (panel: CockpitPanelKey) => {
  if (activeCockpitPanel.value === panel) return
  activeCockpitPanel.value = panel
  await resizeCockpitCharts()
}

const closeCockpitPanel = async () => {
  activeCockpitPanel.value = null
  await resizeCockpitCharts()
}

watch(focusedPanel, async () => {
  if (focusedPanel.value === 'dimensions' && !activeCockpitPanel.value) activeCockpitPanel.value = 'location'
  if (focusedPanel.value !== 'dimensions') activeCockpitPanel.value = null
  const panel = focusedPanel.value || undefined
  if (route.query.panel !== panel) {
    await router.replace({ path: '/political-security', query: panel ? { panel } : {} })
  }
  await resizeCockpitCharts()
})

watch(
  () => route.query.panel,
  (panel) => {
    const nextPanel = typeof panel === 'string' && focusKeys.has(panel) ? panel : ''
    if (focusedPanel.value !== nextPanel) focusedPanel.value = nextPanel
  },
  { immediate: true }
)

onMounted(() => {
  initDataAndRender()
  window.addEventListener('resize', handleResize)

  themeObserver = new MutationObserver(() => {
    renderCharts()
  })
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  locationChart?.dispose()
  behaviorChart?.dispose()
  subjectChart?.dispose()
  timeChart?.dispose()
  themeObserver?.disconnect()
})
</script>

<style scoped>
.political-cockpit-page {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 0 !important;
  overflow: hidden;
}

.political-cockpit-page .kpi-strip {
  height: 92px;
  flex: 0 0 92px;
  gap: 10px;
  margin: 0;
}

.political-cockpit-page .kpi-item { padding: 11px 10px 8px; }
.political-cockpit-page .kpi-label { margin-bottom: 6px; font-size: 14px; }
.political-cockpit-page .kpi-value { font-size: 27px; }
.political-cockpit-page .kpi-value-text { font-size: 18px !important; }
.political-cockpit-page .kpi-sub { margin-top: 4px; font-size: 11px; }
.dimension-kpi-strip { display: grid !important; grid-template-columns: repeat(4, minmax(0, 1fr)); }
.dimension-kpi-card { display: flex; height: 92px; min-height: 0; align-items: flex-start; justify-content: center; flex-direction: column; text-align: left; cursor: pointer; }
.dimension-kpi-card span,
.dimension-kpi-card strong,
.dimension-kpi-card small { position: relative; z-index: 1; display: block; }
.dimension-kpi-card span { color: var(--kpi-accent); font-size: 9px; font-weight: 800; letter-spacing: 1.4px; }
.dimension-kpi-card strong { margin: 4px 0; color: #f0fbff; font-size: 20px; }
.dimension-kpi-card small { color: #8db9cd; font-size: 11px; }
.dimension-kpi-card.active { border-color: var(--kpi-accent); box-shadow: inset 0 0 28px color-mix(in srgb, var(--kpi-accent) 12%, transparent), 0 0 20px color-mix(in srgb, var(--kpi-accent) 22%, transparent); transform: translateY(-1px); }
.dimension-kpi-card.kpi-purple { --kpi-accent: #9c7cff; }

.political-cockpit-grid {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: minmax(260px, .78fr) minmax(520px, 1.35fr) minmax(260px, .78fr);
  grid-template-rows: minmax(0, 1fr);
  gap: 10px;
  overflow: hidden;
}

.political-map-panel { grid-column: 2; grid-row: 1; }
.political-topic-panel { grid-column: 1; grid-row: 1; }
.political-dimension-panel { grid-column: 3; grid-row: 1; }

.political-topic-panel .chart-card,
.political-dimension-panel .chart-card {
  height: 100%;
  margin: 0;
  overflow: hidden;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}
.political-topic-panel.focus-panel--active .chart-card { overflow: auto; }
.political-topic-panel.focus-panel--active .review-metrics {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.political-topic-panel.focus-panel--active .review-pod {
  min-height: 180px;
  padding: 22px 26px;
}
.political-topic-panel.focus-panel--active .review-ring {
  width: 118px;
  height: 118px;
  flex-basis: 118px;
}
.political-topic-panel.focus-panel--active .review-ring i { font-size: 24px; }
.political-topic-panel.focus-panel--active .review-pod-portrait {
  grid-column: 1 / -1;
  min-height: 190px;
  border-color: rgba(99, 246, 213, .7);
  background:
    radial-gradient(circle at 84% 20%, rgba(78, 233, 185, .24), transparent 34%),
    linear-gradient(135deg, rgba(12, 74, 82, .92), rgba(5, 30, 55, .96));
  box-shadow:
    inset 0 1px 0 rgba(208, 255, 242, .16),
    inset 0 0 36px rgba(78, 233, 185, .09),
    0 0 26px rgba(60, 224, 197, .2);
}
.political-topic-panel.focus-panel--active .review-pod-portrait::before {
  height: 3px;
  background: linear-gradient(90deg, transparent, #54efd0, #d8fff6, #54efd0, transparent);
  box-shadow: 0 0 18px rgba(84, 239, 208, .86);
}
.political-topic-panel.focus-panel--active .portrait-topic {
  color: #f0fffb;
  font-size: 26px;
  text-shadow: 0 0 16px rgba(84, 239, 208, .28);
}

.topic-focus-detail {
  display: grid;
  grid-template-columns: minmax(320px, .72fr) minmax(0, 1.28fr);
  gap: 14px;
  margin-top: 14px;
}
.security-lens-panel,
.priority-item-panel {
  padding: 14px;
  border: 1px solid rgba(82, 203, 255, .22);
  border-radius: 10px;
  background: rgba(4, 25, 50, .72);
}
.security-lens-panel h3,
.priority-item-panel h3 { margin: 0 0 12px; color: #dff7ff; font-size: 16px; }
.security-lens-grid { display: grid; gap: 9px; }
.security-lens-grid article { padding: 12px; border-left: 3px solid #55dcff; background: linear-gradient(90deg, rgba(28, 112, 158, .22), transparent); }
.security-lens-grid article.active { border-color: #f2c86f; background: linear-gradient(90deg, rgba(220, 156, 54, .22), rgba(28, 112, 158, .08)); box-shadow: inset 0 0 18px rgba(242, 200, 111, .08); }
.security-lens-grid strong,
.security-lens-grid span { display: block; }
.security-lens-grid strong { color: #64e2ff; }
.security-lens-grid span { margin-top: 5px; color: #91bdd0; font-size: 12px; line-height: 1.55; }
.priority-item-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.priority-item-list article { min-width: 0; padding: 12px; border: 1px solid rgba(82, 203, 255, .16); border-radius: 8px; background: rgba(8, 41, 70, .58); }
.priority-item-list article > div:first-child { display: flex; justify-content: space-between; gap: 8px; }
.priority-item-list strong { color: #e9faff; }
.priority-item-list span { color: #7da8bd; font-size: 11px; }
.priority-item-list p { margin: 9px 0; color: #a9d3e3; font-size: 12px; line-height: 1.55; }
.priority-item-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.priority-item-tags i { padding: 3px 7px; border: 1px solid rgba(255, 185, 82, .28); border-radius: 999px; color: #ffd17a; font-size: 10px; font-style: normal; background: rgba(112, 65, 15, .18); }

.political-topic-panel :deep(.arco-card-body),
.political-dimension-panel :deep(.arco-card-body) { padding: 8px; }
.political-dimension-panel :deep(.arco-card-body) { height: 100%; box-sizing: border-box; }

.political-topic-panel .topic-card-layout { display: block; }
.political-topic-panel .review-metrics { grid-template-columns: minmax(0, 1fr); gap: 6px; }
.political-topic-panel .review-pod { min-height: 94px; padding: 8px; }
.political-topic-panel .review-pod p,
.political-topic-panel .method-alert { display: none; }
.political-topic-panel .review-ring { width: 58px; height: 58px; flex-basis: 58px; }
.political-topic-panel .topic-list { margin-bottom: 6px; }
.political-ai-strip { display: flex; align-items: center; gap: 10px; margin-top: 7px; }
.political-ai-strip .ai-empty-text,
.political-ai-strip .ai-loading-text { flex: 1; padding: 4px; text-align: left; }
.political-ai-strip .ai-assessment { max-height: 90px; overflow: auto; }

.political-dimension-panel .cockpit-grid {
  height: 100%;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.political-dimension-panel .cockpit-chart { min-height: 0; padding: 6px; }
.political-dimension-panel .cockpit-chart h4 { margin: 0 0 2px; }
.political-dimension-panel .chart-box { height: calc(100% - 22px); min-height: 70px; }
.dimension-analysis-layout { display: grid; height: 100%; min-height: 0; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.dimension-chart-pane,
.dimension-alert-pane { display: flex; min-width: 0; min-height: 0; flex-direction: column; overflow: hidden; border: 1px solid rgba(79, 205, 250, .22); border-radius: 10px; background: linear-gradient(145deg, rgba(7, 47, 80, .76), rgba(3, 22, 46, .9)); }
.dimension-pane-heading { display: flex; min-height: 62px; flex: 0 0 62px; align-items: center; justify-content: space-between; gap: 16px; padding: 9px 13px; border-bottom: 1px solid rgba(80, 202, 245, .18); }
.dimension-pane-heading span { display: block; color: #61ddff; font-size: 9px; font-weight: 800; letter-spacing: 1.3px; }
.dimension-pane-heading h3 { margin: 3px 0 0; color: #effbff; font-size: 18px; }
.dimension-pane-heading small { max-width: 58%; color: #82adc1; font-size: 10px; line-height: 1.45; text-align: right; }
.dimension-chart-box { width: 100%; min-height: 0; flex: 1; }
.dimension-alert-list { display: grid; min-height: 0; flex: 1; grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 7px; padding: 8px; overflow: auto; }
.dimension-alert-list button { padding: 10px 12px; border: 1px solid rgba(85, 200, 243, .2); border-radius: 8px; color: inherit; text-align: left; background: radial-gradient(circle at 92% 12%, rgba(241, 91, 91, .1), transparent 36%), rgba(7, 42, 71, .72); cursor: pointer; transition: border-color .2s ease, transform .2s ease, box-shadow .2s ease; }
.dimension-alert-list button:hover { border-color: rgba(93, 223, 255, .65); box-shadow: 0 0 18px rgba(66, 207, 255, .14); transform: translateX(-2px); }
.dimension-alert-topline,
.dimension-alert-list footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.dimension-alert-topline i { padding: 2px 7px; border-radius: 999px; color: #fff; font-size: 9px; font-style: normal; }
.dimension-alert-topline .risk-高 { background: rgba(237, 74, 78, .72); }
.dimension-alert-topline .risk-中 { background: rgba(231, 150, 45, .72); }
.dimension-alert-topline .risk-低 { background: rgba(44, 166, 130, .72); }
.dimension-alert-topline span { color: #7faec3; font-size: 9px; }
.dimension-alert-list strong { display: block; margin-top: 7px; color: #eafaff; font-size: 14px; }
.dimension-alert-list p { margin: 5px 0 7px; overflow: hidden; color: #92bdcf; font-size: 10px; line-height: 1.45; text-overflow: ellipsis; white-space: nowrap; }
.dimension-alert-list footer { color: #74a7bf; font-size: 9px; }
.dimension-alert-list footer em { color: #61dcff; font-style: normal; }
.dimension-empty-state { display: grid; height: 100%; place-content: center; gap: 8px; color: #7faec3; text-align: center; }
.dimension-empty-state strong { color: #dff8ff; font-size: 20px; }
.dimension-case-detail { display: grid; gap: 12px; color: #dff7ff; }
.dimension-case-detail section { padding: 14px; border: 1px solid rgba(79, 200, 243, .2); border-radius: 9px; background: rgba(6, 35, 61, .62); }
.dimension-case-detail h3 { margin: 0 0 11px; color: #5edfff; font-size: 16px; }
.dimension-case-detail p,
.dimension-case-detail li { color: #a9cfdf; font-size: 12px; line-height: 1.65; }
.dimension-case-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.dimension-case-grid label { display: flex; gap: 4px; flex-direction: column; padding: 8px; color: #75a4ba; font-size: 10px; background: rgba(7, 52, 82, .5); }
.dimension-case-grid strong { color: #effbff; font-size: 12px; }
.dimension-detail-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.dimension-detail-tags i { padding: 4px 8px; border: 1px solid rgba(243, 185, 83, .34); border-radius: 999px; color: #f5cc76; font-size: 10px; font-style: normal; background: rgba(105, 65, 15, .18); }

.political-security-page { padding-bottom: 20px; }
.dashboard-row { margin-top: 16px; margin-bottom: 16px; }

/* ===== KPI 卡片条：样式完全对标 index.vue ===== */
.kpi-strip {
  display: flex;
  gap: 18px;
  margin-top: 16px;
}

.kpi-item {
  --kpi-accent: #64d8ff;
  flex: 1;
  min-width: 0;
  position: relative;
  padding: 22px 18px 20px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--kpi-accent) 40%, transparent);
  border-radius: 10px;
  background:
    radial-gradient(circle at 92% 86%, color-mix(in srgb, var(--kpi-accent) 13%, transparent), transparent 28%),
    linear-gradient(145deg, color-mix(in srgb, var(--kpi-accent) 14%, transparent), transparent 50%),
    linear-gradient(180deg, rgba(14, 39, 65, 0.84), rgba(7, 23, 40, 0.92));
  box-shadow:
    inset 0 0 26px color-mix(in srgb, var(--kpi-accent) 7%, transparent),
    0 14px 28px rgba(0, 0, 0, 0.18);
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.kpi-item:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--kpi-accent) 58%, transparent);
  box-shadow:
    inset 0 0 28px color-mix(in srgb, var(--kpi-accent) 10%, transparent),
    0 16px 30px rgba(0, 0, 0, 0.22),
    0 0 22px color-mix(in srgb, var(--kpi-accent) 14%, transparent);
}

.kpi-item::before {
  position: absolute;
  inset: 0 18px auto;
  height: 2px;
  content: '';
  pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--kpi-accent), #eef2ee, var(--kpi-accent), transparent);
  box-shadow: 0 0 13px color-mix(in srgb, var(--kpi-accent) 58%, transparent);
}

.kpi-item::after {
  position: absolute;
  right: -18px;
  bottom: -34px;
  width: 96px;
  height: 96px;
  content: '';
  pointer-events: none;
  border: 1px solid color-mix(in srgb, var(--kpi-accent) 28%, transparent);
  border-radius: 50%;
  box-shadow: inset 0 0 24px color-mix(in srgb, var(--kpi-accent) 8%, transparent);
  opacity: 0.56;
}

.kpi-accent { display: none; }
.kpi-red { --kpi-accent: #ff726b; }
.kpi-cyan { --kpi-accent: #64d8ff; }
.kpi-orange { --kpi-accent: #ff9b52; }
.kpi-yellow { --kpi-accent: #f2c86f; }
.kpi-blue { --kpi-accent: #5b9fd4; }

.kpi-label {
  position: relative;
  z-index: 1;
  margin-bottom: 18px;
  padding: 0 10px;
  color: color-mix(in srgb, var(--kpi-accent) 72%, #d9edf4);
  font-size: 22px;
  font-weight: 800;
  line-height: 1.25;
  text-align: center;
  text-shadow: 0 0 10px color-mix(in srgb, var(--kpi-accent) 22%, transparent);
}

.kpi-value {
  position: relative;
  z-index: 1;
  padding: 0 16px;
  color: var(--kpi-accent);
  font-size: 40px;
  font-weight: 800;
  line-height: 1;
  text-align: center;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 17px color-mix(in srgb, var(--kpi-accent) 50%, transparent);
}

.kpi-value-text {
  font-size: 26px !important;
  font-weight: 800;
  line-height: 1.18;
}

.kpi-sub {
  margin-top: 8px;
  padding: 0 16px;
  color: rgba(219, 242, 255, 0.82);
  font-size: 13px;
  text-align: center;
}

.chart-card {
  background: rgba(14, 39, 78, 0.78) !important;
  border: 1px solid rgba(110, 196, 255, 0.2) !important;
}

.method-card {
  min-height: 236px;
}

.map-method-card {
  margin-bottom: 16px;
}

.topic-card-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;
  align-items: stretch;
}

.method-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.method-item {
  min-height: 74px;
  padding: 14px;
  border: 1px solid rgba(110, 196, 255, 0.22);
  border-radius: 8px;
  background: rgba(5, 21, 43, 0.42);
}

.method-item strong {
  display: block;
  margin-bottom: 6px;
  color: #ffe0a3;
  font-size: 16px;
}

.method-item span {
  color: #c7eaff;
  font-size: 13px;
  line-height: 1.55;
}

.method-alert {
  margin-top: 12px;
}

.topic-list {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  padding: 2px 0 16px;
  border-bottom: 1px solid rgba(82, 203, 255, 0.22);
  box-shadow: 0 12px 26px -26px rgba(75, 205, 253, 0.85);
}

.review-metrics {
  display: grid;
  grid-template-columns: minmax(220px, 0.92fr) minmax(220px, 0.92fr) minmax(300px, 1.3fr);
  gap: 14px;
}

.review-pod {
  --pod-color: 75, 205, 253;
  position: relative;
  display: flex;
  min-height: 214px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  overflow: hidden;
  padding: 22px;
  border: 1px solid rgba(var(--pod-color), 0.38);
  border-radius: 16px;
  background:
    radial-gradient(circle at 92% 12%, rgba(var(--pod-color), 0.16), transparent 38%),
    linear-gradient(145deg, rgba(15, 55, 91, 0.82), rgba(5, 23, 48, 0.92));
  box-shadow: 0 16px 34px rgba(0, 8, 28, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.06), inset 0 0 32px rgba(var(--pod-color), 0.055);
}

.review-pod::before {
  content: '';
  position: absolute;
  top: 0;
  left: 18px;
  right: 18px;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(var(--pod-color), 0.95), transparent);
  box-shadow: 0 0 16px rgba(var(--pod-color), 0.78);
}

.review-pod::after {
  content: '';
  position: absolute;
  right: -44px;
  bottom: -44px;
  width: 120px;
  height: 120px;
  border: 1px solid rgba(var(--pod-color), 0.14);
  border-radius: 50%;
  box-shadow: 0 0 0 18px rgba(var(--pod-color), 0.025), 0 0 0 36px rgba(var(--pod-color), 0.018);
}

.review-pod-amber { --pod-color: 255, 184, 77; }
.review-pod-portrait { --pod-color: 78, 233, 185; display: block; }

.review-pod-kicker {
  display: block;
  margin-bottom: 8px;
  color: rgba(var(--pod-color), 0.82) !important;
  font-size: 10px !important;
  font-weight: 700;
  letter-spacing: 1.35px;
}

.review-pod h3 {
  margin: 0 0 12px;
  color: #dbf4ff;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.review-metric-copy { min-width: 0; }

.review-metric-copy > strong {
  display: flex;
  align-items: baseline;
  gap: 7px;
  color: rgb(var(--pod-color));
  font-size: 46px;
  font-weight: 800;
  line-height: 1;
  text-shadow: 0 0 22px rgba(var(--pod-color), 0.3);
}

.review-metric-copy > strong small {
  font-size: 14px;
  font-weight: 600;
}

.review-metric-copy > p {
  max-width: 150px;
  margin: 12px 0 0;
  color: #85b6d2;
  font-size: 12px;
  line-height: 1.55;
}

.review-ring {
  --ring-value: 0%;
  position: relative;
  width: 108px;
  height: 108px;
  flex: 0 0 108px;
  border-radius: 50%;
  background: conic-gradient(rgb(var(--pod-color)) var(--ring-value), rgba(var(--pod-color), 0.13) 0);
  box-shadow: 0 0 25px rgba(var(--pod-color), 0.22), 0 12px 26px rgba(0, 10, 32, 0.32);
}

.review-ring::before,
.review-ring::after {
  content: '';
  position: absolute;
  border-radius: 50%;
}

.review-ring::before { inset: 9px; background: linear-gradient(145deg, #0c2d50, #071a35); }
.review-ring::after { inset: -5px; border: 1px solid rgba(var(--pod-color), 0.16); }

.review-ring > div {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.review-ring i {
  color: #f1fbff;
  font-size: 18px;
  font-style: normal;
  font-weight: 800;
}

.review-ring small {
  margin-top: 3px;
  color: rgba(var(--pod-color), 0.78);
  font-size: 10px;
}

.portrait-heading { display: flex; align-items: center; justify-content: space-between; }
.portrait-heading em { padding: 3px 8px; border: 1px solid rgba(78, 233, 185, 0.35); border-radius: 999px; color: #80eac5; background: rgba(32, 151, 112, 0.12); font-size: 10px; font-style: normal; }
.portrait-topic { display: block; overflow: hidden; color: #e5fff6; font-size: 20px; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }

.portrait-facts {
  display: grid;
  grid-template-columns: 0.8fr 1.5fr 0.8fr;
  gap: 7px;
  margin: 14px 0 12px;
}

.portrait-facts > div { min-width: 0; padding: 8px 9px; border: 1px solid rgba(78, 233, 185, 0.14); border-radius: 9px; background: rgba(4, 34, 48, 0.42); }
.portrait-facts span { display: block; margin-bottom: 4px; color: #7ebaa8; font-size: 10px; }
.portrait-facts b { color: #dffff4; font-size: 15px; }
.portrait-facts small { margin-left: 2px; color: #7ebaa8; font-size: 9px; }

.review-pod-portrait > p {
  margin: 0;
  color: #9cc8bd;
  font-size: 11px;
  line-height: 1.55;
}

.cockpit-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.cockpit-grid.is-expanded {
  grid-template-columns: minmax(0, 1fr);
}

.cockpit-return-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 42px;
  margin-bottom: 14px;
  padding: 8px 12px;
  border: 1px solid rgba(110, 196, 255, 0.22);
  border-radius: 8px;
  background: linear-gradient(90deg, rgba(12, 46, 82, 0.72), rgba(6, 24, 50, 0.42));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.cockpit-return-bar span {
  color: #dff6ff;
  font-size: 15px;
  font-weight: 700;
}

.cockpit-chart {
  position: relative;
  min-height: 314px;
  padding: 14px;
  overflow: hidden;
  border: 1px solid rgba(217, 235, 246, 0.3);
  border-radius: 8px;
  background:
    linear-gradient(rgba(74, 158, 214, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(74, 158, 214, 0.05) 1px, transparent 1px),
    rgba(5, 21, 43, 0.38);
  background-size: 30px 30px;
  box-shadow: 0 16px 30px rgba(0, 0, 0, 0.22), inset 0 0 34px rgba(63, 161, 222, 0.06);
  cursor: pointer;
  transition: min-height 0.28s ease, transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease;
}

.cockpit-chart.is-hidden {
  display: none;
}

.cockpit-chart.is-active {
  min-height: 642px;
  cursor: default;
  border-color: rgba(158, 221, 255, 0.42);
  background:
    linear-gradient(rgba(74, 158, 214, 0.055) 1px, transparent 1px),
    linear-gradient(90deg, rgba(74, 158, 214, 0.055) 1px, transparent 1px),
    linear-gradient(180deg, rgba(8, 32, 66, 0.76), rgba(5, 18, 42, 0.54));
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.30), inset 0 0 56px rgba(63, 161, 222, 0.10);
}

.cockpit-chart::after {
  content: '';
  position: absolute;
  top: 0;
  left: 12%;
  right: 12%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(242, 210, 143, 0.9), rgba(190, 232, 250, 0.9), transparent);
  box-shadow: 0 0 12px rgba(91, 188, 244, 0.55);
}

.cockpit-chart:hover {
  transform: translateY(-3px);
  box-shadow: 0 22px 38px rgba(0, 0, 0, 0.28), inset 0 0 42px rgba(63, 161, 222, 0.09);
}

.cockpit-chart h4 {
  margin: 0 0 8px;
  color: #dbf2ff;
  font-size: 16px;
  font-weight: 700;
}

.cockpit-chart .chart-box {
  height: 260px;
}

.cockpit-chart.is-active .chart-box {
  height: 586px;
}

.chart-container-large {
  height: 450px;
  width: 100%;
  display: flex;
}

.chart-box {
  flex: 1;
  width: 100%;
  height: 100%;
}

.ai-assessment {
  line-height: 1.8;
  color: #d7f2ff;
  font-size: 14px;
  padding: 4px 0;
}

:deep(.ai-section-title) {
  color: #f53f3f;
  display: block;
  margin-top: 14px;
  margin-bottom: 4px;
  font-size: 15px;
}

.ai-loading-text,
.ai-empty-text {
  text-align: center;
  padding: 24px;
  color: #8ec7e8;
  font-size: 14px;
}

:global(body.theme-light .political-security-page .ai-assessment),
:global(body.theme-light .political-security-page .ai-loading-text),
:global(body.theme-light .political-security-page .ai-empty-text) {
  color: #0a2540 !important;
  font-weight: 700;
}

:global(body.theme-light .political-security-page .ai-section-title) {
  color: #d9363e !important;
}

:deep(.arco-page-header-title) { color: #dbf2ff !important; font-weight: 600; }
:deep(.arco-card-header-title) { font-size: 19px !important; color: #dbf2ff !important; font-weight: 600; }
:deep(.arco-page-header-sub-title) { color: #8ec7e8 !important; }

:deep(.arco-radio-group-button) { background-color: rgba(0, 0, 0, 0.2); }
:deep(.arco-radio-button) { background-color: transparent; }
:deep(.arco-radio-button-content) { color: #8ec7e8; }
:deep(.arco-radio-button.arco-radio-checked) {
  background-color: #1f5b93 !important;
  border-color: #1f5b93 !important;
}
:deep(.arco-radio-button.arco-radio-checked .arco-radio-button-content) {
  color: #ffffff !important;
}

/* 浅色模式适配 */
:global(body.theme-light .political-security-page .arco-page-header-title),
:global(body.theme-light .political-security-page .arco-card-header-title) {
  color: #0a2f4d !important;
}

:global(body.theme-light .political-security-page .arco-page-header-sub-title) {
  color: #1d4f79 !important;
}

:global(body.theme-light .political-security-page .chart-card) {
  background: rgba(221, 239, 255, 0.92) !important;
  border-color: rgba(70, 136, 192, 0.26) !important;
}

:global(body.theme-light .political-security-page .method-item) {
  border-color: rgba(70, 136, 192, 0.28) !important;
  background: #f7fbff !important;
}

:global(body.theme-light .political-security-page .method-item strong) {
  color: #8a5a10 !important;
}

:global(body.theme-light .political-security-page .method-item span),
:global(body.theme-light .political-security-page .review-pod-portrait > p),
:global(body.theme-light .political-security-page .review-metric-copy > p) {
  color: #285b78 !important;
}

:global(body.theme-light .political-security-page .topic-list) {
  border-bottom-color: rgba(47, 139, 198, 0.28) !important;
}

:global(body.theme-light .political-security-page .review-pod) {
  border-color: rgba(var(--pod-color), 0.5) !important;
  background: radial-gradient(circle at 92% 12%, rgba(var(--pod-color), 0.12), transparent 38%), linear-gradient(145deg, #f8fcff, #e5f2fc) !important;
  box-shadow: 0 12px 26px rgba(42, 98, 158, 0.12), inset 0 1px 0 #fff !important;
}

:global(body.theme-light .political-security-page .kpi-sub) {
  color: #285b78 !important;
}

:global(body.theme-light .political-security-page .review-pod h3),
:global(body.theme-light .political-security-page .portrait-topic),
:global(body.theme-light .political-security-page .portrait-facts b) {
  color: #123e5d !important;
}

:global(body.theme-light .political-security-page .review-ring::before) {
  background: linear-gradient(145deg, #ffffff, #e8f4fb) !important;
}

:global(body.theme-light .political-security-page .review-ring i) {
  color: #174c6d !important;
}

:global(body.theme-light .political-security-page .portrait-facts > div) {
  border-color: rgba(38, 139, 109, 0.2) !important;
  background: rgba(235, 249, 244, 0.86) !important;
}

:global(body.theme-light .political-security-page .cockpit-chart) {
  border-color: rgba(70, 136, 192, 0.26) !important;
  background: #f7fbff !important;
}

:global(body.theme-light .political-security-page .cockpit-return-bar) {
  border-color: rgba(70, 136, 192, 0.24) !important;
  background: linear-gradient(90deg, #f4faff, #e7f3fd) !important;
}

:global(body.theme-light .political-security-page .cockpit-return-bar span) {
  color: #0a2f4d !important;
}

:global(body.theme-light .political-security-page .cockpit-chart.is-active) {
  border-color: rgba(55, 126, 190, 0.42) !important;
  background: linear-gradient(180deg, #fbfdff, #edf7ff) !important;
  box-shadow: 0 18px 34px rgba(42, 98, 158, 0.13), inset 0 0 42px rgba(70, 136, 192, 0.10) !important;
}

:global(body.theme-light .political-security-page .cockpit-chart h4) {
  color: #0a2f4d !important;
}

:global(body.theme-light .political-security-page .arco-radio-group-button),
:global(body.theme-light .political-security-page .arco-radio-button) {
  background-color: rgba(255, 255, 255, 0.5) !important;
}
:global(body.theme-light .political-security-page .arco-radio-button-content) {
  color: #1d4f79 !important;
}

:global(body.theme-light .political-security-page .arco-radio-button.arco-radio-checked) {
  background-color: #e8f3ff !important;
  border-color: #165dff !important;
}
:global(body.theme-light .political-security-page .arco-radio-button.arco-radio-checked .arco-radio-button-content) {
  color: #165dff !important;
}

:global(body.theme-light .political-security-page .kpi-item) {
  border-width: 1.5px !important;
  background:
    radial-gradient(circle at 92% 86%, color-mix(in srgb, var(--kpi-accent) 13%, transparent), transparent 30%),
    linear-gradient(145deg, color-mix(in srgb, var(--kpi-accent) 15%, transparent), rgba(255, 255, 255, 0.72) 54%),
    linear-gradient(180deg, rgba(244, 249, 255, 0.96), rgba(220, 236, 255, 0.96)) !important;
  box-shadow:
    inset 0 0 22px color-mix(in srgb, var(--kpi-accent) 8%, transparent),
    0 10px 20px rgba(48, 86, 104, 0.12) !important;
}

:global(body.theme-light .political-security-page .kpi-label) {
  color: color-mix(in srgb, var(--kpi-accent) 76%, #173f55) !important;
  text-shadow: none !important;
}

:global(body.theme-light .political-security-page .kpi-value) {
  color: color-mix(in srgb, var(--kpi-accent) 76%, #173f55) !important;
  text-shadow: 0 0 14px color-mix(in srgb, var(--kpi-accent) 18%, transparent) !important;
}

@media (max-width: 768px) {
  .kpi-strip { display: grid !important; grid-template-columns: 1fr 1fr; gap: 8px; }
  .topic-card-layout,
  .cockpit-grid,
  .method-grid,
  .review-metrics { grid-template-columns: 1fr; }
  .kpi-item { flex: none !important; }
  .kpi-item:last-child { grid-column: span 2; }
  .kpi-label { font-size: 14px !important; transform: none !important; text-align: center !important; }
  .kpi-value { font-size: 22px !important; text-align: center !important; }
  .kpi-value-text { font-size: 13px !important; }
  .kpi-accent { height: 2px !important; margin-bottom: 10px !important; }
  .cockpit-chart.is-active { min-height: 500px; }
  .cockpit-chart.is-active .chart-box { height: 438px; }
  .cockpit-return-bar { align-items: flex-start; flex-direction: column; }
  .topic-list { padding-right: 0; padding-bottom: 16px; border-right: 0; border-bottom: 1px solid rgba(82, 203, 255, 0.22); box-shadow: none; }
  .review-pod { min-height: 190px; }
  .portrait-topic { white-space: normal; }
}

@media (min-width: 769px) and (max-width: 1080px) {
  .review-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .review-pod-portrait { grid-column: span 2; }
}
</style>
