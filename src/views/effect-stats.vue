<template>
  <div class="page-contrast">
    <BackHome />
    <a-page-header title="效果评估统计" subtitle="多维度治理成效与可视化（演示数据）" />

    <div class="period-bar">
      <span class="period-label">统计时段</span>
      <a-radio-group v-model="period" type="button" @change="loadData">
        <a-radio value="week">本周</a-radio>
        <a-radio value="month">本月</a-radio>
        <a-radio value="year">全年</a-radio>
      </a-radio-group>
    </div>

    <a-row :gutter="12" class="kpi-row" type="flex">
      <a-col v-for="item in kpiCards" :key="item.key" :flex="1" style="min-width: 140px; margin-bottom: 12px;">
        <div class="kpi-card" :class="{'kpi-card-danger': item.key === 'pol'}">
          <div class="kpi-icon" aria-hidden="true">{{ item.icon }}</div>
          <div class="kpi-value">{{ item.value }}</div>
          <div class="kpi-label">{{ item.label }}</div>
          <div v-if="item.hint" class="kpi-hint">{{ item.hint }}</div>
        </div>
      </a-col>
    </a-row>

    <a-row :gutter="16" class="block-gap">
      <a-col :span="8">
        <a-card :bordered="false" class="rate-card">
          <template #title>
            <span class="card-title-with-icon"><span class="title-ico">⚡</span>预警响应率</span>
          </template>
          <a-progress :percent="rates.responseRate" />
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card :bordered="false" class="rate-card">
          <template #title>
            <span class="card-title-with-icon"><span class="title-ico">✓</span>纠纷化解率</span>
          </template>
          <a-progress :percent="rates.closeRate" status="success" />
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card :bordered="false" class="rate-card">
          <template #title>
            <span class="card-title-with-icon"><span class="title-ico">📣</span>普法触达率</span>
          </template>
          <a-progress :percent="rates.reachRate" />
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" class="block-gap">
      <a-col :span="8">
        <a-card :bordered="false" class="rate-card">
          <template #title>
            <span class="card-title-with-icon"><span class="title-ico">⚖️</span>调解成功率</span>
          </template>
          <a-progress :percent="mediationPct" />
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card :bordered="false" class="rate-card">
          <template #title>
            <span class="card-title-with-icon"><span class="title-ico">🛡️</span>网格巡查覆盖</span>
          </template>
          <a-progress :percent="gridPct" color="#7bedc1" />
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card :bordered="false" class="rate-card">
          <template #title>
            <span class="card-title-with-icon"><span class="title-ico">⭐</span>群众满意度</span>
          </template>
          <a-progress :percent="satisfactionPct" status="warning" />
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" class="block-gap">
      <a-col :span="14">
        <a-card title="预警与处理效率趋势" :bordered="false">
          <template #extra>
            <span class="chart-extra">多维指标折线</span>
          </template>
          <div ref="trendChartRef" class="chart-box chart-tall"></div>
        </a-card>
      </a-col>
      <a-col :span="10">
        <a-card title="治理能力多维雷达" :bordered="false">
          <template #extra>
            <span class="chart-extra">六维示意</span>
          </template>
          <div ref="radarChartRef" class="chart-box chart-tall"></div>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" class="block-gap">
      <a-col :span="14">
        <a-card title="各街道预警与闭环对比" :bordered="false">
          <template #extra>
            <span class="chart-extra">分组柱状</span>
          </template>
          <div ref="barChartRef" class="chart-box chart-mid"></div>
        </a-card>
      </a-col>
      <a-col :span="10">
        <a-card title="预警处置结构" :bordered="false">
          <template #extra>
            <span class="chart-extra">环形图</span>
          </template>
          <div ref="donutChartRef" class="chart-box chart-mid"></div>
        </a-card>
      </a-col>
    </a-row>

    <a-card title="社区维度统计" :bordered="false" class="block-gap">
      <template #extra>
        <span class="chart-extra">{{ periodLabel }} · {{ data.length }} 个街道</span>
      </template>
      <a-table :columns="tableColumns" :data="data" :pagination="false" />
    </a-card>

    <a-card :bordered="false" class="block-gap">
      <template #title>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>🤖 AI 治理成效评估报告</span>
          <a-button type="primary" size="small" :loading="aiReportLoading" @click="generateReport">
            {{ aiReport ? '重新生成' : '一键生成报告' }}
          </a-button>
        </div>
      </template>
      <div v-if="aiReportLoading" class="ai-loading-text">
        AI 正在综合{{ periodLabel }}数据生成评估报告...
      </div>
      <div v-else-if="aiReport" class="ai-report" v-html="formatReport(aiReport)"></div>
      <div v-else class="ai-empty-text">
        点击「一键生成报告」，AI 将基于{{ periodLabel }}数据生成包含数据支撑的汇报素材
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, nextTick } from 'vue'
import * as echarts from 'echarts'
import BackHome from '../components/back-home.vue'
import { chatWithLLM } from '../services/llm'
import { USER_PROMPT_TEMPLATES } from '../services/prompts'
import { fetchEffectTrend, fetchEffectRatesForPeriod, fetchCommunityEffectStatsForPeriod } from '../api/platform'
import type { CommunityEffectStat, EffectRate, EffectTrendPoint } from '../types/platform'
import {
  CHART_PALETTES,
  areaGradient,
  buildPieDepthLayers,
  raisedBarStyle,
  raisedPieStyle,
  rgbaHex,
  shadeHex,
  type ChartDatum
} from '../utils/chart-visual'

