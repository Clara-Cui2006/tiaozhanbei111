<template>
  <div class="dashboard cockpit-page">
    <div class="cockpit-grid" :class="{ 'cockpit-grid--focused': focusedPanel }">
      <DashboardFocusPanel v-model="focusedPanel" panel-key="indices" title="风险综合指标" eyebrow="RISK INDEX" class="indices-focus-panel">
        <template #default="{ focused }">
          <div class="index-stack" :class="{ 'index-stack--focused': focused }">
            <article v-for="item in indexCards" :key="item.label" class="index-card" :class="`index-card--${item.tone}`">
              <div><span>{{ item.label }}</span><small>{{ item.hint }}</small></div>
              <strong :class="{ 'index-card__text': item.text }">{{ item.value }}</strong>
            </article>
            <div class="assessment-content">
              <div class="assessment-heading">
                <span>研判辅助</span>
                <a-button type="primary" size="mini" :loading="aiAssessing" @click="generateAssessment">
                  {{ aiAssessment ? '重新生成草稿' : '生成草稿' }}
                </a-button>
              </div>
              <div v-if="aiAssessing" class="ai-loading-text">正在生成辅助草稿...</div>
              <div v-else-if="aiAssessment" class="ai-assessment" v-html="formatAssessment(aiAssessment)"></div>
              <div v-else class="ai-empty-text">AI 仅辅助生成草稿，最终结论须由人工复核。</div>
              <div v-if="focused" class="index-detail-grid">
                <section>
                  <h3>指标使用边界</h3>
                  <p>风险指数用于总体观察、排序和变化提示，不直接等同于法律监督结论。</p>
                  <p>单条事项是否转入检察履职，仍须结合原始材料和人工复核结果。</p>
                </section>
                <section>
                  <h3>重点街道对照</h3>
                  <div v-for="point in topStreetPoints" :key="`index-${point.community}`" class="detail-rank-row">
                    <span>{{ point.community }}</span><i><b :style="{ width: `${point.percent}%` }"></b></i><strong>{{ point.annualCases }}</strong>
                  </div>
                </section>
                <section>
                  <h3>履职联动结构</h3>
                  <div v-for="item in workflowMetrics" :key="`index-${item.label}`" class="detail-rank-row">
                    <span>{{ item.label }}</span><i><b :style="{ width: `${item.percent}%` }"></b></i><strong>{{ item.value }}</strong>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </template>
      </DashboardFocusPanel>

      <DashboardFocusPanel v-model="focusedPanel" panel-key="map" title="西城区风险空间态势" eyebrow="SPATIAL DISTRIBUTION" class="map-focus-panel">
        <template #default="{ focused }">
          <RiskMapPanel
            :points="mapPoints"
            :height="focused ? 350 : 345"
            :display-mode="focused ? 'focus' : 'cockpit'"
          />
        </template>
      </DashboardFocusPanel>

      <DashboardFocusPanel v-model="focusedPanel" panel-key="trend" title="社区风险趋势" eyebrow="RISK TREND" class="trend-focus-panel">
        <template #default="{ focused }">
          <div class="analysis-stack" :class="{ 'analysis-stack--focused': focused }">
            <div class="trend-chart-block">
              <div class="trend-toolbar">
                <a-radio-group v-model="activeTab" type="button" size="small" @change="renderChart">
                  <a-radio value="totalCases">案件总数</a-radio>
                  <a-radio value="highIncidence">高发类型</a-radio>
                  <a-radio value="riskAlert">预警推送</a-radio>
                  <a-radio value="procuratorate">检察建议</a-radio>
                  <a-radio value="legalPlan">普法投递</a-radio>
                </a-radio-group>
              </div>
              <div ref="chartRef" class="dashboard-chart-stage"></div>
            </div>
            <div class="mini-analysis-grid">
              <section class="mini-chart-card">
                <h3>重点街道</h3>
                <div v-for="point in topStreetPoints" :key="point.community" class="mini-bar-row">
                  <span>{{ point.community }}</span><i><b :style="{ width: `${point.percent}%` }"></b></i><em>{{ point.annualCases }}</em>
                </div>
              </section>
              <section class="mini-chart-card">
                <h3>履职联动</h3>
                <div v-for="item in workflowMetrics" :key="item.label" class="workflow-meter">
                  <div><span>{{ item.label }}</span><strong>{{ item.value }}</strong></div>
                  <i><b :style="{ width: `${item.percent}%` }"></b></i>
                </div>
              </section>
            </div>
          </div>
        </template>
      </DashboardFocusPanel>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'
