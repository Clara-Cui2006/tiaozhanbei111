<template>
  <div class="page-contrast">
    <BackHome />
    <a-page-header title="风险分析管理" subtitle="Risk Analysis Management" />

    <!-- Main Pie Chart Card -->
    <a-card title="案件类型占比总览" :bordered="false" style="margin-top: 14px">
      <div ref="pieChartRef" style="width: 100%; height: 500px"></div>
    </a-card>

    <!-- Sub-menu Tabs Card -->
    <a-card :bordered="false" style="margin-top: 16px">
      <a-tabs v-model:active-key="activeSubTab" type="rounded">
        <a-tab-pane key="subject" title="涉案主体特征画像">
          <a-row :gutter="16">
            <a-col :span="12">
              <div ref="subjectChartRef" style="width: 100%; height: 360px"></div>
            </a-col>
            <a-col :span="12">
              <div ref="subjectDonutRef" style="width: 100%; height: 380px"></div>
            </a-col>
          </a-row>
        </a-tab-pane>
        <a-tab-pane key="time" title="案件时间趋势画像">
          <div ref="timeChartRef" style="width: 100%; height: 380px"></div>
          <div ref="timeBarChartRef" style="width: 100%; height: 380px; margin-top: 16px"></div>
        </a-tab-pane>
        <a-tab-pane key="case-features" title="案件情节特征画像">
          <div ref="featureChartRef" style="width: 100%; height: 420px"></div>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <!-- AI Analysis Report -->
    <a-card :bordered="false" style="margin-top: 16px">
      <template #title>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>🤖 AI 案件特征智能分析</span>
          <a-button type="primary" size="small" :loading="aiReportLoading" @click="generateAiReport" :disabled="!selectedCategory">
            {{ aiReport ? '重新生成' : '生成分析报告' }}
          </a-button>
        </div>
      </template>
      <div v-if="aiReportLoading" class="ai-loading-text">
        AI 正在基于「{{ selectedCategory }}」类案件数据生成智能分析报告...
      </div>
      <div v-else-if="aiReport" class="ai-report-content" v-html="formatAiReport(aiReport)"></div>
      <div v-else class="ai-empty-text">
        选择案件分类后，点击「生成分析报告」，AI 将自动输出检察建议素材和靶向普法要点
      </div>
    </a-card>

    <!-- Case Detail Table Card -->
    <a-card title="案件细则" :bordered="false" style="margin-top: 16px">
      <div style="margin-bottom: 16px">
        <a-input v-model="caseKeyword" placeholder="输入案号、案由、关键词" :style="{ width: '360px' }"
          @press-enter="searchCases" allow-clear />
      </div>
      <a-table :columns="caseColumns" :data="filteredCaseDetails" :pagination="{ pageSize: 10 }" row-key="id">
        <template #columns>
          <a-table-column v-for="col in caseColumns" :key="col.dataIndex" :title="col.title" :data-index="col.dataIndex" :ellipsis="col.ellipsis" :width="col.width">
            <template #cell="{ record }" v-if="col.dataIndex === 'action'">
              <a-button type="text" size="small" class="case-link-btn" @click="viewCaseDetail(record)">查看详情</a-button>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router' // 【新增】
import * as echarts from 'echarts'
import BackHome from '../components/back-home.vue'
import { chatWithLLM } from '../services/llm'
import { USER_PROMPT_TEMPLATES } from '../services/prompts'
import {
  fetchCaseCategories,
  fetchCaseSubjects,
  fetchCaseTimeTrends,
  fetchCaseFeatureWords,
  fetchCaseDetails
} from '../api/platform'
import type {
  CaseCategory,
  CaseSubject,
  CaseTimeTrend,
  CaseFeatureWord,
  CaseDetail
} from '../types/platform'

const selectedCategory = ref<string>('')
const activeSubTab = ref('subject')
const caseKeyword = ref('')
const router = useRouter()
const viewCaseDetail = (record: CaseDetail) => {
  if (record.id) {
    router.push(`/case-detail/${record.id}`)
  }
}

const categories = ref<CaseCategory[]>([])
const subjects = ref<CaseSubject[]>([])
const timeTrends = ref<CaseTimeTrend[]>([])
const featureWords = ref<CaseFeatureWord[]>([])
const caseDetails = ref<CaseDetail[]>([])

// AI Report
const aiReportLoading = ref(false)
const aiReport = ref('')