const period = ref('month')

const rates = ref<EffectRate>({
  responseRate: 0,
  closeRate: 0,
  reachRate: 0
})
const data = ref<CommunityEffectStat[]>([])
const trendData = ref<EffectTrendPoint[]>([])

const aiReportLoading = ref(false)
const aiReport = ref('')

const trendChartRef = ref<HTMLDivElement | null>(null)
const radarChartRef = ref<HTMLDivElement | null>(null)
const barChartRef = ref<HTMLDivElement | null>(null)
const donutChartRef = ref<HTMLDivElement | null>(null)
let trendChart: echarts.ECharts | null = null
let radarChart: echarts.ECharts | null = null
let barChart: echarts.ECharts | null = null
let donutChart: echarts.ECharts | null = null
let themeObserver: MutationObserver | null = null

const periodToApiKey = (p: string): string => {
  if (p === 'week') return '7d'
  if (p === 'year') return '90d'
  return '30d'
}

const periodLabel = computed(() => {
  if (period.value === 'week') return '本周'
  if (period.value === 'year') return '全年'
  return '本月'
})

const alertColumnTitle = computed(() => {
  if (period.value === 'week') return '本周预警'
  if (period.value === 'year') return '预警量'
  return '本月预警'
})

const tableColumns = computed(() => [
  { title: '社区', dataIndex: 'community', width: 140 },
  { title: alertColumnTitle.value, dataIndex: 'alerts', width: 110 },
  { title: '已闭环', dataIndex: 'closed', width: 100 },
  { title: '普法活动', dataIndex: 'activities', width: 110 }
])

const totalAlerts = computed(() => data.value.reduce((s, r) => s + r.alerts, 0))
const totalClosed = computed(() => data.value.reduce((s, r) => s + r.closed, 0))
const totalActivities = computed(() => data.value.reduce((s, r) => s + r.activities, 0))
const inProgress = computed(() => Math.max(0, totalAlerts.value - totalClosed.value))

const mediationPct = computed(() => rates.value.mediationRate ?? 0)
const gridPct = computed(() => rates.value.gridCoverage ?? 0)
const satisfactionPct = computed(() => rates.value.satisfactionRate ?? 0)

const kpiCards = computed(() => {
  const r = rates.value
  const hrs = r.avgResponseHours
  return [
    { key: 'resp', icon: '⚡', value: `${r.responseRate}%`, label: '预警响应率', hint: '按时签收' },
    { key: 'close', icon: '✓', value: `${r.closeRate}%`, label: '纠纷化解率', hint: '闭环占比' },
    { key: 'reach', icon: '📣', value: `${r.reachRate}%`, label: '普法触达率', hint: '触达人群' },
    { key: 'med', icon: '⚖️', value: `${r.mediationRate ?? '—'}%`, label: '调解成功率', hint: '人民调解' },
    { key: 'grid', icon: '🛡️', value: `${r.gridCoverage ?? '—'}%`, label: '网格覆盖', hint: '巡查到位' },
    {
      key: 'time',
      icon: '⏱',
      value: typeof hrs === 'number' ? `${hrs} h` : '—',
      label: '平均响应时长',
      hint: '签收至首办'
    },
    // 新增：第七个专属模块
    { key: 'pol', icon: '🚨', value: `${r.politicalResolutionRate ?? '—'}%`, label: '政治安全化解率', hint: '专案响应' }
  ]
})

