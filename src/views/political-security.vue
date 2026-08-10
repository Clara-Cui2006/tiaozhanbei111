<template>
  <div class="political-security-page">
    <BackHome />
    <a-page-header title="政治安全态势" subtitle="Political Security Dashboard">
      <template #tags>
         <a-tag color="red" size="small">高保密级</a-tag>
      </template>
    </a-page-header>

    <div class="kpi-strip">
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

    <a-row :gutter="16" class="dashboard-row">
      <a-col :span="24">
        <a-card :bordered="false" class="chart-card topic-card">
          <template #title>西城重点专题与复核状态</template>
          <div class="topic-card-layout">
            <div class="topic-list">
              <a-tag v-for="topic in priorityTopics" :key="topic" color="orangered" size="large">{{ topic }}</a-tag>
            </div>
            <div class="review-metrics">
              <div>
                <div class="review-metric-copy">
                  <span>人工复核案件总量</span>
                  <strong>{{ overview.pendingManualReview || 0 }}</strong>
                </div>
                <div class="mini-ring" :style="ringStyle(overview.pendingManualReviewRate)">
                  <i>{{ formatRate(overview.pendingManualReviewRate) }}</i>
                </div>
              </div>
              <div>
                <div class="review-metric-copy">
                  <span>重点专题案件总量</span>
                  <strong>{{ overview.highConcernRisks || 0 }}</strong>
                </div>
                <div class="mini-ring" :style="ringStyle(overview.highConcernRiskRate)">
                  <i>{{ formatRate(overview.highConcernRiskRate) }}</i>
                </div>
              </div>
              <div class="review-metric-note">
                <span>识别口径</span>
                <p>结合案件分类标签、风险规则匹配和人工复核结果综合判断。</p>
              </div>
            </div>
          </div>
          <a-alert type="info" class="method-alert">“高风险/高关注”不单纯依据案件数量判断，需结合案件分类标签、风险规则匹配和人工复核结果；高发风险类型可按案件数量排序。</a-alert>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" class="dashboard-row">
      <a-col :span="24">
        <RiskMapPanel :height="660" :default-overlay-political="true" />
      </a-col>
    </a-row>

    <a-row :gutter="16" class="dashboard-row">
      <a-col :span="24">
        <a-card :bordered="false" class="chart-card trend-card">
          <template #title>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>🤖 AI 核心政务区政治安全研判摘要</span>
              <a-button type="primary" status="danger" size="small" :loading="aiAssessing" @click="generateAssessment">
                {{ aiAssessment ? '重新研判' : '一键研判' }}
              </a-button>
            </div>
          </template>
          <div v-if="aiAssessing" class="ai-loading-text">
            AI 正在高保密级环境下，综合分析核心政务区政治安全风险态势...
          </div>
          <div v-else-if="aiAssessment" class="ai-assessment" v-html="formatAssessment(aiAssessment)"></div>
          <div v-else class="ai-empty-text">
            点击「一键研判」，AI 将综合政治安全数据生成保密级宏观防范与管控决策建议
          </div>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" class="dashboard-row">
      <a-col :span="24">
        <a-card title="数据驾驶舱" class="chart-card" :bordered="false">
          <div class="cockpit-grid">
            <div class="cockpit-chart"><h4>地点因素</h4><div ref="locationChartRef" class="chart-box"></div></div>
            <div class="cockpit-chart"><h4>行为内容</h4><div ref="behaviorChartRef" class="chart-box"></div></div>
            <div class="cockpit-chart"><h4>涉及主体</h4><div ref="subjectChartRef" class="chart-box"></div></div>
            <div class="cockpit-chart"><h4>时间因素</h4><div ref="timeChartRef" class="chart-box"></div></div>
          </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import BackHome from '../components/back-home.vue'
import RiskMapPanel from '../components/risk-map-panel.vue'
import { fetchPoliticalMonthlyTrend, fetchPoliticalStreetStats, fetchPoliticalOverview } from '../api/platform'
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
const behaviorChartRef = ref<HTMLElement | null>(null)
const subjectChartRef = ref<HTMLElement | null>(null)
const timeChartRef = ref<HTMLElement | null>(null)

let locationChart: echarts.ECharts | null = null
let behaviorChart: echarts.ECharts | null = null
let subjectChart: echarts.ECharts | null = null
let timeChart: echarts.ECharts | null = null
let themeObserver: MutationObserver | null = null

const trendData = ref<PoliticalMonthlyTrend[]>([])
const streetData = ref<PoliticalStreetStat[]>([])