// Chart DOM refs
const pieChartRef = ref<HTMLDivElement | null>(null)
const subjectChartRef = ref<HTMLDivElement | null>(null)
const subjectDonutRef = ref<HTMLDivElement | null>(null)
const timeChartRef = ref<HTMLDivElement | null>(null)
const timeBarChartRef = ref<HTMLDivElement | null>(null)
const featureChartRef = ref<HTMLDivElement | null>(null)

// Chart instances
let pieChart: echarts.ECharts | null = null
let subjectChart: echarts.ECharts | null = null
let subjectDonut: echarts.ECharts | null = null
let timeChart: echarts.ECharts | null = null
let timeBarChart: echarts.ECharts | null = null
let featureChart: echarts.ECharts | null = null
let themeObserver: MutationObserver | null = null

const getChartColors = () => isLightTheme()
  ? ['#1e5a9e', '#2d6fb0', '#3a83c1', '#4b93cc', '#5aa4d9', '#2a6aa8', '#3a79b5', '#4f8fc6', '#5fa1d4', '#23629d', '#397ab3', '#4a8ec3', '#2f73ad', '#4b90c8', '#5d9fd0', '#2b679f', '#3b7db5', '#1f5b93', '#4d92ca', '#5b9bcc']
  : ['#44c2ff', '#8ad6ff', '#5cd9ff', '#6ee8ff', '#bde9ff', '#3aabff', '#78d9ff', '#a0e8ff', '#c8f0ff', '#2d8fff', '#5bc6ff', '#90dcff', '#69d0ff', '#4db8ff', '#b0e4ff', '#56caff', '#9ee0ff', '#38a0ff', '#7cd8ff', '#c4f2ff']
const isLightTheme = () => localStorage.getItem('platform:theme-mode') === 'light'
const chartTextPrimary = () => isLightTheme() ? '#1d4f79' : '#dbf2ff'
const chartTextSecondary = () => isLightTheme() ? '#2f638f' : '#bde7ff'
const chartAxisColor = () => isLightTheme() ? 'rgba(52, 123, 180, 0.46)' : 'rgba(110,196,255,0.3)'
const chartSplitColor = () => isLightTheme() ? 'rgba(52, 123, 180, 0.16)' : 'rgba(110,196,255,0.12)'
const chartTooltipBg = () => isLightTheme() ? 'rgba(235, 246, 255, 0.96)' : 'rgba(8, 23, 44, 0.9)'
const chartTooltipBorder = () => isLightTheme() ? 'rgba(70, 136, 192, 0.42)' : 'rgba(90, 214, 255, 0.32)'

// Case detail table columns
const caseColumns = [
  { title: '案件名称', dataIndex: 'caseName', width: 180, align: 'center'}, // 建议也给名称加个宽度，防止挤压
  { title: '案件审判程序类别', dataIndex: 'procedureType', width: 190, align: 'center'}, // 将此处设置为 140 或更小
  { title: '案号', dataIndex: 'caseNumber', width: 240, align: 'center'},
  { title: '关键词', dataIndex: 'keywords', width: 400, align: 'center'},
  { title: '裁判理由', dataIndex: 'judgmentReason', ellipsis: true },
  { title: '案件详情', dataIndex: 'action', width: 120 }
]

// Filtered case details
const filteredCaseDetails = computed(() => {
  if (!caseKeyword.value) return caseDetails.value
  const kw = caseKeyword.value
  return caseDetails.value.filter(item =>
    item.caseName.includes(kw) || item.caseNumber.includes(kw) || item.keywords.includes(kw)
  )
})

const searchCases = () => {
  // Filtering is already reactive via computed, this handles press-enter UX
}

// ===== PIE CHART (nested ring with linkage) =====
const selectedPieCategory = ref<string>('')