const isLightTheme = () => localStorage.getItem('platform:theme-mode') === 'light'
const chartText = computed(() => ({ color: isLightTheme() ? '#1d4f79' : '#a7dfff' }))
const chartTextTitle = computed(() => ({ color: isLightTheme() ? '#123f66' : '#d7f2ff' }))
const chartAxisColor = () => isLightTheme() ? 'rgba(52, 123, 180, 0.46)' : 'rgba(90, 174, 255, 0.55)'
const chartSplitColor = () => isLightTheme() ? 'rgba(52, 123, 180, 0.16)' : 'rgba(98, 179, 255, 0.15)'
const chartLinePrimary = () => isLightTheme() ? '#2f73ad' : '#44c2ff'
const chartLineSecondary = () => isLightTheme() ? '#4f8ec3' : '#6ee8ff'
const chartBarPrimary = () => isLightTheme() ? '#2f73ad' : '#44c2ff'
const chartBarSecondary = () => isLightTheme() ? '#5a98ca' : '#7bedc1'
const chartTooltipBg = () => isLightTheme() ? 'rgba(235, 246, 255, 0.96)' : 'rgba(8, 23, 44, 0.9)'
const chartTooltipBorder = () => isLightTheme() ? 'rgba(70, 136, 192, 0.42)' : 'rgba(90, 214, 255, 0.32)'
const themedColor = (color: string) => isLightTheme() ? shadeHex(color, -24) : color

const renderTrendChart = () => {
  if (!trendChartRef.value) return
  if (!trendChart) trendChart = echarts.init(trendChartRef.value)
  const colors = [
    themedColor(CHART_PALETTES.governance[4]),
    themedColor(CHART_PALETTES.amberTeal[1]),
    themedColor(CHART_PALETTES.political[0])
  ]
  const lineStyle = (color: string) => ({ width: 3, color, shadowBlur: 14, shadowColor: rgbaHex(color, 0.62) })
  const pointStyle = (color: string) => ({ color, borderColor: '#f4d99c', borderWidth: 1.5, shadowBlur: 12, shadowColor: rgbaHex(color, 0.68) })
  trendChart.setOption({
    backgroundColor: 'transparent',
    animationDuration: 1150,
    animationEasing: 'cubicOut',
    animationDelay: (index: number) => index * 55,
    tooltip: {
      trigger: 'axis',
      backgroundColor: chartTooltipBg(),
      borderColor: chartTooltipBorder(),
      textStyle: chartTextTitle.value
    },
    legend: {
      data: ['预警总数', '结案闭环率', '政治安全案件'], // 修改：加入了政治安全案件
      textStyle: chartTextTitle.value,
      top: 0
    },
    grid: { left: 50, right: 50, top: 40, bottom: 35 },
    xAxis: {
      type: 'category',
      data: trendData.value.map((d) => d.date),
      axisLine: { lineStyle: { color: chartAxisColor() } },
      axisLabel: { color: chartText.value.color, rotate: 30 }
    },
    yAxis: [
      {
        type: 'value',
        name: '数量(件)',
        nameTextStyle: chartText.value,
        splitLine: { lineStyle: { color: chartSplitColor() } },
        axisLabel: chartText.value
      },
      {
        type: 'value',
        name: '闭环率(%)',
        nameTextStyle: chartText.value,
        max: 100,
        splitLine: { show: false },
        axisLabel: { ...chartText.value, formatter: '{value}%' }
      }
    ],
    series: [
      {
        name: '预警总数',
        type: 'line',
        yAxisIndex: 0,
        data: trendData.value.map((d) => d.alertCount),
        smooth: true,
        lineStyle: lineStyle(colors[0]!),
        itemStyle: pointStyle(colors[0]!),
        areaStyle: { color: areaGradient(colors[0]!, 0.34) },
        symbol: 'circle',
        symbolSize: 8,
        emphasis: { scale: true, scaleSize: 5 }
      },
      {
        name: '结案闭环率',
        type: 'line',
        yAxisIndex: 1,
        data: trendData.value.map((d) => d.closeRate),
        smooth: true,
        lineStyle: lineStyle(colors[1]!),
        itemStyle: pointStyle(colors[1]!),
        areaStyle: { color: areaGradient(colors[1]!, 0.28) },
        symbol: 'circle',
        symbolSize: 8,
        emphasis: { scale: true, scaleSize: 5 }
      },
      {
        name: '政治安全案件',
        type: 'line',
        yAxisIndex: 0, // 和预警总数共用左侧Y轴
        data: trendData.value.map((d) => d.politicalCases || 0),
        smooth: true,
        lineStyle: { ...lineStyle(colors[2]!), type: 'dashed' },
        itemStyle: pointStyle(colors[2]!),
        areaStyle: { color: areaGradient(colors[2]!, 0.24) },
        symbol: 'triangle',
        symbolSize: 9,
        emphasis: { scale: true, scaleSize: 5 }
      }
    ]
  })
}

