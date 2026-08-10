<template>
  <div class="dashboard">
    <BackHome />
    <a-page-header title="风险预警态势盘" subtitle="Risk Early Warning Dashboard" />

    <div class="kpi-strip">
      <div class="kpi-item kpi-red">
        <div class="kpi-accent"></div>
        <div class="kpi-label">本年度案件总数</div>
        <div class="kpi-value">{{ overview.totalCasesThisYear }}</div>
      </div>
      <div class="kpi-item kpi-cyan">
        <div class="kpi-accent"></div>
        <div class="kpi-label">高发案件类型</div>
        <div class="kpi-value kpi-value-text">{{ overview.highIncidenceTypes }}</div>
      </div>
      <div class="kpi-item kpi-orange">
        <div class="kpi-accent"></div>
        <div class="kpi-label">风险预警推送次数</div>
        <div class="kpi-value">{{ overview.riskAlertPushCount }}</div>
      </div>
      <div class="kpi-item kpi-yellow">
        <div class="kpi-accent"></div>
        <div class="kpi-label">检察建议发送次数</div>
        <div class="kpi-value">{{ overview.procuratorateSuggestions }}</div>
      </div>
      <div class="kpi-item kpi-blue">
        <div class="kpi-accent"></div>
        <div class="kpi-label">普法方案投递次数</div>
        <div class="kpi-value">{{ overview.legalPushCount }}</div>
      </div>
    </div>

    <a-row style="margin-top: 25px">
      <a-col :span="24">
        <RiskMapPanel :points="mapPoints" :height="620" />
        <div class="map-note">
          以上数据仅为预测的结果，不代表真实情况；地区的数据也不反映地区的治理能力的好坏
        </div>
      </a-col>
    </a-row>

    <a-card :bordered="false" class="trend-card" style="margin-top: 20px">
      <template #title>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>🤖 AI 风险研判摘要</span>
          <a-button type="primary" size="small" :loading="aiAssessing" @click="generateAssessment">
            {{ aiAssessment ? '重新研判' : '一键研判' }}
          </a-button>
        </div>
      </template>
      <div v-if="aiAssessing" class="ai-loading-text">
        AI 正在综合分析社区风险态势...
      </div>
      <div v-else-if="aiAssessment" class="ai-assessment" v-html="formatAssessment(aiAssessment)"></div>
      <div v-else class="ai-empty-text">
        点击「一键研判」，AI 将综合态势盘数据生成宏观治理决策建议
      </div>
    </a-card>

    <a-row :gutter="20" style="margin-top: 20px">
      <a-col :span="24">
        <a-card title="社区风险趋势图" :bordered="false" class="trend-card">
          <template #extra>
            <a-radio-group v-model="activeTab" type="button" size="small" @change="renderChart">
              <a-radio value="totalCases">案件总数</a-radio>
              <a-radio value="highIncidence">高发案件类型</a-radio>
              <a-radio value="riskAlert">风险预警推送次数</a-radio>
              <a-radio value="procuratorate">检察建议发送次数</a-radio>
              <a-radio value="legalPlan">普法方案投递次数</a-radio>
            </a-radio-group>
          </template>
          <div ref="chartRef" class="dashboard-chart-stage"></div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import BackHome from '../components/back-home.vue'
import RiskMapPanel from '../components/risk-map-panel.vue'
import { fetchCommunityRiskPoints, fetchDashboardOverview, fetchRiskTrend, fetchMultiTrend } from '../api/platform'
import { chatWithLLM } from '../services/llm'
import { USER_PROMPT_TEMPLATES } from '../services/prompts'
import type { CommunityRiskPoint, DashboardOverview, RiskTrendPoint, MultiTrendData } from '../types/platform'
import {
  CHART_PALETTES,
  areaGradient,
  chartAxis,
  chartTooltip,
  raisedBarStyle,
  rgbaHex,
  shadeHex
} from '../utils/chart-visual'

const chartRef = ref<HTMLDivElement | null>(null)
let myChart: echarts.ECharts | null = null
let themeObserver: MutationObserver | null = null