const buildPieOption = () => {
  const selected = selectedPieCategory.value
  const isMobile = document.documentElement.classList.contains('mobile')

  // Inner ring data (一级分类)
  const innerData = categories.value.map((cat, i) => {
    const isSelected = selected === cat.name
    return {
      name: cat.name,
      value: cat.value,
      itemStyle: {
        color: getChartColors()[i % getChartColors().length],
        borderWidth: isSelected ? 3 : 0,
        borderColor: isSelected ? '#fff' : 'transparent',
        shadowBlur: isSelected ? 14 : 0,
        shadowColor: isSelected ? 'rgba(68,194,255,0.7)' : 'transparent',
        opacity: selected && !isSelected ? 0.35 : 1
      }
    }
  })

  // Outer ring data (二级分类) — filtered by selected inner category
  // 移动端：未选中时不显示外圈
  const outerData: { name: string; value: number; itemStyle: { color: string } }[] = []
  if (!isMobile || selected) {
    categories.value.forEach((cat, catIdx) => {
      if (selected && cat.name !== selected) return
      cat.children.forEach((child, childIdx) => {
        outerData.push({
          name: child.name,
          value: child.value,
          itemStyle: {
            color: getChartColors()[(catIdx * 4 + childIdx + 1) % getChartColors().length] ?? (isLightTheme() ? '#2d6fb0' : '#44c2ff')
          }
        })
      })
    })
  }

  const isMobileNoSelection = isMobile && !selected

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item' as const,
      formatter: '{b}: {c} ({d}%)',
      backgroundColor: chartTooltipBg(),
      borderColor: chartTooltipBorder(),
      textStyle: { color: chartTextPrimary() }
    },
    legend: isMobile ? { show: false } : {
      orient: 'vertical' as const,
      left: 'left',
      top: 'middle',
      textStyle: { color: chartTextPrimary(), fontSize: 16, fontFamily: 'Microsoft YaHei'},
      data: categories.value.map(c => c.name)
    },
    series: [
      {
        name: '一级分类',
        type: 'pie',
        radius: isMobile ? ['0%', isMobileNoSelection ? '55%' : '32%'] : ['0%', '40%'],
        center: isMobile ? ['50%', '50%'] : ['55%', '50%'],
        label: {
          show: true,
          position: 'inner',
          color: isLightTheme() ? '#f9fbfc' : '#103a60',
          fontSize: isMobile ? 10 : 15,
          formatter: '{b}',
          textBorderWidth: isLightTheme() ? 1 : 0.8,
          textBorderColor: isLightTheme() ? '#03215e' : '#b2d4ef',
          fontWeight: 'bold'

        },
        labelLine: { show: false },
        data: innerData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      },
      {
        name: '二级分类',
        type: 'pie',
        radius: isMobile ? ['38%', '56%'] : ['48%', '68%'],
        center: isMobile ? ['50%', '50%'] : ['55%', '50%'],
        label: {
          show: isMobile ? !!selected : true,
          color: chartTextPrimary(),
          fontSize: isMobile ? 11 : 16,
          textBorderWidth: isLightTheme() ? 0.4 : 0.8,
          textBorderColor: isLightTheme() ? '#a2c9ea' : '#436cbf'
        },
        labelLine: {
          show: isMobile ? !!selected : true,
          lineStyle: { color: chartTextSecondary() }
        },
        data: outerData,
        emphasis: {
          label: { show: true, fontSize: isMobile ? 11 : 16, formatter: '{b}\n{d}%' },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }
}

const renderPieChart = () => {
  if (!pieChartRef.value) return
  if (!pieChart) {
    pieChart = echarts.init(pieChartRef.value)
    pieChart.on('click', (params: any) => {
      const clickedName = params.name as string
      // Check if an inner ring (一级分类) was clicked
      const foundInner = categories.value.find(c => c.name === clickedName)
      if (foundInner) {
        // Toggle: clicking the same inner category again deselects it
        if (selectedPieCategory.value === foundInner.name) {
          selectedPieCategory.value = ''
        } else {
          selectedPieCategory.value = foundInner.name
        }
        selectedCategory.value = foundInner.name
        // Re-render to update outer ring linkage
        pieChart!.setOption(buildPieOption(), true)
      } else {
        // Clicked a child (outer ring) — find and select its parent
        const parent = categories.value.find(c =>
          c.children.some(ch => ch.name === clickedName)
        )
        if (parent) {
          selectedPieCategory.value = parent.name
          selectedCategory.value = parent.name
          pieChart!.setOption(buildPieOption(), true)
        }
      }
    })
  }

  pieChart.setOption(buildPieOption(), true)
}

// ===== TAB 1: Subject Profile Charts =====
const renderSubjectCharts = () => {
  if (!subjectChartRef.value || !subjectDonutRef.value) return

  // --- Age distribution bar chart ---
  const ageBuckets: Record<string, number> = { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '56+': 0 }
  subjects.value.forEach(s => {
    if (s.age <= 25) ageBuckets['18-25']!++
    else if (s.age <= 35) ageBuckets['26-35']!++
    else if (s.age <= 45) ageBuckets['36-45']!++
    else if (s.age <= 55) ageBuckets['46-55']!++
    else ageBuckets['56+']!++
  })

  if (!subjectChart) {
    subjectChart = echarts.init(subjectChartRef.value)
  }
  subjectChart.setOption({
    backgroundColor: 'transparent',
    title: { text: '年龄分布', left: 'center', textStyle: { color: chartTextPrimary(), fontSize: 14 } },
    tooltip: {
      trigger: 'axis',
      backgroundColor: chartTooltipBg(),
      borderColor: chartTooltipBorder(),
      textStyle: { color: chartTextPrimary() }
    },
    xAxis: {
      type: 'category',
      data: Object.keys(ageBuckets),
      axisLabel: { color: chartTextSecondary(), fontSize: 16},
      axisLine: { lineStyle: { color: chartAxisColor() } }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: chartTextSecondary(), fontSize: 18},
      splitLine: { lineStyle: { color: chartSplitColor() } }
    },
    series: [{
      type: 'bar',
      data: Object.values(ageBuckets),
      barWidth: '40%',
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: isLightTheme() ? '#2e6fae' : '#44c2ff' },
          { offset: 1, color: isLightTheme() ? '#1e5a9e' : '#2d8fff' }
        ]),
        borderRadius: [4, 4, 0, 0]
      }
    }],
    grid: { 
      top: 50,    // 原来是 50
      bottom: 30, // 缩小底部留白
      left: 40,   // 缩小左侧留白
      right: 10   // 缩小右侧留白
    }
  })

  // --- Gender + Resident donut chart ---
  const genderCount = { '男': 0, '女': 0 }
  const residentCount = { '本地': 0, '外来': 0 }
  subjects.value.forEach(s => {
    genderCount[s.gender]++
    if (s.isResident) residentCount['本地']++
    else residentCount['外来']++
  })

  if (!subjectDonut) {
    subjectDonut = echarts.init(subjectDonutRef.value)
  }
  subjectDonut.setOption({
    backgroundColor: 'transparent',
    title: { text: '性别及户籍比例', left: 'center', textStyle: { color: chartTextPrimary(), fontSize: 18 } },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
      backgroundColor: chartTooltipBg(),
      borderColor: chartTooltipBorder(),
      textStyle: { color: chartTextPrimary() }
    },
    legend: {
      bottom: 10,
      textStyle: { color: chartTextSecondary(), fontSize: 16},
      data: ['男', '女', '本地', '外来']
    },
    series: [
      {
        name: '性别',
        type: 'pie',
        radius: ['0%', '35%'],
        center: ['50%', '50%'],
        label: { show: true, position: 'inner', color: isLightTheme() ? '#103a60' : '#fff', fontSize: 20 },
        data: [
          { value: genderCount['男'], name: '男', itemStyle: { color: isLightTheme() ? '#2b6dab' : '#44c2ff' } },
          { value: genderCount['女'], name: '女', itemStyle: { color: isLightTheme() ? '#4f8ec3' : '#8ad6ff' } }
        ]
      },
      {
        name: '户籍',
        type: 'pie',
        radius: ['45%', '62%'],
        center: ['50%', '50%'],
        label: { color: chartTextPrimary(), fontSize: 20 },
        labelLine: { lineStyle: { color: chartTextSecondary() } },
        data: [
          { value: residentCount['本地'], name: '本地', itemStyle: { color: isLightTheme() ? '#2f73ad' : '#3aabff' } },
          { value: residentCount['外来'], name: '外来', itemStyle: { color: isLightTheme() ? '#5a98ca' : '#6ee8ff' } }
        ]
      }
    ]
  })
}