const renderRadarChart = () => {
  if (!radarChartRef.value) return
  if (!radarChart) radarChart = echarts.init(radarChartRef.value)
  const r = rates.value
  const v = (n?: number) => Math.round(n ?? 72)
  const radarColor = themedColor(CHART_PALETTES.violetCyan[1])
  radarChart.setOption({
    backgroundColor: 'transparent',
    animationDuration: 1100,
    animationEasing: 'cubicOut',
    tooltip: {
      trigger: 'item',
      backgroundColor: chartTooltipBg(),
      borderColor: chartTooltipBorder(),
      textStyle: chartTextTitle.value
    },
    radar: {
      center: ['50%', '54%'],
      radius: '62%',
      indicator: [
        { name: '预警响应', max: 100 },
        { name: '纠纷化解', max: 100 },
        { name: '普法触达', max: 100 },
        { name: '调解成功', max: 100 },
        { name: '网格覆盖', max: 100 },
        { name: '群众满意', max: 100 }
      ],
      axisName: { color: isLightTheme() ? '#1d4f79' : '#9fd4f2', fontSize: 11 },
      splitLine: { lineStyle: { color: isLightTheme() ? 'rgba(52, 123, 180, 0.2)' : 'rgba(98, 179, 255, 0.2)' } },
      splitArea: {
        show: true,
        areaStyle: {
          color: isLightTheme()
            ? ['rgba(92, 93, 170, 0.04)', 'rgba(92, 93, 170, 0.10)']
            : ['rgba(89, 207, 224, 0.04)', 'rgba(123, 88, 232, 0.13)']
        }
      }
    },
    series: [
      {
        type: 'radar',
        symbol: 'circle',
        symbolSize: 7,
        areaStyle: { color: areaGradient(radarColor, 0.56) },
        lineStyle: { width: 2.5, color: radarColor, shadowBlur: 16, shadowColor: rgbaHex(radarColor, 0.7) },
        itemStyle: { color: radarColor, borderColor: '#f2d391', borderWidth: 1.2, shadowBlur: 10, shadowColor: rgbaHex(radarColor, 0.7) },
        data: [
          {
            value: [
              v(r.responseRate),
              v(r.closeRate),
              v(r.reachRate),
              v(r.mediationRate),
              v(r.gridCoverage),
              v(r.satisfactionRate)
            ],
            name: periodLabel.value
          }
        ]
      }
    ]
  })
}

