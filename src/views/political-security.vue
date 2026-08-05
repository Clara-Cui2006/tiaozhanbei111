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
        <div class="kpi-label">年度异常信号总数</div>
        <div class="kpi-value">{{ overview.totalSignalsThisYear }}</div>
      </div>
      <div class="kpi-item kpi-cyan">
        <div class="kpi-accent"></div>
        <div class="kpi-label">高发风险类型</div>
        <div class="kpi-value kpi-value-text">{{ overview.highIncidenceTypes }}</div>
      </div>
      <div class="kpi-item kpi-orange">
        <div class="kpi-accent"></div>
        <div class="kpi-label">风险预警推送次数</div>
        <div class="kpi-value">{{ overview.riskAlertPushCount }}</div>
      </div>
      <div class="kpi-item kpi-yellow">
        <div class="kpi-accent"></div>
        <div class="kpi-label">保密级检察建议</div>
        <div class="kpi-value">{{ overview.procuratorateSuggestions }}</div>
      </div>
      <div class="kpi-item kpi-blue">
        <div class="kpi-accent"></div>
        <div class="kpi-label">重大活动耦合度</div>
        <div class="kpi-value kpi-value-text">{{ overview.majorEventCoupling }}</div>
      </div>
    </div>

    <a-row :gutter="16" class="dashboard-row">
      <a-col :span="14">
        <a-card :bordered="false" class="chart-card method-card">
          <template #title>政治安全四维研判</template>
          <div class="method-grid">
            <div v-for="item in overview.fourDimensionMethod || defaultFourDimensionMethod" :key="item.name" class="method-item">
              <strong>{{ item.name }}</strong>
              <span>{{ item.description }}</span>
            </div>
          </div>
          <a-alert type="warning" class="method-alert">位于重点区域不必然属于政治安全案件，必须结合地点、行为、主体、传播影响进行人工复核。</a-alert>
        </a-card>
      </a-col>
      <a-col :span="10">
        <a-card :bordered="false" class="chart-card method-card">
          <template #title>西城重点专题与复核状态</template>
          <div class="topic-list">
            <a-tag v-for="topic in overview.priorityTopics || defaultPriorityTopics" :key="topic" color="orangered" size="large">{{ topic }}</a-tag>
          </div>
          <div class="review-metrics">
            <div><span>待人工复核</span><strong>{{ overview.pendingManualReview || 0 }}</strong></div>
            <div><span>高关注风险</span><strong>{{ overview.highConcernRisks || 0 }}</strong></div>
          </div>
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
          <template #extra>
            <a-radio-group v-model="activeChart" type="button" size="medium">
              <a-radio value="line">月度趋势</a-radio>
              <a-radio value="heatmap">风险分布</a-radio>
              <a-radio value="bar">街道对比</a-radio>
            </a-radio-group>
          </template>
          
          <div class="chart-container-large">
            <div v-show="activeChart === 'line'" class="chart-box" ref="lineChartRef"></div>
            <div v-show="activeChart === 'heatmap'" class="chart-box" ref="heatmapChartRef"></div>
            <div v-show="activeChart === 'bar'" class="chart-box" ref="barChartRef"></div>
          </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import BackHome from '../components/back-home.vue'
import RiskMapPanel from '../components/risk-map-panel.vue'
import { fetchPoliticalMonthlyTrend, fetchPoliticalStreetStats, fetchPoliticalOverview } from '../api/platform'
import type { PoliticalMonthlyTrend, PoliticalStreetStat, PoliticalOverview } from '../types/platform'

// 引入 LLM 相关服务
import { chatWithLLM } from '../services/llm'
import { USER_PROMPT_TEMPLATES } from '../services/prompts'

const lineChartRef = ref<HTMLElement | null>(null)
const heatmapChartRef = ref<HTMLElement | null>(null)
const barChartRef = ref<HTMLElement | null>(null)

let lineChart: echarts.ECharts | null = null
let heatmapChart: echarts.ECharts | null = null
let barChart: echarts.ECharts | null = null
let themeObserver: MutationObserver | null = null