import 'echarts-gl'
import DashboardFocusPanel from '../components/dashboard-focus-panel.vue'
import RiskMapPanel from '../components/risk-map-panel.vue'
import { fetchCommunityRiskPoints, fetchDashboardOverview, fetchRiskTrend, fetchMultiTrend } from '../api/platform'
import { chatWithLLM } from '../services/llm'
import { USER_PROMPT_TEMPLATES } from '../services/prompts'
import type { CommunityRiskPoint, DashboardOverview, RiskTrendPoint, MultiTrendData } from '../types/platform'
import {
  areaGradient,
  chartAxis,
  chartTooltip,
  raisedBarStyle,
  rgbaHex,
  shadeHex
} from '../utils/chart-visual'

const chartRef = ref<HTMLDivElement | null>(null)
const route = useRoute()
const router = useRouter()
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
const focusedPanel = ref('')
const focusKeys = new Set(['indices', 'map', 'trend'])

const indexCards = computed(() => [
  { label: '本年度案件总数', value: overview.value.totalCasesThisYear, hint: '当前统计口径', tone: 'red' },
  { label: '高发案件类型', value: overview.value.highIncidenceTypes || '暂无数据', hint: '当前最高频类型', tone: 'cyan', text: true },
  { label: '风险预警推送', value: overview.value.riskAlertPushCount, hint: '履职联动次数', tone: 'orange' },
  { label: '检察建议', value: overview.value.procuratorateSuggestions, hint: '已发送次数', tone: 'yellow' },
  { label: '普法方案投递', value: overview.value.legalPushCount, hint: '已投递次数', tone: 'blue' }
])
const topStreetPoints = computed(() => {
  const sorted = [...mapPoints.value].sort((a, b) => (b.annualCases || 0) - (a.annualCases || 0)).slice(0, 4)
  const max = Math.max(1, ...sorted.map((item) => item.annualCases || 0))
  return sorted.map((item) => ({ ...item, percent: Math.round(((item.annualCases || 0) / max) * 100) }))
})
const workflowMetrics = computed(() => {
  const values = [
    { label: '预警推送', value: overview.value.riskAlertPushCount },
    { label: '检察建议', value: overview.value.procuratorateSuggestions },
    { label: '普法投递', value: overview.value.legalPushCount }
  ]
  const max = Math.max(1, ...values.map((item) => item.value))
  return values.map((item) => ({ ...item, percent: Math.round((item.value / max) * 100) }))
})

// Reactive theme for dashboard
const themeMode = ref<'light' | 'dark'>('dark')
const isLightTheme = computed(() => themeMode.value === 'light')
const syncThemeMode = () => {
  themeMode.value = document.body.classList.contains('theme-light') ? 'light' : 'dark'
}

const dashboard3DColors = ['#0B56C8', '#0874D6', '#0B91C8', '#2446D0', '#4734CA', '#5A3CC6'] as const