const renderBarChart = () => {
  if (!barChartRef.value) return
  if (!barChart) barChart = echarts.init(barChartRef.value)
  const names = data.value.map((d) => d.community.replace('街道', ''))
  const alertColors = CHART_PALETTES.rainbow.map(themedColor)
  const closedColors = CHART_PALETTES.caseBlue.map(themedColor)
  barChart.setOption({
    backgroundColor: 'transparent',
    animationDuration: 1050,
    animationEasing: 'cubicOut',
    animationDelay: (index: number) => index * 35,
    tooltip: {
      trigger: 'axis',
      backgroundColor: chartTooltipBg(),
      borderColor: chartTooltipBorder(),
      textStyle: chartTextTitle.value
    },
    legend: { data: ['预警量', '已闭环'], textStyle: chartTextTitle.value, top: 0 },
    grid: { left: 48, right: 16, top: 36, bottom: 28 },
    xAxis: {
      type: 'category',
      data: names,
      axisLabel: { color: chartText.value.color, rotate: 28, fontSize: 10 },
      axisLine: { lineStyle: { color: chartAxisColor() } }
    },
    yAxis: {
      type: 'value',
      name: '件次',
      nameTextStyle: chartText.value,
      splitLine: { lineStyle: { color: chartSplitColor() } },
      axisLabel: chartText.value
    },
    series: [
      {
        name: '预警量',
        type: 'bar',
        data: data.value.map((d, index) => ({ value: d.alerts, itemStyle: raisedBarStyle(alertColors[index % alertColors.length]!, index) })),
        barMaxWidth: 22
      },
      {
        name: '已闭环',
        type: 'bar',
        data: data.value.map((d, index) => ({ value: d.closed, itemStyle: raisedBarStyle(closedColors[index % closedColors.length]!, index + 1) })),
        barMaxWidth: 22
      }
    ]
  })
}

const renderDonutChart = () => {
  if (!donutChartRef.value) return
  if (!donutChart) donutChart = echarts.init(donutChartRef.value)
  const closed = totalClosed.value
  const open = inProgress.value
  const act = totalActivities.value
  const light = isLightTheme()
  const colors = [
    themedColor(CHART_PALETTES.governance[3]),
    themedColor(CHART_PALETTES.governance[1]),
    themedColor(CHART_PALETTES.violetCyan[0])
  ]
  const center: [string, string] = ['50%', '43%']
  const radius: [string, string] = ['40%', '66%']
  const prepared: ChartDatum[] = [
    { value: closed, name: '已闭环' },
    { value: open, name: '在办/待闭环' },
    { value: act, name: '普法活动场次' }
  ].map((item, index) => ({ ...item, baseColor: colors[index], itemStyle: raisedPieStyle(colors[index]!, index) }))
  donutChart.setOption({
    backgroundColor: 'transparent',
    animationDuration: 1050,
    animationEasing: 'cubicOut',
    animationDelay: (index: number) => index * 90,
    tooltip: {
      trigger: 'item',
      backgroundColor: chartTooltipBg(),
      borderColor: chartTooltipBorder(),
      textStyle: chartTextTitle.value
    },
    legend: {
      bottom: 0,
      textStyle: { color: isLightTheme() ? '#1d4f79' : '#bde7ff', fontSize: 11 }
    },
    series: [
      ...buildPieDepthLayers('处置结构', prepared, radius, center, 7),
      {
        type: 'pie',
        radius,
        center,
        z: 20,
        selectedMode: 'single',
        selectedOffset: 12,
        padAngle: 3,
        avoidLabelOverlap: true,
        label: { color: light ? '#123f66' : '#dff6ff', fontSize: 11, textBorderWidth: 2, textBorderColor: light ? '#fff' : '#06162d' },
        labelLine: { smooth: 0.2, lineStyle: { color: light ? '#6a8296' : '#b9def1' } },
        emphasis: { scale: true, scaleSize: 9, itemStyle: { shadowBlur: 30, shadowOffsetY: 14 } },
        data: prepared
      }
    ]
  })
}

const generateReport = async () => {
  aiReportLoading.value = true
  try {
    const r = rates.value
    const communityList = data.value.map(c => `${c.community}: 预警${c.alerts}件, 闭环${c.closed}件, 普法活动${c.activities}次`).join('\n')
    const totalAlertsVal = data.value.reduce((s, c) => s + c.alerts, 0)
    const totalClosedVal = data.value.reduce((s, c) => s + c.closed, 0)

    const prompt = USER_PROMPT_TEMPLATES.effectStats({
      period: periodLabel.value,
      responseRate: r.responseRate,
      closeRate: r.closeRate,
      reachRate: r.reachRate,
      totalAlerts: totalAlertsVal,
      totalClosed: totalClosedVal,
      communityList
    })

    aiReport.value = await chatWithLLM(prompt, 'effectStats')
  } catch (e) {
    aiReport.value = '报告生成失败，请稍后重试。'
  } finally {
    aiReportLoading.value = false
  }
}

const formatReport = (content: string) => {
  return content
    .replace(/【(.+?)】/g, '<strong class="ai-section-title">$1</strong>')
    .replace(/\n/g, '<br>')
}