const activeChart = ref('line')
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
const defaultFourDimensionMethod = [
  { name: '地点因素', description: '发生地政治属性、敏感程度与核心区属性' },
  { name: '行为内容', description: '言论、行为、诉求等内容是否涉及政治安全风险' },
  { name: '涉及主体', description: '主体身份、组织属性、背景关系与关联网络' },
  { name: '传播影响', description: '传播范围、扩散路径、社会舆情与影响程度' }
]
const defaultPriorityTopics = ['涉老权益保护', '涉外风险', '邻里及相邻关系纠纷']
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
const tooltipBg = () => isLightTheme() ? 'rgba(235, 246, 255, 0.96)' : 'rgba(8, 23, 44, 0.9)'
const tooltipBorder = () => isLightTheme() ? 'rgba(70, 136, 192, 0.42)' : 'rgba(245, 63, 63, 0.3)'

const getNormalizedXY = (lon: number, lat: number, points: PoliticalStreetStat[]): [number, number] => {
  if (!points.length) return [50, 50]
  const lons = points.map(p => p.longitude)
  const lats = points.map(p => p.latitude)
  const lonMin = Math.min(...lons)
  const lonMax = Math.max(...lons)
  const latMin = Math.min(...lats)
  const latMax = Math.max(...lats)
  
  const lonPadding = (lonMax - lonMin) * 0.05 || 0.01
  const latPadding = (latMax - latMin) * 0.05 || 0.01
  
  const x = ((lon - (lonMin - lonPadding)) / ((lonMax + lonPadding) - (lonMin - lonPadding))) * 100
  const y = ((lat - (latMin - latPadding)) / ((latMax + latPadding) - (latMin - latPadding))) * 100
  
  return [Math.min(100, Math.max(0, x)), Math.min(100, Math.max(0, y))]
}