const getChartColors = () => {
  return dashboard3DColors.map((color) => isLightTheme.value ? shadeHex(color, -18) : color)
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

const getDashboard3DChartOption = (): echarts.EChartsOption => {
  const light = isLightTheme.value
  const chartColors = getChartColors()
  const sourceDates = multiTrend.value.map((item) => item.date)
  const dates = sourceDates.length ? sourceDates : ['暂无数据']
  type MetricSeries = { name: string; values: number[] }

  const build3DOption = (title: string, metrics: MetricSeries[]) => {
    const normalizedMetrics = metrics.length ? metrics : [{ name: '当前统计', values: dates.map(() => 0) }]
    const metricNames = normalizedMetrics.map((item) => item.name)
    const hasAnyValue = normalizedMetrics.some((metric) => metric.values.some((value) => value > 0))
    const data = normalizedMetrics.flatMap((metric, metricIndex) =>
      dates.map((date, dateIndex) => {
        const color = chartColors[metricIndex % chartColors.length]!
        return {
          value: [dateIndex, metricIndex, metric.values[dateIndex] ?? 0],
          itemStyle: {
            color: rgbaHex(color, light ? 0.84 : 0.88),
            borderColor: rgbaHex(shadeHex(color, 44), 0.72),
            borderWidth: 1
          }
        }
      })
    )

    return {
      backgroundColor: light ? 'rgba(236, 248, 255, 0.86)' : 'rgba(3, 18, 42, 0.96)',
      animationDuration: 1000,
      animationEasing: 'cubicOut',
      title: {
        text: title,
        left: 18,
        top: 12,
        textStyle: {
          color: light ? '#123963' : '#d8f5ff',
          fontSize: 15,
          fontWeight: 700
        }
      },
      tooltip: {
        backgroundColor: light ? 'rgba(255,255,255,.96)' : 'rgba(4,18,42,.95)',
        borderColor: rgbaHex(chartColors[0]!, 0.45),
        borderWidth: 1,
        textStyle: { color: light ? '#173b5d' : '#d9f7ff', fontSize: 13 },
        formatter: (params: any) => {
          const value = params.value || []
          const date = dates[value[0]] ?? ''
          const metric = metricNames[value[1]] ?? ''
          return `${date}<br/>${metric}: ${value[2] ?? 0}`
        }
      },
      graphic: hasAnyValue ? undefined : {
        type: 'text',
        left: 'center',
        top: 'middle',
        z: 100,
        style: {
          text: `${title}：当前统计为 0`,
          fill: light ? '#1f5f91' : '#bdefff',
          fontSize: 22,
          fontWeight: 800,
          textShadowBlur: light ? 0 : 18,
          textShadowColor: 'rgba(60, 199, 255, 0.72)'
        }
      },
      xAxis3D: {
        type: 'category',
        name: 'X 时间',
        data: dates,
        axisLine: { lineStyle: { color: rgbaHex(chartColors[1]!, light ? 0.38 : 0.66), width: 2 } },
        axisLabel: { color: light ? '#335b7e' : '#aeeaff', fontSize: 11, interval: 0 },
        splitLine: { show: true, lineStyle: { color: light ? 'rgba(68, 128, 178, .16)' : 'rgba(112, 205, 255, .18)' } }
      },
      yAxis3D: {
        type: 'category',
        name: 'Y 指标',
        data: metricNames,
        axisLine: { lineStyle: { color: rgbaHex(chartColors[3]!, light ? 0.36 : 0.62), width: 2 } },
        axisLabel: { color: light ? '#335b7e' : '#c5efff', fontSize: 12 },
        splitLine: { show: true, lineStyle: { color: light ? 'rgba(68, 128, 178, .14)' : 'rgba(112, 205, 255, .16)' } }
      },
      zAxis3D: {
        type: 'value',
        name: 'Z 数量',
        axisLine: { lineStyle: { color: rgbaHex('#9DEBFF', light ? 0.45 : 0.78), width: 2 } },
        axisLabel: { color: light ? '#335b7e' : '#bcefff', fontSize: 12 },
        splitLine: { show: true, lineStyle: { color: light ? 'rgba(68, 128, 178, .18)' : 'rgba(112, 205, 255, .22)' } }
      },
      grid3D: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        boxWidth: 190,
        boxDepth: Math.max(64, Math.min(138, metricNames.length * 24)),
        boxHeight: 112,
        environment: light ? '#edf8ff' : '#03122a',
        viewControl: {
          projection: 'perspective',
          alpha: 26,
          beta: -38,
          distance: 165,
          center: [0, -8, 0],
          zoomSensitivity: 0.2,
          rotateSensitivity: 0.6
        },
        light: {
          main: {
            intensity: 1.75,
            shadow: true,
            shadowQuality: 'high',
            alpha: 34,
            beta: 24
          },
          ambient: { intensity: light ? 0.68 : 0.52 }
        },
        postEffect: {
          enable: true,
          bloom: { enable: true, bloomIntensity: light ? 0.18 : 0.48 },
          SSAO: { enable: true, quality: 'medium', radius: 2, intensity: 0.42 }
        },
        splitLine: {
          show: true,
          lineStyle: { color: light ? 'rgba(68, 128, 178, .14)' : 'rgba(84, 180, 255, .18)', width: 1 }
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: light
              ? ['rgba(38, 126, 206, .035)', 'rgba(95, 119, 255, .03)']
              : ['rgba(27, 104, 188, .075)', 'rgba(89, 104, 255, .055)']
          }
        }
      },
      series: [{
        name: title,
        type: 'bar3D',
        data,
        barSize: metricNames.length > 1 ? 9 : 15,
        bevelSize: 0,
        bevelSmoothness: 0,
        shading: 'realistic',
        realisticMaterial: { roughness: 0.18, metalness: 0.08 },
        itemStyle: {
          opacity: light ? 0.84 : 0.88,
          shadowBlur: 20,
          shadowColor: rgbaHex(chartColors[1]!, 0.58)
        },
        emphasis: {
          label: {
            show: true,
            formatter: (params: any) => params.value?.[2] ?? '',
            textStyle: { color: '#ffffff', fontSize: 13, fontWeight: 800 }
          },
          itemStyle: {
            opacity: light ? 0.96 : 0.98,
            borderColor: 'rgba(104, 230, 255, 0.92)',
            borderWidth: 1.5
          }
        }
      }]
    } as echarts.EChartsOption
  }

  switch (activeTab.value) {
    case 'totalCases':
      return build3DOption('案件总数趋势', [
        { name: '案件总数', values: multiTrend.value.map((item) => item.totalCases) }
      ])
    case 'highIncidence':
      return build3DOption('高发案件类型', [
        { name: overview.value.highIncidenceTypes || '高发案件类型', values: multiTrend.value.map((item) => item.highIncidenceCount) }
      ])
    case 'riskAlert':
      return build3DOption('风险预警推送', [
        { name: '推送次数', values: multiTrend.value.map((item) => item.riskAlertPush) }
      ])
    case 'procuratorate':
      return build3DOption('检察建议发送', [
        { name: '检察建议发送次数', values: multiTrend.value.map((item) => item.procuratorateSuggestion) }
      ])
    case 'legalPlan':
      return build3DOption('普法方案投递', [
        { name: '普法方案投递次数', values: multiTrend.value.map((item) => item.legalPlanDelivery) }
      ])
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
  myChart.setOption(focusedPanel.value === 'trend' ? getDashboard3DChartOption() : getChartOption())
}