// ================== AI 研判逻辑 ==================
const overview = ref<PoliticalOverview>({
  totalSignalsThisYear: 0,
  highIncidenceTypes: '',
  riskAlertPushCount: 0,
  procuratorateSuggestions: 0,
  majorEventCoupling: ''
})
const defaultPriorityTopics = ['涉外风险']
const priorityTopics = computed(() => (overview.value.priorityTopics?.length ? overview.value.priorityTopics : defaultPriorityTopics).filter((topic) => topic === '涉外风险'))
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
  locationChart = renderPie(locationChartRef.value, locationChart, '地点因素', streetData.value.map((item) => ({ name: item.community, value: item.count })), CHART_PALETTES.caseBlue)
  const total = overview.value.totalSignalsThisYear || streetData.value.reduce((sum, item) => sum + item.count, 0)
  behaviorChart = renderPie(behaviorChartRef.value, behaviorChart, '行为内容', buildSyntheticDistribution(behaviorNames, total, 7), CHART_PALETTES.political)
  subjectChart = renderPie(subjectChartRef.value, subjectChart, '涉及主体', buildSyntheticDistribution(subjectNames, total, 13), CHART_PALETTES.violetCyan)
  timeChart?.dispose()
  if (timeChartRef.value) {
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
  const [tData, sData, oData] = await Promise.all([
    fetchPoliticalMonthlyTrend(),
    fetchPoliticalStreetStats(),
    fetchPoliticalOverview()
  ])
  trendData.value = tData
  streetData.value = sData
  overview.value = oData
  renderCharts()
}

const handleResize = () => {
  locationChart?.resize()
  behaviorChart?.resize()
  subjectChart?.resize()
  timeChart?.resize()
}

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
.political-security-page { padding-bottom: 20px; }
.dashboard-row { margin-top: 16px; margin-bottom: 16px; }

/* ===== KPI 卡片条：样式完全对标 index.vue ===== */
.kpi-strip {
  display: flex;
  gap: 16px;
  margin-top: 16px;
}

.kpi-item {
  flex: 1;
  min-width: 0;
  border-radius: 10px;
  border: 1px solid rgba(93, 191, 255, 0.18);
  background: linear-gradient(160deg, rgba(14, 39, 78, 0.82), rgba(8, 20, 44, 0.92));
  padding: 0 0 18px;
  overflow: hidden;
  transition: transform 0.2s;
}

.kpi-item:hover {
  transform: translateY(-2px);
}

.kpi-accent {
  height: 3px;
  width: 100%;
  margin-bottom: 14px;
}