const overview = ref<DashboardOverview>({
  totalCasesThisYear: 0,
  highIncidenceTypes: '',
  riskAlertPushCount: 0,
  procuratorateSuggestions: 0,
  legalPushCount: 0
})
const trend = ref<RiskTrendPoint[]>([])
const mapPoints = ref<CommunityRiskPoint[]>([])
const multiTrend = ref<MultiTrendData[]>([])
const activeTab = ref('totalCases')

// Reactive theme for dashboard
const themeMode = ref<'light' | 'dark'>('dark')
const isLightTheme = computed(() => themeMode.value === 'light')
const syncThemeMode = () => {
  themeMode.value = document.body.classList.contains('theme-light') ? 'light' : 'dark'
}

const tabPalettes: Record<string, readonly string[]> = {
  totalCases: CHART_PALETTES.amberTeal,
  highIncidence: CHART_PALETTES.rainbow,
  riskAlert: CHART_PALETTES.political,
  procuratorate: CHART_PALETTES.violetCyan,
  legalPlan: CHART_PALETTES.governance
}

const getChartColors = () => {
  const palette = tabPalettes[activeTab.value] ?? CHART_PALETTES.rainbow
  return palette.map((color) => isLightTheme.value ? shadeHex(color, -24) : color)
}

const aiAssessing = ref(false)
const aiAssessment = ref('')