const renderAllCharts = () => {
  renderTrendChart()
  renderRadarChart()
  renderBarChart()
  renderDonutChart()
}

const loadData = async () => {
  aiReport.value = ''
  const apiKey = periodToApiKey(period.value)
  const [rateData, communityData, trend] = await Promise.all([
    fetchEffectRatesForPeriod(apiKey),
    fetchCommunityEffectStatsForPeriod(apiKey),
    fetchEffectTrend(apiKey)
  ])
  rates.value = rateData
  data.value = communityData
  trendData.value = trend
  await nextTick()
  renderAllCharts()
}

const handleResize = () => {
  trendChart?.resize()
  radarChart?.resize()
  barChart?.resize()
  donutChart?.resize()
}

onMounted(() => {
  loadData()
  window.addEventListener('resize', handleResize)
  themeObserver = new MutationObserver(() => {
    renderAllCharts()
  })
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] })
})

onUnmounted(() => {
  trendChart?.dispose()
  radarChart?.dispose()
  barChart?.dispose()
  donutChart?.dispose()
  trendChart = null
  radarChart = null
  barChart = null
  donutChart = null
  window.removeEventListener('resize', handleResize)
  themeObserver?.disconnect()
  themeObserver = null
})
</script>

<style scoped>
.period-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.period-label {
  color: #d8f2ff;
  font-size: 14px;
}

.kpi-row {
  margin-bottom: 8px;
}