// ===== TAB 2: Time Trend Charts =====
const renderTimeCharts = () => {
  if (!timeChartRef.value || !timeBarChartRef.value) return

  // --- Line chart: monthly case count ---
  const periodMap = new Map<string, number>()
  timeTrends.value.forEach(t => {
    periodMap.set(t.period, (periodMap.get(t.period) || 0) + t.count)
  })
  const sortedPeriods = Array.from(periodMap.keys()).sort()
  const totalCounts = sortedPeriods.map(p => periodMap.get(p) || 0)

  if (!timeChart) {
    timeChart = echarts.init(timeChartRef.value)
  }
  timeChart.setOption({
    backgroundColor: 'transparent',
    title: { text: '月度案件数量趋势', left: 'center', textStyle: { color: chartTextPrimary(), fontSize: 14 } },
    tooltip: {
      trigger: 'axis',
      backgroundColor: chartTooltipBg(),
      borderColor: chartTooltipBorder(),
      textStyle: { color: chartTextPrimary() }
    },
    xAxis: {
      type: 'category',
      data: sortedPeriods,
      axisLabel: { color: chartTextSecondary(), rotate: 30, fontSize: 14 },
      axisLine: { lineStyle: { color: chartAxisColor() } }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: chartTextSecondary() , fontSize: 14},
      splitLine: { lineStyle: { color: chartSplitColor() } }
    },
    series: [{
      type: 'line',
      data: totalCounts,
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { color: isLightTheme() ? '#2f73ad' : '#44c2ff', width: 2 },
      itemStyle: { color: isLightTheme() ? '#2f73ad' : '#44c2ff' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: isLightTheme() ? 'rgba(47,115,173,0.28)' : 'rgba(68,194,255,0.35)' },
          { offset: 1, color: isLightTheme() ? 'rgba(47,115,173,0.06)' : 'rgba(68,194,255,0.05)' }
        ])
      }
    }],
    grid: { top: 80, bottom: 50, left: 50, right: 20 }
  })

  // --- Stacked bar chart: quarterly breakdown by subcategory ---
  // Group by quarter
  const quarterMap = new Map<string, Map<string, number>>()
  const allCategories = new Set<string>()
  timeTrends.value.forEach(t => {
    const [year, month] = t.period.split('-')
    const q = `${year}-Q${Math.ceil(Number(month) / 3)}`
    if (!quarterMap.has(q)) quarterMap.set(q, new Map())
    const qm = quarterMap.get(q)!
    qm.set(t.category, (qm.get(t.category) || 0) + t.count)
    allCategories.add(t.category)
  })
  const quarters = Array.from(quarterMap.keys()).sort()
  const catArr = Array.from(allCategories)

  const stackedSeries = catArr.map((cat, i) => ({
    name: cat,
    type: 'bar' as const,
    stack: 'total',
    barWidth: '40%',
    data: quarters.map(q => quarterMap.get(q)?.get(cat) || 0),
    itemStyle: { color: getChartColors()[i * 3 % getChartColors().length] }
  }))

  if (!timeBarChart) {
    timeBarChart = echarts.init(timeBarChartRef.value)
  }
  timeBarChart.setOption({
    backgroundColor: 'transparent',
    title: { text: '季度分类案件堆叠', left: 'center', textStyle: { color: chartTextPrimary(), fontSize: 14 } },
    tooltip: {
      trigger: 'axis',
      backgroundColor: chartTooltipBg(),
      borderColor: chartTooltipBorder(),
      textStyle: { color: chartTextPrimary() }
    },
    legend: {
      bottom: 0,
      textStyle: { color: chartTextSecondary(), fontSize: 14 },
      data: catArr
    },
    xAxis: {
      type: 'category',
      data: quarters,
      axisLabel: { color: chartTextSecondary() , fontSize: 14},
      axisLine: { lineStyle: { color: chartAxisColor() } }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: chartTextSecondary() , fontSize: 14},
      splitLine: { lineStyle: { color: chartSplitColor() } }
    },
    series: stackedSeries,
    grid: { top: 50, bottom: 60, left: 50, right: 20 }
  })
}