const renderCharts = () => {
  if (lineChart) lineChart.dispose()
  if (heatmapChart) heatmapChart.dispose()
  if (barChart) barChart.dispose()

  // --- 1. 渲染折线趋势图 ---
  if (lineChartRef.value) {
    lineChart = echarts.init(lineChartRef.value)
    lineChart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: tooltipBg(),
        borderColor: tooltipBorder(),
        textStyle: { color: chartTextPrimary(), fontSize: 16 }
      },
      grid: { left: '5%', right: '5%', top: '10%', bottom: '15%' },
      xAxis: { 
        type: 'category', 
        data: trendData.value.map(d => d.month), 
        axisLabel: { color: chartTextSecondary(), fontSize: 15 }, 
        axisLine: { show: true, lineStyle: { color: chartAxisColor(), width: 1.5 } },
        axisTick: { show: true }
      },
      yAxis: { 
        type: 'value', 
        splitLine: { show: true, lineStyle: { color: chartSplitColor(), width: 1 } }, 
        axisLabel: { color: chartTextSecondary(), fontSize: 15 }, 
        axisLine: { show: true, lineStyle: { color: chartAxisColor(), width: 1.5 } }
      },
      series: [{ 
        name: '异常信号',
        data: trendData.value.map(d => d.count), 
        type: 'line', 
        smooth: true, 
        symbol: 'circle',
        symbolSize: 8, 
        lineStyle: { color: '#f53f3f', width: 4 }, 
        itemStyle: { color: '#f53f3f' }, 
        areaStyle: { 
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(245, 63, 63, 0.5)' }, 
            { offset: 1, color: 'rgba(245, 63, 63, 0)' }
          ]) 
        } 
      }]
    })
  }

  // --- 2. 渲染热力示意图 ---
  if (heatmapChartRef.value) {
    heatmapChart = echarts.init(heatmapChartRef.value)
    const scatterData = streetData.value.map((p) => {
      const [x, y] = getNormalizedXY(p.longitude, p.latitude, streetData.value)
      return {
        name: p.community,
        value: [x, y, p.count],
        riskLevel: p.riskLevel || '关注',
        reviewStatus: p.reviewStatus || '待人工复核',
        symbolSize: 15 + p.count * 1.8
      }
    })

    heatmapChart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: tooltipBg(),
        borderColor: tooltipBorder(),
        textStyle: { color: chartTextPrimary(), fontSize: 16 },
        formatter: (params: any) => `${params.name}<br/>风险信号: ${params.value[2]} 个<br/>风险等级: ${params.data.riskLevel}<br/>研判状态: ${params.data.reviewStatus}`
      },
      grid: { left: '8%', right: '5%', top: '10%', bottom: '15%' },
      xAxis: { 
        type: 'value', min: 0, max: 100,
        name: '西 → 东', nameLocation: 'middle', nameGap: 30,
        nameTextStyle: { color: chartTextSecondary(), fontSize: 15 },
        axisLabel: { show: true, color: chartTextSecondary(), fontSize: 13 },
        axisLine: { show: true, lineStyle: { color: chartAxisColor(), width: 1.5 } },
        splitLine: { show: true, lineStyle: { color: chartSplitColor(), width: 1 } }
      },
      yAxis: { 
        type: 'value', min: 0, max: 100, 
        name: '南 → 北', nameLocation: 'middle', nameGap: 40,
        nameTextStyle: { color: chartTextSecondary(), fontSize: 15 },
        axisLabel: { show: true, color: chartTextSecondary(), fontSize: 13 },
        axisLine: { show: true, lineStyle: { color: chartAxisColor(), width: 1.5 } },
        splitLine: { show: true, lineStyle: { color: chartSplitColor(), width: 1 } }
      },
      series: [
        {
          type: 'effectScatter',
          coordinateSystem: 'cartesian2d',
          data: scatterData,
          rippleEffect: { brushType: 'stroke', scale: 4, period: 3 }, 
          itemStyle: {
            color: '#f53f3f',
            shadowBlur: 12,
            shadowColor: 'rgba(245, 63, 63, 0.5)'
          }
        }
      ]
    })
  }

  // --- 3. 渲染柱状对比图 ---
  if (barChartRef.value) {
    barChart = echarts.init(barChartRef.value)
    const allStreets = [...streetData.value].sort((a, b) => b.count - a.count)

    barChart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: tooltipBg(),
        borderColor: tooltipBorder(),
        textStyle: { color: chartTextPrimary(), fontSize: 16 }
      },
      grid: { left: '5%', right: '5%', top: '10%', bottom: '15%' },
      xAxis: { 
        type: 'category', 
        data: allStreets.map(s => s.community), 
        axisLabel: { color: chartTextSecondary(), interval: 0, rotate: 30, fontSize: 14 }, 
        axisLine: { show: true, lineStyle: { color: chartAxisColor(), width: 1.5 } },
        axisTick: { show: true }
      },
      yAxis: { 
        type: 'value', 
        splitLine: { show: true, lineStyle: { color: chartSplitColor(), width: 1 } }, 
        axisLabel: { color: chartTextSecondary(), fontSize: 15 }, 
        axisLine: { show: true, lineStyle: { color: chartAxisColor(), width: 1.5 } }
      },
      series: [{ 
        name: '风险信号',
        data: allStreets.map(s => s.count), 
        type: 'bar', 
        barWidth: '40%', 
        itemStyle: { 
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#ff7a7a' }, 
            { offset: 1, color: '#f53f3f' }
          ]), 
          borderRadius: [5, 5, 0, 0] 
        } 
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
  if (activeChart.value === 'line') lineChart?.resize()
  if (activeChart.value === 'heatmap') heatmapChart?.resize()
  if (activeChart.value === 'bar') barChart?.resize()
}

watch(activeChart, async () => {
  await nextTick()
  handleResize()
})

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
  lineChart?.dispose()
  heatmapChart?.dispose()
  barChart?.dispose()
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
  margin-bottom: 18px;
}

.review-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.review-metrics > div {
  padding: 16px;
  border-radius: 8px;
  background: rgba(245, 63, 63, 0.12);
}

.review-metrics span {
  display: block;
  margin-bottom: 8px;
  color: #9fd9ff;
  font-size: 14px;
}

.review-metrics strong {
  color: #ffb3b3;
  font-size: 28px;
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
  background: #fff3f3 !important;
}

:global(body.theme-light .political-security-page .review-metrics strong) {
  color: #b4232d !important;
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