const generateAssessment = async () => {
  aiAssessing.value = true
  try {
    const o = overview.value
    const communities = mapPoints.value.map(p => `${p.community}(案件${p.annualCases || 0}件)`).join('、')

    const prompt = USER_PROMPT_TEMPLATES.dashboard({
      totalCases: o.totalCasesThisYear,
      highIncidenceTypes: o.highIncidenceTypes,
      riskAlertPushCount: o.riskAlertPushCount,
      procuratorateSuggestions: o.procuratorateSuggestions,
      legalPushCount: o.legalPushCount,
      communities
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

const getChartOption = (): echarts.EChartsOption => {
  const light = isLightTheme.value
  const axis = chartAxis(light)
  const chartColors = getChartColors()
  const dates = multiTrend.value.map((item) => item.date)
  const baseGrid = { left: 40, right: 20, top: 40, bottom: 35 }
  const baseXAxis = {
    type: 'category' as const,
    data: dates,
    axisLine: { lineStyle: { color: axis.line } },
    axisLabel: { color: axis.text, fontSize: 13 },
    axisTick: { show: false }
  }
  const baseYAxis = {
    type: 'value' as const,
    splitLine: { lineStyle: { color: axis.split, type: 'dashed' as const } },
    axisLabel: { color: axis.text, fontSize: 13 }
  }
  const baseOption = {
    backgroundColor: 'transparent',
    animationDuration: 1100,
    animationEasing: 'cubicOut' as const,
    animationDelay: (index: number) => index * 45,
    grid: baseGrid,
    tooltip: { trigger: 'axis' as const, ...chartTooltip(light, chartColors[0]) },
    xAxis: baseXAxis,
    yAxis: baseYAxis
  }
  const legendStyle = { color: axis.text, fontSize: 13, textShadowBlur: light ? 0 : 8, textShadowColor: 'rgba(57, 180, 255, .45)' }
  const barData = (values: number[], colors = chartColors) => values.map((value, index) => ({
    value,
    itemStyle: raisedBarStyle(colors[index % colors.length]!, index)
  }))
  const lineDecoration = (color: string) => ({
    smooth: true,
    symbol: 'circle',
    symbolSize: 9,
    lineStyle: { width: 3, color, shadowBlur: 14, shadowColor: rgbaHex(color, 0.62) },
    itemStyle: { color, borderColor: '#f6dfaa', borderWidth: 1.5, shadowBlur: 14, shadowColor: rgbaHex(color, 0.7) },
    areaStyle: { color: areaGradient(color, 0.4) },
    emphasis: { scale: true, scaleSize: 5 }
  })

  switch (activeTab.value) {
    case 'totalCases':
      return {
        ...baseOption,
        legend: { data: ['案件总数', '趋势'], textStyle: legendStyle },
        series: [
          {
            name: '案件总数',
            data: barData(multiTrend.value.map((item) => item.totalCases)),
            type: 'bar',
            barWidth: '40%',
            emphasis: { itemStyle: { shadowBlur: 30, shadowOffsetY: 14 } }
          },
          {
            name: '趋势',
            data: multiTrend.value.map((item) => item.totalCases),
            type: 'line',
            ...lineDecoration(chartColors[3]!)
          }
        ]
      }

    case 'highIncidence': {
      const categories = ['诈骗罪', '盗窃罪', '扰乱公共秩序', '相邻关系纠纷', '侵权责任纠纷']
      return {
        ...baseOption,
        legend: { data: categories, textStyle: legendStyle },
        series: categories.map((cat, i) => ({
          name: cat,
          type: 'bar' as const,
          stack: 'highIncidence',
          data: multiTrend.value.map((item) => Math.round(item.highIncidenceCount * ((i + 1) / 10))),
          itemStyle: raisedBarStyle(chartColors[i % chartColors.length]!, i),
          emphasis: { itemStyle: { shadowBlur: 28, shadowOffsetY: 12 } }
        }))
      }
    }

    case 'riskAlert':
      return {
        ...baseOption,
        legend: { data: ['推送次数', '趋势'], textStyle: legendStyle },
        series: [
          {
            name: '推送次数',
            data: barData(multiTrend.value.map((item) => item.riskAlertPush)),
            type: 'bar',
            barWidth: '40%'
          },
          {
            name: '趋势',
            data: multiTrend.value.map((item) => item.riskAlertPush),
            type: 'line',
            ...lineDecoration(chartColors[4]!)
          }
        ]
      }

    case 'procuratorate': {
      const procCategories = ['刑事检察', '民事检察', '行政检察', '公益诉讼检察']
      return {
        ...baseOption,
        legend: { data: procCategories, textStyle: legendStyle },
        series: procCategories.map((cat, i) => ({
          name: cat,
          type: 'bar' as const,
          stack: 'procuratorate',
          data: multiTrend.value.map((item) => Math.round(item.procuratorateSuggestion * ((i + 1) / 4))),
          itemStyle: raisedBarStyle(chartColors[i % chartColors.length]!, i)
        }))
      }
    }

    case 'legalPlan': {
      const planTypes = ['线上推送', '线下活动', '社区宣讲']
      return {
        ...baseOption,
        legend: { data: planTypes, textStyle: legendStyle },
        series: planTypes.map((t, i) => ({
          name: t,
          type: 'bar' as const,
          stack: 'legalPlan',
          data: multiTrend.value.map((item) => Math.round(item.legalPlanDelivery * ((i + 1) / 3))),
          itemStyle: raisedBarStyle(chartColors[i % chartColors.length]!, i)
        }))
      }
    }

    default:
      return {}
  }
}

const renderChart = () => {
  if (!chartRef.value) return
  if (!myChart) {
    myChart = echarts.init(chartRef.value)
  }
  myChart.clear()
  myChart.setOption(getChartOption())
}

watch(activeTab, () => {
  renderChart()
})

onMounted(async () => {
  const [overviewData, trendData, mapData, multiTrendData] = await Promise.all([
    fetchDashboardOverview(),
    fetchRiskTrend(),
    fetchCommunityRiskPoints(),
    fetchMultiTrend()
  ])
  overview.value = overviewData
  trend.value = trendData
  mapPoints.value = mapData
  multiTrend.value = multiTrendData
  syncThemeMode()
  renderChart()

  // 主题切换时重绘图表，避免浅色模式仍沿用深色图例与坐标文字
  themeObserver = new MutationObserver(() => {
    syncThemeMode()
    renderChart()
  })
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] })
})

onUnmounted(() => {
  themeObserver?.disconnect()
  themeObserver = null
  myChart?.dispose()
  myChart = null
})
</script>

<style scoped>
.dashboard :deep(.arco-page-header) {
  background: linear-gradient(90deg, rgba(79, 174, 255, 0.18), rgba(14, 34, 68, 0.65));
  border-radius: 10px;
  border: 1px solid rgba(98, 189, 255, 0.3);
}

.dashboard :deep(.arco-page-header-title) {
  color: #e8f9ff;
}

.dashboard :deep(.arco-page-header-sub-title) {
  color: #9cd9ff;
}

.stat-card,
.trend-card {
  border: 1px solid rgba(226, 203, 142, 0.34);
  background: linear-gradient(180deg, rgba(14, 39, 78, 0.78), rgba(9, 24, 47, 0.85));
  box-shadow:
    0 18px 38px rgba(0, 0, 0, 0.26),
    0 0 22px rgba(71, 174, 238, 0.1),
    inset 0 1px 0 rgba(255, 240, 196, 0.09);
}

.dashboard-chart-stage {
  width: 100%;
  height: 600px;
  border-radius: 8px;
  border: 1px solid rgba(172, 218, 244, 0.16);
  background:
    linear-gradient(rgba(77, 154, 205, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(77, 154, 205, 0.06) 1px, transparent 1px),
    radial-gradient(ellipse at 50% 86%, rgba(46, 154, 221, 0.12), transparent 52%),
    rgba(2, 16, 35, 0.24);
  background-size: 34px 34px, 34px 34px, auto, auto;
  box-shadow: inset 0 -26px 54px rgba(1, 8, 22, 0.24);
}

/* ===== KPI 卡片条 ===== */
.kpi-strip {
  display: flex;
  gap: 16px;
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

.kpi-red {
  background: linear-gradient(160deg, rgba(78, 30, 42, 0.88), rgba(34, 14, 22, 0.94));
}

.kpi-cyan {
  background: linear-gradient(160deg, rgba(17, 52, 84, 0.86), rgba(9, 28, 50, 0.94));
}

.kpi-orange {
  background: linear-gradient(160deg, rgba(82, 49, 18, 0.88), rgba(39, 23, 10, 0.94));
}

.kpi-yellow {
  background: linear-gradient(160deg, rgba(74, 63, 21, 0.88), rgba(36, 30, 11, 0.94));
}

.kpi-blue {
  background: linear-gradient(160deg, rgba(24, 52, 80, 0.88), rgba(11, 26, 41, 0.94));
}

.kpi-label {
  font-size: 20px;
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
  font-size: 25px !important;
  font-weight: 700;
  padding-top: 6px;
}

.kpi-red .kpi-value   { color: #e8a0a5; }
.kpi-cyan .kpi-value   { color: #5ad6ff; }
.kpi-orange .kpi-value { color: #ffb347; }
.kpi-yellow .kpi-value { color: #f5d862; }
.kpi-blue .kpi-value   { color: #5b9fd4; }
/* ===== /KPI ===== */

.trend-card :deep(canvas) {
  background-color: transparent;
  background-image: none;
  color: rgba(78, 89, 105, 1);
}

.dashboard :deep(.arco-card-header-title) {
  color: #d8f3ff;
}


.map-note {
  margin-top: 8px;
  color: #8ec7e8;
  font-size: 12px;

  line-height: 1.5;
  padding-left: 2px;
}

/* 趋势图 tab 按钮深色主题 */
.dashboard :deep(.arco-radio-group-button) {
  background: rgba(13, 30, 56, 0.8);
  border-color: rgba(108, 201, 255, 0.28);
}

.dashboard :deep(.arco-radio-button) {
  color: #8ec7e8;
  background: transparent;
  border-color: rgba(108, 201, 255, 0.25);
}

.dashboard :deep(.arco-radio-button:hover) {
  color: #b6e7ff;
  background: rgba(81, 182, 255, 0.12);
}

.dashboard :deep(.arco-radio-button.arco-radio-button-checked),
.dashboard :deep(.arco-radio-button.arco-radio-button-checked:hover) {
  color: #ffffff;
  background: linear-gradient(180deg, rgba(83, 195, 255, 0.38), rgba(46, 129, 255, 0.3));
  border-color: rgba(83, 195, 255, 0.5);
}

.ai-assessment {
  line-height: 1.8;
  color: #d7f2ff;
  font-size: 14px;
  padding: 4px 0;
}

:deep(.ai-section-title) {
  color: #5ad6ff;
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

:global(body.theme-light) .dashboard,
:global(body.theme-light) .dashboard * {
  color: #0f2e4f !important;
}

:global(body.theme-light) .dashboard .kpi-item,
:global(body.theme-light) .dashboard .trend-card,
:global(body.theme-light) .dashboard .stat-card,
:global(body.theme-light) .dashboard :deep(.arco-card) {
  background: linear-gradient(180deg, #f4f9ff, #dcecff) !important;
  border-color: #4a8ac4 !important;
  box-shadow: 0 6px 16px rgba(42, 98, 158, 0.12) !important;
}

:global(body.theme-light) .dashboard .kpi-label,
:global(body.theme-light) .dashboard .kpi-value,
:global(body.theme-light) .dashboard :deep(.arco-card-header-title),
:global(body.theme-light) .dashboard :deep(.arco-page-header-title),
:global(body.theme-light) .dashboard .map-note,
:global(body.theme-light) .dashboard .ai-assessment,
:global(body.theme-light) .dashboard .ai-loading-text,
:global(body.theme-light) .dashboard .ai-empty-text {
  color: #0a2540 !important;
  font-weight: 700;
}

:global(body.theme-light) .dashboard .kpi-item {
  border-width: 1.5px !important;
}

:global(body.theme-light) .dashboard .kpi-red {
  background: linear-gradient(160deg, rgba(255, 235, 238, 0.98), rgba(248, 213, 220, 0.98)) !important;
}

:global(body.theme-light) .dashboard .kpi-cyan {
  background: linear-gradient(160deg, rgba(232, 247, 255, 0.98), rgba(204, 235, 252, 0.98)) !important;
}

:global(body.theme-light) .dashboard .kpi-orange {
  background: linear-gradient(160deg, rgba(255, 244, 231, 0.98), rgba(252, 225, 194, 0.98)) !important;
}

:global(body.theme-light) .dashboard .kpi-yellow {
  background: linear-gradient(160deg, rgba(255, 250, 230, 0.98), rgba(250, 238, 182, 0.98)) !important;
}

:global(body.theme-light) .dashboard .kpi-blue {
  background: linear-gradient(160deg, rgba(235, 244, 255, 0.98), rgba(207, 227, 249, 0.98)) !important;
}

:global(body.theme-light) .dashboard .kpi-label {
  color:rgb(30, 126, 215) !important;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.2px;
  background: rgba(226, 241, 253, 0.92) !important;
  border: 1px solid rgba(96, 153, 205, 0.35) !important;
  border-radius: 6px;
  padding: 2px 8px;
}

:global(body.theme-light) .dashboard .kpi-value {
  color: #0a2b48 !important;
  text-shadow: none !important;
}

:global(body.theme-light) .dashboard .kpi-red .kpi-value { color: #9c2f3a !important; }
:global(body.theme-light) .dashboard .kpi-cyan .kpi-value { color: #1a5a94 !important; }
:global(body.theme-light) .dashboard .kpi-orange .kpi-value { color: #b55f1f !important; }
:global(body.theme-light) .dashboard .kpi-yellow .kpi-value { color: #7a6f1f !important; }
:global(body.theme-light) .dashboard .kpi-blue .kpi-value { color: #1a4a8a !important; }

:global(body.theme-light) .dashboard :deep(.arco-radio-group-button) {
  background: #e0f0ff !important;
  border-color: #4a8ac4 !important;
  color: #0a2540 !important;
}

:global(body.theme-light) .dashboard :deep(.arco-radio-button.arco-radio-button-checked),
:global(body.theme-light) .dashboard :deep(.arco-radio-button.arco-radio-button-checked:hover) {
  color: #0a2f4d !important;
  background: linear-gradient(180deg, rgba(158, 211, 248, 0.95), rgba(127, 191, 238, 0.95)) !important;
  border-color: rgba(52, 123, 180, 0.62) !important;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.55);
}

:global(body.theme-light) .dashboard :deep(.ai-section-title) {
  color: #1d4f79 !important;
}

/* ===== 手机端适配 ===== */
@media (max-width: 768px) {
  .dashboard-chart-stage {
    height: 300px;
  }

  .kpi-strip {
    display: grid !important;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .kpi-item {
    flex: none !important;
  }

  .kpi-item:last-child {
    grid-column: span 2;
  }

  .kpi-label {
    font-size: 12px !important;
    transform: none !important;
    text-align: center !important;
  }

  .kpi-value {
    font-size: 22px !important;
    text-align: center !important;
  }

  .kpi-value-text {
    font-size: 13px !important;
  }

  .kpi-accent {
    height: 2px !important;
    margin-bottom: 10px !important;
  }
}
</style>