watch(activeTab, () => {
  renderChart()
})

watch(focusedPanel, async () => {
  const panel = focusedPanel.value || undefined
  if (route.query.panel !== panel) {
    await router.replace({ path: '/dashboard', query: panel ? { panel } : {} })
  }
  await nextTick()
  requestAnimationFrame(() => {
    renderChart()
    myChart?.resize()
  })
})

watch(
  () => route.query.panel,
  (panel) => {
    const nextPanel = typeof panel === 'string' && focusKeys.has(panel) ? panel : ''
    if (focusedPanel.value !== nextPanel) focusedPanel.value = nextPanel
  },
  { immediate: true }
)

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
.cockpit-page {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
}

.cockpit-grid {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: minmax(260px, .72fr) minmax(520px, 1.42fr) minmax(330px, .92fr);
  grid-template-rows: minmax(0, 1fr);
  gap: 10px;
  overflow: hidden;
}

.indices-focus-panel { grid-column: 1; grid-row: 1; }
.map-focus-panel { grid-column: 2; grid-row: 1; }
.trend-focus-panel { grid-column: 3; grid-row: 1; }

.index-stack {
  display: grid;
  height: 100%;
  min-height: 0;
  grid-template-rows: repeat(5, minmax(54px, 1fr)) minmax(94px, 1.35fr);
  gap: 7px;
  padding: 8px;
}

.index-stack--focused {
  grid-template-columns: repeat(5, minmax(0, 1fr));
  grid-template-rows: minmax(130px, .55fr) minmax(260px, 1fr);
  gap: 12px;
  padding: 16px;
}