// ===== TAB 3: Feature Word Cloud (scatter) =====
const renderFeatureChart = () => {
  if (!featureChartRef.value) return

  const chartData = featureWords.value.map((word, i) => ({
    value: [Math.cos(i * 2.4) * 40 + 50, Math.sin(i * 1.8) * 35 + 50, word.value],
    name: word.name
  }))

  if (!featureChart) {
    featureChart = echarts.init(featureChartRef.value)
  }
  featureChart.setOption({
    backgroundColor: 'transparent',
    title: { text: '案件情节特征词云', left: 'center', textStyle: { color: chartTextPrimary(), fontSize: 16 } },
    tooltip: {
      formatter: (params: any) => `${params.name}: ${params.value[2]}`,
      backgroundColor: chartTooltipBg(),
      borderColor: chartTooltipBorder(),
      textStyle: { color: chartTextPrimary() }
    },
    xAxis: {
      show: false,
      min: 0,
      max: 100
    },
    yAxis: {
      show: false,
      min: 0,
      max: 100
    },
    series: [{
      type: 'scatter',
      data: chartData,
      symbolSize: (val: number[]) => Math.max((val[2] ?? 10) * 4, 50),
      label: {
        show: true,
        formatter: '{b}',
        color: chartTextPrimary(),
        fontSize: 16,
        // --- 添加文字描边 ---
        textBorderWidth: isLightTheme() ? 0.8 : 0.8,                    // 描边粗细，0.5~2 比较细腻
        textBorderColor: isLightTheme() ? '#e0e7ed' : '#0f57e7',  // 浅色背景加白边，深色背景加黑边
        // --- 添加这一行加粗 ---
        fontWeight: 'bold'
      },
      itemStyle: {
        color: (params: any) => getChartColors()[params.dataIndex % getChartColors().length],
        opacity: 0.75
      },
      emphasis: {
        itemStyle: {
          opacity: 1,
          shadowBlur: 12,
          shadowColor: 'rgba(68,194,255,0.5)'
        },
        label: { fontSize: 16, fontWeight: 'bold' }
      }
    }],
    grid: { top: 50, bottom: 20, left: 20, right: 20 }
  })
}