.kpi-red .kpi-accent   { background: linear-gradient(90deg, #e06c75, rgba(224,108,117,0.2)); }
.kpi-cyan .kpi-accent   { background: linear-gradient(90deg, #5ad6ff, rgba(90,214,255,0.2)); }
.kpi-orange .kpi-accent { background: linear-gradient(90deg, #ffb347, rgba(255,179,71,0.2)); }
.kpi-yellow .kpi-accent { background: linear-gradient(90deg, #f5d862, rgba(245,216,98,0.2)); }
.kpi-blue .kpi-accent   { background: linear-gradient(90deg, #5b9fd4, rgba(91,159,212,0.2)); }

.kpi-red { background: linear-gradient(160deg, rgba(78, 30, 42, 0.88), rgba(34, 14, 22, 0.94)); }
.kpi-cyan { background: linear-gradient(160deg, rgba(17, 52, 84, 0.86), rgba(9, 28, 50, 0.94)); }
.kpi-orange { background: linear-gradient(160deg, rgba(82, 49, 18, 0.88), rgba(39, 23, 10, 0.94)); }
.kpi-yellow { background: linear-gradient(160deg, rgba(74, 63, 21, 0.88), rgba(36, 30, 11, 0.94)); }
.kpi-blue { background: linear-gradient(160deg, rgba(24, 52, 80, 0.88), rgba(11, 26, 41, 0.94)); }

.kpi-label {
  font-size: 20px; /* 调大字号，对齐 index.vue */
  color: #7cc1ec;
  padding: 0 16px;
  margin-bottom: 8px;
  text-align: center;
  transform: translateY(-10px);
}

.kpi-value {
  font-size: 32px;
  font-weight: 800;
  padding: 0 16px;
  line-height: 1;
  text-align: center;
}

.kpi-value-text {
  font-size: 24px !important; /* 调大字号，对齐 index.vue */
  font-weight: 700;
  padding-top: 6px;
  line-height: 1.3;
}

.kpi-sub {
  margin-top: 8px;
  padding: 0 16px;
  color: rgba(219, 242, 255, 0.82);
  font-size: 13px;
  text-align: center;
}

.kpi-red .kpi-value   { color: #e8a0a5; }
.kpi-cyan .kpi-value   { color: #5ad6ff; }
.kpi-orange .kpi-value { color: #ffb347; }
.kpi-yellow .kpi-value { color: #f5d862; }
.kpi-blue .kpi-value   { color: #5b9fd4; }

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
  grid-template-columns: minmax(160px, 0.28fr) minmax(0, 1fr);
  gap: 18px;
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
  gap: 10px;
  align-content: flex-start;
}

.review-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.review-metrics > div {
  position: relative;
  display: flex;
  min-height: 112px;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid rgba(119, 190, 235, 0.22);
  background: linear-gradient(135deg, rgba(27, 78, 120, 0.42), rgba(8, 30, 58, 0.72));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.review-metrics span {
  display: block;
  margin-bottom: 8px;
  color: #9fd9ff;
  font-size: 14px;
}

.review-metrics strong {
  display: block;
  color: #d9f2ff;
  font-size: 28px;
}

.review-metric-copy {
  min-width: 0;
}

.mini-ring {
  --ring-value: 0%;
  position: relative;
  width: 58px;
  height: 58px;
  flex: 0 0 58px;
  border-radius: 50%;
  background: conic-gradient(#69c7f3 var(--ring-value), rgba(120, 185, 225, 0.18) 0);
  box-shadow: 0 8px 20px rgba(5, 28, 58, 0.24);
}

.mini-ring::after {
  content: '';
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  background: #0b2747;
}

.mini-ring i {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #dff7ff;
  font-size: 11px;
  font-style: normal;
  font-weight: 700;
}

.review-metric-note {
  align-items: flex-start !important;
  justify-content: center !important;
}

.review-metric-note p {
  margin: 0;
  color: #c2e8fb;
  font-size: 13px;
  line-height: 1.65;
}

.cockpit-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
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
  transition: transform 0.28s ease, box-shadow 0.28s ease;
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
:global(body.theme-light .political-security-page .review-metrics span) {
  color: #285b78 !important;
}

:global(body.theme-light .political-security-page .review-metrics > div) {
  border-color: rgba(70, 136, 192, 0.24) !important;
  background: linear-gradient(135deg, #f5fbff, #e7f3fd) !important;
}

:global(body.theme-light .political-security-page .review-metrics strong) {
  color: #0f4f7b !important;
}

:global(body.theme-light .political-security-page .kpi-sub) {
  color: #285b78 !important;
}

:global(body.theme-light .political-security-page .mini-ring::after) {
  background: #f5fbff !important;
}

:global(body.theme-light .political-security-page .mini-ring i) {
  color: #0f4f7b !important;
}

:global(body.theme-light .political-security-page .review-metric-note p) {
  color: #285b78 !important;
}

:global(body.theme-light .political-security-page .cockpit-chart) {
  border-color: rgba(70, 136, 192, 0.26) !important;
  background: #f7fbff !important;
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
  background: linear-gradient(180deg, #f4f9ff, #dcecff) !important;
  border-color: #4a8ac4 !important;
  box-shadow: 0 6px 16px rgba(42, 98, 158, 0.12) !important;
  border-width: 1.5px !important;
}

:global(body.theme-light .political-security-page .kpi-red) { background: linear-gradient(160deg, rgba(255, 235, 238, 0.98), rgba(248, 213, 220, 0.98)) !important; }
:global(body.theme-light .political-security-page .kpi-cyan) { background: linear-gradient(160deg, rgba(232, 247, 255, 0.98), rgba(204, 235, 252, 0.98)) !important; }
:global(body.theme-light .political-security-page .kpi-orange) { background: linear-gradient(160deg, rgba(255, 244, 231, 0.98), rgba(252, 225, 194, 0.98)) !important; }
:global(body.theme-light .political-security-page .kpi-yellow) { background: linear-gradient(160deg, rgba(255, 250, 230, 0.98), rgba(250, 238, 182, 0.98)) !important; }
:global(body.theme-light .political-security-page .kpi-blue) { background: linear-gradient(160deg, rgba(235, 244, 255, 0.98), rgba(207, 227, 249, 0.98)) !important; }

:global(body.theme-light .political-security-page .kpi-label) {
  color: rgb(30, 126, 215) !important;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.2px;
  background: rgba(226, 241, 253, 0.92) !important;
  border: 1px solid rgba(96, 153, 205, 0.35) !important;
  border-radius: 6px;
  padding: 2px 8px;
}

:global(body.theme-light .political-security-page .kpi-value) { color: #0a2b48 !important; text-shadow: none !important; }
:global(body.theme-light .political-security-page .kpi-red .kpi-value) { color: #9c2f3a !important; }
:global(body.theme-light .political-security-page .kpi-cyan .kpi-value) { color: #1a5a94 !important; }
:global(body.theme-light .political-security-page .kpi-orange .kpi-value) { color: #b55f1f !important; }
:global(body.theme-light .political-security-page .kpi-yellow .kpi-value) { color: #7a6f1f !important; }
:global(body.theme-light .political-security-page .kpi-blue .kpi-value) { color: #1a4a8a !important; }

@media (max-width: 768px) {
  .kpi-strip { display: grid !important; grid-template-columns: 1fr 1fr; gap: 8px; }
  .topic-card-layout,
  .cockpit-grid,
  .method-grid,
  .review-metrics { grid-template-columns: 1fr; }
  .kpi-item { flex: none !important; }
  .kpi-item:last-child { grid-column: span 2; }
  .kpi-label { font-size: 22px !important; transform: none !important; text-align: center !important; }
  .kpi-value { font-size: 22px !important; text-align: center !important; }
  .kpi-value-text { font-size: 13px !important; }
  .kpi-accent { height: 2px !important; margin-bottom: 10px !important; }
}
</style>