.index-card {
  --index-color: #5edcff;
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 11px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--index-color) 36%, transparent);
  border-radius: 9px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--index-color) 11%, transparent), rgba(4, 23, 48, .9));
}
.index-card--red { --index-color: #ff6969; }
.index-card--cyan { --index-color: #53ddff; }
.index-card--orange { --index-color: #ff9e44; }
.index-card--yellow { --index-color: #f1d36b; }
.index-card--blue { --index-color: #699cff; }
.index-card span,
.index-card small { display: block; }
.index-card span { color: #dff7ff; font-size: 13px; font-weight: 700; }
.index-card small { margin-top: 3px; color: #739eb7; font-size: 10px; }
.index-card strong { color: var(--index-color); font-size: 24px; font-variant-numeric: tabular-nums; text-align: right; }
.index-card__text { max-width: 112px; font-size: 15px !important; line-height: 1.2; }
.index-stack--focused .index-card { align-items: flex-start; flex-direction: column; padding: 18px; }
.index-stack--focused .index-card span { font-size: 16px; }
.index-stack--focused .index-card strong { max-width: none; font-size: 34px; text-align: left; }
.index-stack--focused .index-card__text { font-size: 22px !important; }

.assessment-content {
  min-height: 0;
  padding: 10px;
  overflow: auto;
  border: 1px solid rgba(83, 207, 255, .2);
  border-radius: 9px;
  background: rgba(3, 20, 43, .72);
}
.index-stack--focused .assessment-content { grid-column: 1 / -1; padding: 18px; }
.assessment-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.assessment-heading > span { color: #dff7ff; font-size: 13px; font-weight: 700; }
.index-detail-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
.index-detail-grid section { padding: 15px; border: 1px solid rgba(83, 207, 255, .18); border-radius: 9px; background: rgba(8, 42, 72, .56); }
.index-detail-grid h3 { margin: 0 0 10px; color: #dff7ff; font-size: 15px; }
.index-detail-grid p { margin: 8px 0; color: #90bfd2; font-size: 12px; line-height: 1.65; }
.detail-rank-row { display: flex; align-items: center; gap: 8px; margin: 10px 0; color: #9bc9dc; font-size: 12px; }
.detail-rank-row span { width: 84px; }
.detail-rank-row i { height: 6px; flex: 1; overflow: hidden; border-radius: 8px; background: rgba(78, 145, 177, .18); }
.detail-rank-row b { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #147ec4, #47e5ff); }
.detail-rank-row strong { width: 34px; color: #f1cf73; text-align: right; }

.analysis-stack {
  display: grid;
  height: 100%;
  min-height: 0;
  grid-template-rows: minmax(180px, 1.05fr) minmax(190px, .95fr);
  gap: 7px;
  padding: 7px;
}
.analysis-stack--focused { grid-template-rows: minmax(290px, 1.25fr) minmax(220px, .75fr); gap: 12px; padding: 14px; }
.trend-chart-block { position: relative; min-height: 0; overflow: hidden; border: 1px solid rgba(83, 197, 243, .16); border-radius: 8px; background: rgba(2, 16, 35, .36); }
.mini-analysis-grid { display: grid; min-height: 0; grid-template-columns: 1fr; gap: 7px; }
.analysis-stack--focused .mini-analysis-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.mini-chart-card { min-height: 0; padding: 8px 10px; overflow: hidden; border: 1px solid rgba(83, 197, 243, .18); border-radius: 8px; background: linear-gradient(145deg, rgba(8, 44, 76, .64), rgba(3, 21, 43, .78)); }
.mini-chart-card h3 { margin: 0 0 6px; color: #dff7ff; font-size: 12px; }
.mini-bar-row { display: flex; align-items: center; gap: 6px; margin: 5px 0; color: #9ccce0; font-size: 10px; }
.mini-bar-row span { width: 68px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mini-bar-row i,
.workflow-meter i { height: 5px; flex: 1; overflow: hidden; border-radius: 8px; background: rgba(78, 145, 177, .18); }
.mini-bar-row b,
.workflow-meter b { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #147ec4, #47e5ff); }
.mini-bar-row em { width: 24px; color: #58dcff; font-style: normal; text-align: right; }
.workflow-meter { margin: 6px 0; }
.workflow-meter > div { display: flex; justify-content: space-between; margin-bottom: 3px; color: #9ccce0; font-size: 10px; }
.workflow-meter strong { color: #f0cf72; }
.workflow-meter i { display: block; width: 100%; }
.analysis-stack--focused .mini-chart-card { padding: 14px; }
.analysis-stack--focused .mini-chart-card h3 { font-size: 16px; }
.analysis-stack--focused .mini-bar-row,
.analysis-stack--focused .workflow-meter > div { font-size: 13px; }

.trend-toolbar {
  position: absolute;
  z-index: 2;
  top: 5px;
  right: 8px;
  max-width: calc(100% - 16px);
  overflow: hidden;
}

.trend-focus-panel :deep(.focus-panel__body) { position: relative; }

.trend-toolbar :deep(.arco-radio-group) {
  max-width: 100%;
  overflow-x: auto;
  white-space: nowrap;
  scrollbar-width: none;
}

.trend-focus-panel:not(.focus-panel--active) .trend-toolbar {
  right: auto;
  left: 8px;
}

.trend-focus-panel:not(.focus-panel--active) .trend-toolbar :deep(.arco-radio-button:not(.arco-radio-button-checked)) {
  display: none;
}

.dashboard-chart-stage {
  width: 100%;
  height: 100% !important;
  min-height: 0;
  border: 0 !important;
  border-radius: 0 !important;
  padding-top: 32px;
}

.assessment-content {
  position: relative;
  height: 100%;
  padding: 12px;
  overflow: auto;
}

.assessment-content > .arco-btn { float: right; margin: 0 0 8px 10px; }
.assessment-content .ai-empty-text,
.assessment-content .ai-loading-text { padding: 34px 10px 10px; }

.cockpit-grid--focused .assessment-content { padding: 24px; }

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
  gap: 18px;
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
  padding: 3px;
  background: linear-gradient(180deg, rgba(4, 24, 52, 0.92), rgba(3, 15, 35, 0.94));
  border: 1px solid rgba(61, 160, 245, 0.36);
  box-shadow:
    inset 0 0 18px rgba(26, 105, 196, 0.18),
    0 0 18px rgba(19, 114, 214, 0.10);
}

.dashboard :deep(.arco-radio-button) {
  color: #8fcff0;
  background: transparent;
  border-color: transparent;
  border-radius: 5px;
}

.dashboard :deep(.arco-radio-button:hover) {
  color: #d7f6ff;
  background: rgba(25, 104, 196, 0.20);
}

.dashboard :deep(.arco-radio-button.arco-radio-button-checked),
.dashboard :deep(.arco-radio-button.arco-radio-button-checked:hover) {
  color: #ffffff;
  background: linear-gradient(180deg, rgba(28, 124, 224, 0.86), rgba(10, 68, 154, 0.82));
  border-color: rgba(95, 218, 255, 0.62);
  box-shadow:
    inset 0 1px 0 rgba(166, 238, 255, 0.22),
    0 0 14px rgba(46, 176, 255, 0.35);
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
  background:
    radial-gradient(circle at 92% 86%, color-mix(in srgb, var(--kpi-accent) 13%, transparent), transparent 30%),
    linear-gradient(145deg, color-mix(in srgb, var(--kpi-accent) 15%, transparent), rgba(255, 255, 255, 0.72) 54%),
    linear-gradient(180deg, rgba(244, 249, 255, 0.96), rgba(220, 236, 255, 0.96)) !important;
  box-shadow:
    inset 0 0 22px color-mix(in srgb, var(--kpi-accent) 8%, transparent),
    0 10px 20px rgba(48, 86, 104, 0.12) !important;
}

:global(body.theme-light) .dashboard .kpi-label {
  color: color-mix(in srgb, var(--kpi-accent) 76%, #173f55) !important;
  text-shadow: none !important;
}

:global(body.theme-light) .dashboard .kpi-value {
  color: color-mix(in srgb, var(--kpi-accent) 76%, #173f55) !important;
  text-shadow: 0 0 14px color-mix(in srgb, var(--kpi-accent) 18%, transparent) !important;
}

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