// ===== AI Report =====
const generateAiReport = async () => {
  if (!selectedCategory.value) return
  aiReportLoading.value = true
  try {
    // Gather current data context
    const subjectCount = subjects.value.length
    const maleCount = subjects.value.filter(s => s.gender === '男').length
    const avgAge = subjects.value.length
      ? Math.round(subjects.value.reduce((sum, s) => sum + s.age, 0) / subjects.value.length)
      : 0
    const topWords = featureWords.value.slice(0, 5).map(w => w.name).join('、')
    const caseCount = caseDetails.value.length

    const prompt = USER_PROMPT_TEMPLATES.riskAnalysis({
      category: selectedCategory.value,
      caseCount,
      subjectCount,
      maleCount,
      avgAge,
      topFeatures: topWords
    })

    aiReport.value = await chatWithLLM(prompt, 'riskAnalysis')
  } catch (e) {
    aiReport.value = '报告生成失败，请稍后重试。'
  } finally {
    aiReportLoading.value = false
  }
}

const formatAiReport = (content: string) => {
  return content
    .replace(/【(.+?)】/g, '<strong class="ai-section-title">$1</strong>')
    .replace(/\n/g, '<br>')
}

// ===== Render sub-charts based on active tab =====
const renderSubCharts = async () => {
  await nextTick()
  if (activeSubTab.value === 'subject') {
    renderSubjectCharts()
  } else if (activeSubTab.value === 'time') {
    renderTimeCharts()
  } else if (activeSubTab.value === 'case-features') {
    renderFeatureChart()
  }
}

// Watch active tab to render/resize charts when switching
watch(activeSubTab, async () => {
  await nextTick()
  renderSubCharts()
})

// Watch selectedCategory to re-fetch sub-data
watch(selectedCategory, async (cat) => {
  aiReport.value = ''
  if (!cat) return
  const [s, t, f, d] = await Promise.all([
    fetchCaseSubjects(cat),
    fetchCaseTimeTrends(cat),
    fetchCaseFeatureWords(cat),
    fetchCaseDetails({ category: cat })
  ])
  subjects.value = s
  timeTrends.value = t
  featureWords.value = f
  caseDetails.value = d

  // Supplement word cloud with keywords extracted from case details
  const keywordCounts: Record<string, number> = {}
  caseDetails.value.forEach(c => {
    c.keywords.split(/[,，、]/).forEach(kw => {
      const k = kw.trim()
      if (k) keywordCounts[k] = (keywordCounts[k] || 0) + 1
    })
  })
  const supplementWords = Object.entries(keywordCounts).map(([name, value]) => ({ name, value }))
  const existingNames = new Set(featureWords.value.map(w => w.name))
  supplementWords.forEach(w => {
    if (!existingNames.has(w.name)) {
      featureWords.value.push(w)
    }
  })

  renderSubCharts()
})

// Resize handler
const handleResize = () => {
  pieChart?.resize()
  subjectChart?.resize()
  subjectDonut?.resize()
  timeChart?.resize()
  timeBarChart?.resize()
  featureChart?.resize()
}

onMounted(async () => {
  categories.value = await fetchCaseCategories()
  renderPieChart()
  // Default to first category
  if (categories.value.length) {
    selectedCategory.value = categories.value[0]!.name
  }
  window.addEventListener('resize', handleResize)
  themeObserver = new MutationObserver(() => {
    renderPieChart()
    renderSubCharts()
  })
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  pieChart?.dispose()
  subjectChart?.dispose()
  subjectDonut?.dispose()
  timeChart?.dispose()
  timeBarChart?.dispose()
  featureChart?.dispose()
  pieChart = null
  subjectChart = null
  subjectDonut = null
  timeChart = null
  timeBarChart = null
  featureChart = null
  themeObserver?.disconnect()
  themeObserver = null
})
</script>