.kpi-card {
  padding: 14px 12px;
  border-radius: 10px;
  border: 1px solid rgba(95, 193, 255, 0.28);
  background: linear-gradient(165deg, rgba(22, 93, 255, 0.14), rgba(8, 23, 44, 0.88));
  min-height: 118px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

/* 政治安全指标的红底高亮样式 */
.kpi-card-danger {
  border-color: rgba(245, 63, 63, 0.3) !important;
  background: linear-gradient(165deg, rgba(245, 63, 63, 0.12), rgba(28, 8, 8, 0.88)) !important;
}

.kpi-card-danger .kpi-value { color: #ff7a7a !important; }
.kpi-card-danger .kpi-label { color: #f53f3f !important; }

.kpi-icon {
  font-size: 26px;
  line-height: 1;
  margin-bottom: 8px;
  filter: drop-shadow(0 0 8px rgba(90, 214, 255, 0.35));
}

.kpi-value {
  font-size: 22px;
  font-weight: 700;
  color: #e8f9ff;
  margin-bottom: 4px;
}

.kpi-label {
  font-size: 12px;
  color: #9fd4f2;
}

.kpi-hint {
  margin-top: 6px;
  font-size: 11px;
  color: #7eb3d8;
}

.block-gap {
  margin-top: 16px;
}

.card-title-with-icon {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #d8f3ff;
}

.title-ico {
  font-size: 16px;
}

.chart-box {
  width: 100%;
  border-radius: 8px;
  background:
    linear-gradient(rgba(70, 151, 203, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(70, 151, 203, 0.045) 1px, transparent 1px),
    radial-gradient(ellipse at 50% 82%, rgba(68, 175, 218, 0.09), transparent 55%);
  background-size: 32px 32px, 32px 32px, auto;
  box-shadow: inset 0 -28px 48px rgba(1, 9, 24, 0.18);
}

.chart-tall {
  height: 380px;
}

.chart-mid {
  height: 320px;
}

.chart-extra {
  font-size: 12px;
  color: #8ec7e8;
}

.page-contrast :deep(.arco-page-header-title) {
  color: #eff9ff;
}

.page-contrast :deep(.arco-page-header-sub-title) {
  color: #bde7ff;
}

.page-contrast :deep(.arco-card-header-title),
.page-contrast :deep(.arco-table-th-item),
.page-contrast :deep(.arco-table-td),
.page-contrast :deep(.arco-progress-text) {
  color: #dbf2ff;
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

.page-contrast :deep(.arco-radio-group-button) {
  background: rgba(13, 30, 56, 0.8);
  border-color: rgba(108, 201, 255, 0.28);
}

.page-contrast :deep(.arco-radio-button) {
  color: #8ec7e8;
  background: transparent;
  border-color: rgba(108, 201, 255, 0.25);
}

.page-contrast :deep(.arco-radio-button:hover) {
  color: #b6e7ff;
  background: rgba(81, 182, 255, 0.12);
}

.page-contrast :deep(.arco-radio-button.arco-radio-button-checked),
.page-contrast :deep(.arco-radio-button.arco-radio-button-checked:hover) {
  color: #ffffff;
  background: linear-gradient(180deg, rgba(83, 195, 255, 0.38), rgba(46, 129, 255, 0.3));
  border-color: rgba(83, 195, 255, 0.5);
}

.page-contrast :deep(.arco-card) {
  border: 1px solid rgba(220, 231, 226, 0.28);
  background: linear-gradient(180deg, rgba(14, 39, 78, 0.78), rgba(9, 24, 47, 0.86));
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(244, 216, 158, 0.08);
}

.page-contrast :deep(.arco-progress-line-text) {
  color: #dbf2ff;
}

.rate-card :deep(.arco-card-header) {
  padding-bottom: 4px;
}

.ai-report {
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
  padding: 30px;
  color: #9fd4f2;
}

:global(body.theme-light) .page-contrast :deep(.arco-page-header-title),
:global(body.theme-light) .page-contrast :deep(.arco-page-header-sub-title),
:global(body.theme-light) .page-contrast :deep(.arco-card-header-title),
:global(body.theme-light) .page-contrast :deep(.arco-table-th-item),
:global(body.theme-light) .page-contrast :deep(.arco-table-td),
:global(body.theme-light) .page-contrast :deep(.arco-progress-text),
:global(body.theme-light) .page-contrast .period-label,
:global(body.theme-light) .page-contrast .kpi-value,
:global(body.theme-light) .page-contrast .kpi-label,
:global(body.theme-light) .page-contrast .kpi-hint,
:global(body.theme-light) .page-contrast .chart-extra,
:global(body.theme-light) .page-contrast .card-title-with-icon,
:global(body.theme-light) .page-contrast .ai-report {
  color:#103a60 !important;
}

:global(body.theme-light) .page-contrast .kpi-card,
:global(body.theme-light) .page-contrast :deep(.arco-card),
:global(body.theme-light) .page-contrast :deep(.arco-table-container),
:global(body.theme-light) .page-contrast :deep(.arco-table-element),
:global(body.theme-light) .page-contrast :deep(.arco-table-tr),
:global(body.theme-light) .page-contrast :deep(.arco-table-td) {
  background: rgba(221, 239, 255, 0.92) !important;
  border-color: rgba(70, 136, 192, 0.26) !important;
}

/* 浅色模式下的政治安全方块 */
:global(body.theme-light) .page-contrast .kpi-card-danger {
  background: rgba(255, 235, 238, 0.98) !important;
  border-color: rgba(224, 108, 117, 0.6) !important;
}
:global(body.theme-light) .page-contrast .kpi-card-danger .kpi-value { color: #d9363e !important; }
:global(body.theme-light) .page-contrast .kpi-card-danger .kpi-label { color: #b52c33 !important; }

:global(body.theme-light) .page-contrast :deep(.arco-radio-button.arco-radio-button-checked),
:global(body.theme-light) .page-contrast :deep(.arco-radio-button.arco-radio-button-checked:hover) {
  color: #0a2f4d !important;
  background: linear-gradient(180deg, rgba(158, 211, 248, 0.95), rgba(127, 191, 238, 0.95)) !important;
  border-color: rgba(52, 123, 180, 0.62) !important;
}

:global(body.theme-light) .page-contrast :deep(.arco-table-tr .arco-table-th) {
  background: rgba(196, 224, 247, 0.94) !important;
}

:global(body.theme-light) .page-contrast :deep(.arco-progress-track) {
  background: rgba(181, 213, 239, 0.58) !important;
}

:global(body.theme-light) .page-contrast .ai-loading-text,
:global(body.theme-light) .page-contrast .ai-empty-text {
  color: #103a60 !important;
}

:global(body.theme-light) .page-contrast :deep(.ai-section-title) {
  color: #1d4f79 !important;
}

:global(body.theme-light) .page-contrast .kpi-label,
:global(body.theme-light) .page-contrast .kpi-hint {
  background: rgba(226, 241, 253, 0.92) !important;
  border: 1px solid rgba(96, 153, 205, 0.35) !important;
  border-radius: 6px;
  padding: 2px 8px;
}
</style>