<style scoped>
/* ======================================================== */
/* ======= 正常作用域内的样式（表格、标题等，绝不包含占位符） ======= */
/* ======================================================== */

.page-contrast :deep(.arco-page-header-title) { color: #eff9ff; }
.page-contrast :deep(.arco-page-header-sub-title) { color: #bde7ff; }

.page-contrast :deep(.arco-table-th),
.page-contrast :deep(.arco-table-th-item),
.page-contrast :deep(.arco-table-th-title) {
  color: #dbf2ff !important;
  font-size: 18px !important;
  font-weight: 600 !important;
}

.page-contrast :deep(.arco-table-td),
.page-contrast :deep(.arco-table-cell) {
  color: #dbf2ff;
  font-size: 16px !important;
}

.page-contrast :deep(.arco-card-header-title),
.page-contrast :deep(.arco-select-view-value),
.page-contrast :deep(.arco-input) {
  color: #dbf2ff;
  font-size: 16px;
}

.page-contrast :deep(.arco-table-tr .arco-table-th) { background: rgba(13, 35, 66, 0.95); }
.page-contrast :deep(.arco-table-container),
.page-contrast :deep(.arco-table-element),
.page-contrast :deep(.arco-table-tr),
.page-contrast :deep(.arco-table-td) { background: rgba(8, 23, 44, 0.92) !important; }
.page-contrast :deep(.arco-table .arco-table-th),
.page-contrast :deep(.arco-table .arco-table-td) { border-color: rgba(110, 196, 255, 0.2); }

.detail-row { display: flex; margin-bottom: 10px; font-size: 14px; }
.detail-label { width: 84px; color: #9fd4f2; }
.detail-value { flex: 1; color: #ddf4ff; }
.detail-block {
  margin-top: 14px; padding: 10px; border: 1px solid rgba(106, 195, 255, 0.24);
  border-radius: 8px; background: rgba(10, 27, 50, 0.75);
}
.detail-block-title { color: #b6e7ff; margin-bottom: 6px; font-weight: 600; }
.detail-block-content { color: #d7f2ff; line-height: 1.6; font-size: 13px; }

.page-contrast :deep(.arco-tabs-nav-tab-list) { color: #bde7ff; }
.page-contrast :deep(.arco-tabs-nav) { background: transparent; }
.page-contrast :deep(.arco-tabs-nav::before) { border-color: rgba(110, 196, 255, 0.2); }
.page-contrast :deep(.arco-tabs-tab) { color: #9fd4f2; background: transparent; font-size: 16px !important; }
.page-contrast :deep(.arco-tabs-tab:hover) { color: #b6e7ff; background: rgba(81, 182, 255, 0.1); }
.page-contrast :deep(.arco-tabs-tab-active),
.page-contrast :deep(.arco-tabs-tab-active:hover) {
  color: #ffffff; background: linear-gradient(180deg, rgba(83, 195, 255, 0.3), rgba(46, 129, 255, 0.2));
  border-radius: 6px 6px 0 0;
}
.page-contrast :deep(.arco-tabs-nav-ink) { background: #44c2ff; }
.page-contrast :deep(.arco-tabs-content) { background: transparent; }

.page-contrast :deep(.arco-card) { background: rgba(14, 39, 78, 0.78); border-color: rgba(110, 196, 255, 0.2); }

/* 默认（深色模式）输入框背景 */
.page-contrast :deep(.arco-input-wrapper) {
  background: rgba(78, 128, 198, 0.8); border-color: rgba(110, 196, 255, 0.25);
}
.page-contrast :deep(.arco-input-wrapper:hover) { border-color: rgba(110, 196, 255, 0.5); }

.page-contrast :deep(.arco-pagination-item) { color: #bde7ff; }
.page-contrast :deep(.arco-pagination-item-active) { color: #44c2ff; background: rgba(68, 194, 255, 0.15); }

.ai-report-content { line-height: 1.8; color: #d7f2ff; font-size: 14px; padding: 8px 0; }
.ai-loading-text, .ai-empty-text { text-align: center; padding: 30px; color: #9fd4f2; }
:deep(.ai-section-title) { color: #5ad6ff; display: block; margin-top: 14px; margin-bottom: 4px; font-size: 15px; }

.case-link-btn { padding: 0; color: #44c2ff; }

/* 卡片标题基础字号 */
.page-contrast :deep(.arco-card-header-title) {
  font-size: 18px !important;
  font-weight: 600;
}

/* 兼容浅色模式表头 */
:global(body.theme-light) .page-contrast :deep(.arco-table-th),
:global(body.theme-light) .page-contrast :deep(.arco-table-th-item) {
  color: #0a2f4d !important;
}

/* 1. 恢复：确保除输入框外，其他的文字（包括表格）都是深蓝色，已加固 arco-table-cell */
:global(body.theme-light) .page-contrast :deep(.arco-page-header-title),
:global(body.theme-light) .page-contrast :deep(.arco-page-header-sub-title),
:global(body.theme-light) .page-contrast :deep(.arco-card-header-title),
:global(body.theme-light) .page-contrast :deep(.arco-table-th-item),
:global(body.theme-light) .page-contrast :deep(.arco-table-td),
:global(body.theme-light) .page-contrast :deep(.arco-table-td .arco-table-cell),
:global(body.theme-light) .page-contrast :deep(.arco-tabs-tab),
:global(body.theme-light) .page-contrast .ai-report-content {
  color: #103a60 !important;
}

/* 2. 浅色模式卡片和表格背景 */
:global(body.theme-light) .page-contrast :deep(.arco-card),
:global(body.theme-light) .page-contrast :deep(.arco-table-container),
:global(body.theme-light) .page-contrast :deep(.arco-table-element),
:global(body.theme-light) .page-contrast :deep(.arco-table-tr),
:global(body.theme-light) .page-contrast :deep(.arco-table-td) {
  background: rgba(221, 239, 255, 0.92) !important;
  border-color: rgba(70, 136, 192, 0.26) !important;
}
:global(body.theme-light) .page-contrast :deep(.arco-table-tr .arco-table-th) {
  background: rgba(196, 224, 247, 0.94) !important;
}

/* 3. 浅色模式标签页和分页器 */
:global(body.theme-light) .page-contrast :deep(.arco-tabs-tab:hover) {
  color: #0f3a60 !important;
  background: rgba(117, 173, 218, 0.22) !important;
}
:global(body.theme-light) .page-contrast :deep(.arco-tabs-tab-active),
:global(body.theme-light) .page-contrast :deep(.arco-tabs-tab-active:hover) {
  color: #072a45 !important;
  background: linear-gradient(180deg, rgba(152, 203, 243, 0.95), rgba(127, 187, 234, 0.95)) !important;
}
:global(body.theme-light) .page-contrast :deep(.arco-pagination-item) {
  color: #123f66 !important;
  background: rgba(228, 241, 253, 0.92) !important;
}
:global(body.theme-light) .page-contrast :deep(.arco-pagination-item-active) {
  color: #0a2f4d !important;
  background: rgba(157, 205, 241, 0.92) !important;
  border-color: rgba(70, 136, 192, 0.52) !important;
}

:global(body.theme-light) .page-contrast button.arco-btn.case-link-btn,
:global(body.theme-light) .page-contrast button.arco-btn.case-link-btn > span {
  color: #140ade !important; /* 经典的链接亮蓝色，浅色背景下依然清晰 */
  font-weight: 600 !important;
}

:global(body.theme-light) .page-contrast .ai-loading-text,
:global(body.theme-light) .page-contrast .ai-empty-text,
:global(body.theme-light) .page-contrast :deep(.ai-section-title) {
  color: #1d4f79 !important;
}

/* 强制浅色模式下，输入框背景依然是深蓝 */
:global(body.theme-light) .page-contrast :deep(.arco-input-wrapper) {
  background: rgba(255, 255, 255, 0.8) !important;
  border-color: rgba(56, 154, 219, 0.25) !important;
}
:global(body.theme-light) .page-contrast :deep(.arco-input-wrapper) input {
  color: #ffffff !important;
}
</style>

<style>
/* 强制浅色模式下，占位符为半透明白色，脱离 scoped 彻底解决解析崩溃问题 */
body.theme-light .page-contrast .arco-input-wrapper input::-webkit-input-placeholder {
  color: rgb(6, 37, 103) !important;
  -webkit-text-fill-color:  rgb(6, 37, 103) !important;
}
body.theme-light .page-contrast .arco-input-wrapper input::-moz-placeholder {
  color:  rgb(6, 37, 103) !important;
  opacity: 1 !important;
}
body.theme-light .page-contrast .arco-input-wrapper input::placeholder {
  color:  rgb(6, 37, 103) !important;
  -webkit-text-fill-color:  rgb(6, 37, 103) !important;
}
</style>