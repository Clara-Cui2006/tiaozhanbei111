<template>
  <div class="page-contrast">
    <BackHome />
    <a-page-header title="风险分析管理" subtitle="Risk Analysis Management" />

    <!-- Main Pie Chart Card -->
    <a-card title="案件类型占比总览" :bordered="false" class="holo-card holo-card--gold" style="margin-top: 14px">
      <div class="chart-stage chart-stage--main">
        <div class="chart-stage__halo"></div>
        <div ref="pieChartRef" class="chart-canvas chart-canvas--main"></div>
      </div>
    </a-card>

    <!-- Sub-menu Tabs Card -->
    <a-card :bordered="false" class="holo-card holo-card--silver" style="margin-top: 16px">
      <a-tabs v-model:active-key="activeSubTab" type="rounded">
        <a-tab-pane key="subject" title="涉案主体特征画像">
          <a-row :gutter="16">
            <a-col :xs="24" :md="12">
              <div class="chart-stage chart-stage--sub chart-stage--amber">
                <div ref="subjectChartRef" class="chart-canvas chart-canvas--sub"></div>
              </div>
            </a-col>
            <a-col :xs="24" :md="12">
              <div class="chart-stage chart-stage--sub chart-stage--violet">
                <div ref="subjectDonutRef" class="chart-canvas chart-canvas--sub"></div>
              </div>
            </a-col>
          </a-row>
        </a-tab-pane>
        <a-tab-pane key="time" title="案件时间趋势画像">
          <div class="chart-stage chart-stage--time chart-stage--cyan">
            <div ref="timeChartRef" class="chart-canvas chart-canvas--time"></div>
          </div>
          <div class="chart-stage chart-stage--time chart-stage--gold" style="margin-top: 16px">
            <div ref="timeBarChartRef" class="chart-canvas chart-canvas--time"></div>
          </div>
        </a-tab-pane>
        <a-tab-pane key="case-features" title="案件情节特征画像">
          <div class="feature-scene">
            <div class="feature-scene__title">案件情节特征云</div>
            <div class="feature-scene__grid"></div>
            <div class="feature-scene__beam"></div>
            <div
              v-for="bubble in featureBubbleData"
              :key="bubble.key"
              class="feature-bubble"
              :style="bubble.style"
              :title="`${bubble.name}: ${bubble.value}`"
            >
              <span class="feature-bubble__shine"></span>
              <span class="feature-bubble__text">{{ bubble.name }}</span>
            </div>
          </div>
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

// Chart instances
let pieChart: echarts.ECharts | null = null
let subjectChart: echarts.ECharts | null = null
let subjectDonut: echarts.ECharts | null = null
let timeChart: echarts.ECharts | null = null
let timeBarChart: echarts.ECharts | null = null
let themeObserver: MutationObserver | null = null

const isLightTheme = () => localStorage.getItem('platform:theme-mode') === 'light'

// 视觉规范：同页面不同图表使用不同梯度色系，避免“一屏全蓝”
const CHART_PALETTES = {
  rainbow: ['#ff3b5c', '#ff7a1a', '#ffc928', '#8edc3f', '#1fd6a7', '#26c8ff', '#4d76ff', '#8a5cff', '#d64dff', '#ff4fa8'],
  subject: ['#744cff', '#9d59ff', '#d450ff', '#36d8ff', '#1ab4ff', '#2fe3c0'],
  age: ['#ff4f5e', '#ff8a22', '#ffd83a', '#7ed957', '#20d6b2'],
  time: ['#1bd7ff', '#2b9bff', '#5f72ff', '#9a5dff', '#27e2bc'],
  caseBlue: ['#0e66ff', '#168bff', '#20b9ff', '#48d5ff', '#79e6ff']
}

const getChartColors = () => isLightTheme()
  ? ['#d9485f', '#e57a26', '#d8a915', '#6fa936', '#159c7d', '#1b87bd', '#425db8', '#7550b8', '#a445b0', '#c93c7f']
  : CHART_PALETTES.rainbow

const chartTextPrimary = () => isLightTheme() ? '#183b5a' : '#ecf8ff'
const chartTextSecondary = () => isLightTheme() ? '#416989' : '#b9ddf3'
const chartAxisColor = () => isLightTheme() ? 'rgba(70, 118, 158, 0.42)' : 'rgba(160,210,255,0.34)'
const chartSplitColor = () => isLightTheme() ? 'rgba(76, 125, 166, 0.13)' : 'rgba(96,166,230,0.12)'
const chartTooltipBg = () => isLightTheme() ? 'rgba(245, 250, 255, 0.97)' : 'rgba(6, 18, 36, 0.94)'
const chartTooltipBorder = () => isLightTheme() ? 'rgba(166, 128, 51, 0.42)' : 'rgba(238, 210, 138, 0.58)'

const clamp = (n: number, min = 0, max = 255) => Math.min(max, Math.max(min, Math.round(n)))
const normalizeHex = (hex: string) => hex.replace('#', '').trim()
const shadeHex = (hex: string, amount: number) => {
  const raw = normalizeHex(hex)
  const full = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw.padEnd(6, '0').slice(0, 6)
  const num = Number.parseInt(full, 16)
  const r = clamp((num >> 16) + amount)
  const g = clamp(((num >> 8) & 0xff) + amount)
  const b = clamp((num & 0xff) + amount)
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`
}
const rgbaHex = (hex: string, alpha: number) => {
  const raw = normalizeHex(hex)
  const full = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw.padEnd(6, '0').slice(0, 6)
  const num = Number.parseInt(full, 16)
  return `rgba(${num >> 16}, ${(num >> 8) & 0xff}, ${num & 0xff}, ${alpha})`
}
const verticalGradient = (color: string, topBoost = 42, bottomDrop = -46) => new echarts.graphic.LinearGradient(0, 0, 0, 1, [
  { offset: 0, color: shadeHex(color, topBoost) },
  { offset: 0.46, color },
  { offset: 1, color: shadeHex(color, bottomDrop) }
])

const sliceStyle = (color: string, index: number, selected = false) => ({
  color: verticalGradient(color),
  borderColor: index % 2 === 0 ? '#f3d28a' : '#bfe8ff',
  borderWidth: selected ? 3 : 1.6,
  borderRadius: 8,
  shadowBlur: selected ? 26 : 16,
  shadowOffsetY: selected ? 14 : 10,
  shadowColor: rgbaHex(color, selected ? 0.78 : 0.48),
  opacity: 1
})

const offsetPercent = (value: string, delta: number) => `${Number.parseFloat(value) + delta}%`

// ECharts 本身不依赖 echarts-gl：通过多层静默饼图向下错位，模拟“披萨切片”厚度。
const buildPieDepthLayers = (
  name: string,
  data: any[],
  radius: [string, string],
  center: [string, string],
  depth = 7,
  extra: Record<string, any> = {}
) => Array.from({ length: depth }, (_, layerIndex) => {
  const y = offsetPercent(center[1], (depth - layerIndex) * 0.58)
  return {
    name: `${name}-depth-${layerIndex}`,
    type: 'pie' as const,
    radius,
    center: [center[0], y],
    silent: true,
    animation: false,
    z: 1 + layerIndex,
    label: { show: false },
    labelLine: { show: false },
    tooltip: { show: false },
    itemStyle: { borderWidth: 0 },
    ...extra,
    data: data.map((item: any) => {
      const base = item.__baseColor || '#279cff'
      return {
        name: item.name,
        value: item.value,
        itemStyle: {
          color: verticalGradient(shadeHex(base, -48), 10, -28),
          borderColor: 'rgba(0, 0, 0, 0.22)',
          borderWidth: 1,
          opacity: item.itemStyle?.opacity ?? 1
        }
      }
    })
  }
})

const BUBBLE_LAYOUTS = [
  [12, 24], [25, 16], [39, 30], [55, 18], [72, 24], [86, 16],
  [17, 58], [31, 66], [48, 58], [63, 63], [79, 58], [91, 68],
  [8, 78], [24, 82], [42, 80], [59, 82], [75, 82], [87, 84]
]
const BUBBLE_COLORS = ['#1f9dff', '#7d58ff', '#d04cff', '#19d6c1', '#ff9a2a', '#48ce6a', '#29bfff', '#ff5c66']

const featureBubbleData = computed(() => {
  const source = [...featureWords.value].sort((a, b) => b.value - a.value).slice(0, BUBBLE_LAYOUTS.length)
  if (!source.length) return []
  const max = Math.max(...source.map(item => item.value), 1)
  const min = Math.min(...source.map(item => item.value), 0)
  const span = Math.max(max - min, 1)

  return source.map((word, index) => {
    const [x, y] = BUBBLE_LAYOUTS[index % BUBBLE_LAYOUTS.length]!
    const normalized = (word.value - min) / span
    const size = Math.round(72 + normalized * 76 + (index % 3) * 4)
    const color = BUBBLE_COLORS[index % BUBBLE_COLORS.length]!
    return {
      key: `${word.name}-${index}`,
      name: word.name,
      value: word.value,
      style: {
        left: `${x}%`,
        top: `${y}%`,
        width: `${size}px`,
        height: `${size}px`,
        '--bubble-color': color,
        '--bubble-light': shadeHex(color, 58),
        '--bubble-dark': shadeHex(color, -54),
        '--bubble-shadow': rgbaHex(color, 0.68),
        '--float-x': `${(index % 2 === 0 ? 1 : -1) * (8 + index % 5 * 3)}px`,
        '--float-y': `${-14 - index % 4 * 7}px`,
        '--delay': `${-(index * 0.73) % 7}s`,
        '--duration': `${7.2 + (index % 5) * 1.25}s`
      } as Record<string, string>
    }
  })
})

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
  const palette = getChartColors()

  // 一级分类：彩虹分层 + 金/银交错描边 + 选中切片凸起
  const innerData = categories.value.map((cat, i) => {
    const isSelected = selected === cat.name
    const color = palette[i % palette.length]!
    return {
      name: cat.name,
      value: cat.value,
      selected: isSelected,
      __baseColor: color,
      itemStyle: {
        ...sliceStyle(color, i, isSelected),
        opacity: selected && !isSelected ? 0.38 : 1
      }
    }
  })

  // 二级分类：根据一级分类联动。颜色相对一级错开，减少视觉重复。
  const outerData: any[] = []
  if (!isMobile || selected) {
    categories.value.forEach((cat, catIdx) => {
      if (selected && cat.name !== selected) return
      cat.children.forEach((child, childIdx) => {
        const color = palette[(catIdx * 3 + childIdx + 2) % palette.length]!
        outerData.push({
          name: child.name,
          value: child.value,
          __baseColor: color,
          itemStyle: sliceStyle(color, catIdx + childIdx + 1)
        })
      })
    })
  }

  const isMobileNoSelection = isMobile && !selected
  const center: [string, string] = isMobile ? ['50%', '47%'] : ['56%', '47%']
  const innerRadius: [string, string] = isMobile
    ? (isMobileNoSelection ? ['18%', '53%'] : ['17%', '34%'])
    : ['18%', '38%']
  const outerRadius: [string, string] = isMobile ? ['41%', '58%'] : ['45%', '68%']

  const innerDepth = buildPieDepthLayers('一级分类', innerData, innerRadius, center, 8, {
    startAngle: 96,
    clockwise: true
  })
  const outerDepth = isMobileNoSelection ? [] : buildPieDepthLayers('二级分类', outerData, outerRadius, center, 8, {
    startAngle: 96,
    clockwise: true
  })

  return {
    backgroundColor: 'transparent',
    animationDuration: 900,
    animationEasing: 'cubicOut' as const,
    tooltip: {
      trigger: 'item' as const,
      formatter: '{b}: {c} ({d}%)',
      backgroundColor: chartTooltipBg(),
      borderColor: chartTooltipBorder(),
      borderWidth: 1,
      extraCssText: 'box-shadow:0 10px 30px rgba(0,0,0,.35);backdrop-filter:blur(8px);',
      textStyle: { color: chartTextPrimary() }
    },
    legend: isMobile ? { show: false } : {
      orient: 'vertical' as const,
      left: 16,
      top: 'middle',
      itemWidth: 12,
      itemHeight: 12,
      itemGap: 13,
      textStyle: { color: chartTextPrimary(), fontSize: 15, fontFamily: 'Microsoft YaHei' },
      data: categories.value.map(c => c.name)
    },
    series: [
      ...innerDepth,
      ...outerDepth,
      {
        name: '一级分类',
        type: 'pie',
        radius: innerRadius,
        center,
        startAngle: 96,
        selectedMode: 'single',
        selectedOffset: isMobile ? 8 : 12,
        padAngle: 2,
        minShowLabelAngle: 4,
        avoidLabelOverlap: true,
        z: 30,
        label: {
          show: true,
          position: 'inside',
          color: '#f8fbff',
          fontSize: isMobile ? 10 : 13,
          formatter: '{b}',
          textBorderWidth: 2,
          textBorderColor: 'rgba(0, 15, 36, .72)',
          fontWeight: 'bold'
        },
        labelLine: { show: false },
        itemStyle: { borderRadius: 8 },
        emphasis: {
          scale: true,
          scaleSize: 8,
          itemStyle: {
            shadowBlur: 32,
            shadowOffsetY: 14,
            shadowColor: 'rgba(255,214,128,.62)'
          }
        },
        data: innerData
      },
      ...(isMobileNoSelection ? [] : [{
        name: '二级分类',
        type: 'pie' as const,
        radius: outerRadius,
        center,
        startAngle: 96,
        selectedOffset: 10,
        padAngle: 2.5,
        minShowLabelAngle: 2,
        avoidLabelOverlap: true,
        z: 31,
        label: {
          show: isMobile ? !!selected : true,
          color: chartTextPrimary(),
          fontSize: isMobile ? 10 : 13,
          lineHeight: 18,
          formatter: '{b}\n{d}%',
          textBorderWidth: 2,
          textBorderColor: isLightTheme() ? 'rgba(255,255,255,.9)' : 'rgba(0,12,30,.9)'
        },
        labelLine: {
          show: isMobile ? !!selected : true,
          length: 12,
          length2: 10,
          smooth: 0.2,
          lineStyle: { color: isLightTheme() ? 'rgba(116,94,46,.75)' : 'rgba(218,231,244,.72)', width: 1.2 }
        },
        itemStyle: { borderRadius: 8 },
        emphasis: {
          scale: true,
          scaleSize: 10,
          label: { show: true, fontSize: isMobile ? 11 : 14, fontWeight: 'bold' },
          itemStyle: {
            shadowBlur: 30,
            shadowOffsetY: 14,
            shadowColor: 'rgba(116,198,255,.58)'
          }
        },
        data: outerData
      }])
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

  // --- Age distribution bar chart: 赤橙黄绿青，金属描边 + 阴影浮起 ---
  const ageBuckets: Record<string, number> = { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '56+': 0 }
  subjects.value.forEach(s => {
    if (s.age <= 25) ageBuckets['18-25']!++
    else if (s.age <= 35) ageBuckets['26-35']!++
    else if (s.age <= 45) ageBuckets['36-45']!++
    else if (s.age <= 55) ageBuckets['46-55']!++
    else ageBuckets['56+']!++
  })

  if (!subjectChart) subjectChart = echarts.init(subjectChartRef.value)
  const ageValues = Object.values(ageBuckets)
  subjectChart.setOption({
    backgroundColor: 'transparent',
    title: {
      text: '年龄分布',
      left: 'center',
      top: 8,
      textStyle: { color: chartTextPrimary(), fontSize: 16, fontWeight: 700, textShadowBlur: 10, textShadowColor: 'rgba(255,194,86,.35)' }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: chartTooltipBg(),
      borderColor: '#e9c779',
      textStyle: { color: chartTextPrimary() }
    },
    xAxis: {
      type: 'category',
      data: Object.keys(ageBuckets),
      axisLabel: { color: chartTextSecondary(), fontSize: 14 },
      axisLine: { lineStyle: { color: chartAxisColor() } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: chartTextSecondary(), fontSize: 13 },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: chartSplitColor(), type: 'dashed' } }
    },
    series: [{
      name: '人数',
      type: 'bar',
      data: ageValues.map((value, i) => {
        const color = CHART_PALETTES.age[i % CHART_PALETTES.age.length]!
        return {
          value,
          itemStyle: {
            color: verticalGradient(color, 52, -50),
            borderColor: i % 2 ? '#d6f0ff' : '#f3d28a',
            borderWidth: 1.2,
            borderRadius: [9, 9, 3, 3],
            shadowBlur: 18,
            shadowOffsetY: 12,
            shadowColor: rgbaHex(color, 0.5)
          }
        }
      }),
      barWidth: '42%',
      showBackground: true,
      backgroundStyle: {
        color: isLightTheme() ? 'rgba(74,108,138,.06)' : 'rgba(16,56,94,.16)',
        borderColor: isLightTheme() ? 'rgba(88,116,141,.12)' : 'rgba(149,206,255,.08)',
        borderWidth: 1,
        borderRadius: [10, 10, 3, 3]
      },
      emphasis: {
        itemStyle: { shadowBlur: 30, shadowOffsetY: 16 }
      }
    }],
    grid: { top: 58, bottom: 34, left: 46, right: 18 }
  }, true)

  // --- Gender + Resident donut chart: 蓝紫/青色独立配色，双环 3D 浮起 ---
  const genderCount = { '男': 0, '女': 0 }
  const residentCount = { '本地': 0, '外来': 0 }
  subjects.value.forEach(s => {
    genderCount[s.gender]++
    if (s.isResident) residentCount['本地']++
    else residentCount['外来']++
  })

  if (!subjectDonut) subjectDonut = echarts.init(subjectDonutRef.value)

  const genderColors = CHART_PALETTES.subject.slice(0, 2)
  const residentColors = CHART_PALETTES.subject.slice(2, 4)
  const genderData = [
    { value: genderCount['男'], name: '男', __baseColor: genderColors[0], itemStyle: sliceStyle(genderColors[0]!, 0) },
    { value: genderCount['女'], name: '女', __baseColor: genderColors[1], itemStyle: sliceStyle(genderColors[1]!, 1) }
  ]
  const residentData = [
    { value: residentCount['本地'], name: '本地', __baseColor: residentColors[0], itemStyle: sliceStyle(residentColors[0]!, 2) },
    { value: residentCount['外来'], name: '外来', __baseColor: residentColors[1], itemStyle: sliceStyle(residentColors[1]!, 3) }
  ]
  const donutCenter: [string, string] = ['50%', '47%']
  const genderRadius: [string, string] = ['15%', '34%']
  const residentRadius: [string, string] = ['43%', '64%']

  subjectDonut.setOption({
    backgroundColor: 'transparent',
    animationDuration: 850,
    title: {
      text: '性别及户籍比例',
      left: 'center',
      top: 8,
      textStyle: { color: chartTextPrimary(), fontSize: 16, fontWeight: 700, textShadowBlur: 10, textShadowColor: 'rgba(117,92,255,.45)' }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a}<br/>{b}: {c} ({d}%)',
      backgroundColor: chartTooltipBg(),
      borderColor: '#c5dcff',
      textStyle: { color: chartTextPrimary() }
    },
    legend: {
      bottom: 6,
      itemWidth: 12,
      itemHeight: 12,
      itemGap: 18,
      textStyle: { color: chartTextSecondary(), fontSize: 14 },
      data: ['男', '女', '本地', '外来']
    },
    series: [
      ...buildPieDepthLayers('性别', genderData, genderRadius, donutCenter, 7, { startAngle: 90 }),
      ...buildPieDepthLayers('户籍', residentData, residentRadius, donutCenter, 7, { startAngle: 90 }),
      {
        name: '性别',
        type: 'pie',
        radius: genderRadius,
        center: donutCenter,
        startAngle: 90,
        z: 30,
        selectedOffset: 10,
        padAngle: 3,
        label: { show: true, position: 'inside', color: '#ffffff', fontSize: 16, fontWeight: 700, textBorderWidth: 2, textBorderColor: 'rgba(0,0,25,.65)' },
        labelLine: { show: false },
        emphasis: { scale: true, scaleSize: 8, itemStyle: { shadowBlur: 28 } },
        data: genderData
      },
      {
        name: '户籍',
        type: 'pie',
        radius: residentRadius,
        center: donutCenter,
        startAngle: 90,
        z: 31,
        selectedOffset: 12,
        padAngle: 3,
        label: { color: chartTextPrimary(), fontSize: 15, formatter: '{b}\n{d}%', textBorderWidth: 2, textBorderColor: isLightTheme() ? '#fff' : '#06152c' },
        labelLine: { length: 12, length2: 10, lineStyle: { color: '#b8ddff', width: 1.2 } },
        emphasis: { scale: true, scaleSize: 10, itemStyle: { shadowBlur: 30 } },
        data: residentData
      }
    ]
  }, true)
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
  const maxCount = totalCounts.length ? Math.max(...totalCounts) : 0
  const maxIndex = totalCounts.indexOf(maxCount)
  const mainLineColor = isLightTheme() ? '#2378c7' : '#34c9ff'

  if (!timeChart) timeChart = echarts.init(timeChartRef.value)
  timeChart.setOption({
    backgroundColor: 'transparent',
    animationDuration: 1000,
    title: {
      text: '月度案件数量趋势',
      left: 'center',
      top: 8,
      textStyle: { color: chartTextPrimary(), fontSize: 16, fontWeight: 700, textShadowBlur: 12, textShadowColor: 'rgba(60,176,255,.46)' }
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: chartTooltipBg(),
      borderColor: '#a8dfff',
      textStyle: { color: chartTextPrimary() },
      axisPointer: { lineStyle: { color: 'rgba(217,235,255,.6)', type: 'dashed' } }
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: sortedPeriods,
      axisLabel: { color: chartTextSecondary(), rotate: 22, fontSize: 12 },
      axisLine: { lineStyle: { color: chartAxisColor(), width: 1.2 } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: chartTextSecondary(), fontSize: 12 },
      splitLine: { lineStyle: { color: chartSplitColor(), type: 'dashed' } }
    },
    series: [
      // 底层宽线只负责发光，形成“悬浮轨迹”
      {
        type: 'line',
        data: totalCounts,
        smooth: true,
        silent: true,
        symbol: 'none',
        lineStyle: { color: rgbaHex(mainLineColor, 0.16), width: 13, shadowBlur: 24, shadowColor: rgbaHex(mainLineColor, 0.55) },
        z: 1
      },
      {
        name: '案件数',
        type: 'line',
        data: totalCounts,
        smooth: true,
        symbol: 'circle',
        symbolSize: 9,
        lineStyle: { color: mainLineColor, width: 3.2, shadowBlur: 18, shadowColor: rgbaHex(mainLineColor, 0.9) },
        itemStyle: {
          color: '#f7fcff',
          borderColor: mainLineColor,
          borderWidth: 3,
          shadowBlur: 18,
          shadowColor: rgbaHex(mainLineColor, 0.95)
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: isLightTheme() ? 'rgba(51,151,225,.38)' : 'rgba(68,120,255,.58)' },
            { offset: 0.45, color: isLightTheme() ? 'rgba(72,127,204,.18)' : 'rgba(92,70,255,.24)' },
            { offset: 1, color: 'rgba(18,42,86,0.02)' }
          ])
        },
        markPoint: maxIndex >= 0 ? {
          symbol: 'pin',
          symbolSize: 52,
          data: [{ coord: [sortedPeriods[maxIndex], maxCount], value: maxCount }],
          itemStyle: {
            color: verticalGradient('#ffc533', 34, -48),
            borderColor: '#fff0ba',
            borderWidth: 1.4,
            shadowBlur: 24,
            shadowColor: 'rgba(255,190,56,.72)'
          },
          label: { color: '#111827', fontWeight: 800 }
        } : undefined,
        z: 5
      }
    ],
    grid: { top: 70, bottom: 52, left: 52, right: 24 }
  }, true)

  // --- Stacked bar chart: quarterly breakdown by subcategory ---
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
  const stackPalette = ['#ff5c5c', '#ff962f', '#ffd13b', '#4bd47d', '#2fd6c4', '#2ca7ff', '#7b66ff', '#cf58ff']

  const stackedSeries = catArr.map((cat, i) => {
    const color = stackPalette[i % stackPalette.length]!
    return {
      name: cat,
      type: 'bar' as const,
      stack: 'total',
      barWidth: '42%',
      data: quarters.map(q => quarterMap.get(q)?.get(cat) || 0),
      itemStyle: {
        color: verticalGradient(color, 44, -46),
        borderColor: i % 2 ? '#d7edff' : '#f0d186',
        borderWidth: 0.8,
        borderRadius: i === catArr.length - 1 ? [7, 7, 0, 0] : 0,
        shadowBlur: 10,
        shadowOffsetY: 6,
        shadowColor: rgbaHex(color, 0.34)
      },
      emphasis: { itemStyle: { shadowBlur: 24, shadowOffsetY: 10, shadowColor: rgbaHex(color, 0.68) } }
    }
  })

  if (!timeBarChart) timeBarChart = echarts.init(timeBarChartRef.value)
  timeBarChart.setOption({
    backgroundColor: 'transparent',
    animationDuration: 950,
    title: {
      text: '季度分类案件堆叠',
      left: 'center',
      top: 8,
      textStyle: { color: chartTextPrimary(), fontSize: 16, fontWeight: 700, textShadowBlur: 10, textShadowColor: 'rgba(255,194,86,.36)' }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: chartTooltipBg(),
      borderColor: '#e9c779',
      textStyle: { color: chartTextPrimary() }
    },
    legend: {
      bottom: 0,
      type: 'scroll',
      itemWidth: 12,
      itemHeight: 12,
      textStyle: { color: chartTextSecondary(), fontSize: 12 },
      data: catArr
    },
    xAxis: {
      type: 'category',
      data: quarters,
      axisLabel: { color: chartTextSecondary(), fontSize: 13 },
      axisLine: { lineStyle: { color: chartAxisColor() } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: chartTextSecondary(), fontSize: 12 },
      splitLine: { lineStyle: { color: chartSplitColor(), type: 'dashed' } }
    },
    series: stackedSeries,
    grid: { top: 60, bottom: 66, left: 52, right: 24 }
  }, true)
}

// ===== TAB 3: Feature Bubble Cloud =====
// 案件情节特征改为 DOM + CSS 动态气泡：无需额外图表插件，切换 Tab 即可持续漂浮。

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
  pieChart = null
  subjectChart = null
  subjectDonut = null
  timeChart = null
  timeBarChart = null
  themeObserver?.disconnect()
  themeObserver = null
})
</script>

<style scoped>
/* ======================================================== */
/* ======= 正常作用域内的样式（表格、标题等，绝不包含占位符） ======= */
/* ======================================================== */

/* ===================== 驾驶舱 3D 视觉层 ===================== */
.page-contrast {
  position: relative;
  min-height: 100vh;
  isolation: isolate;
}

.page-contrast::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: -1;
  background:
    radial-gradient(circle at 12% 8%, rgba(25, 130, 255, .13), transparent 32%),
    radial-gradient(circle at 84% 12%, rgba(255, 162, 45, .08), transparent 27%),
    linear-gradient(180deg, rgba(1, 9, 23, .14), rgba(1, 11, 27, .38));
}

.holo-card {
  position: relative;
  border: 1px solid rgba(187, 222, 255, .28) !important;
  border-radius: 12px !important;
  overflow: hidden;
  background:
    linear-gradient(145deg, rgba(14, 42, 78, .88), rgba(5, 20, 43, .82)) !important;
  box-shadow:
    0 22px 45px rgba(0, 0, 0, .28),
    inset 0 1px 0 rgba(255, 255, 255, .08),
    inset 0 -1px 0 rgba(99, 185, 255, .08);
  backdrop-filter: blur(10px);
  transition: transform .28s ease, box-shadow .28s ease;
}

.holo-card:hover {
  transform: translateY(-3px);
  box-shadow:
    0 28px 58px rgba(0, 0, 0, .34),
    0 0 26px rgba(56, 166, 255, .09),
    inset 0 1px 0 rgba(255, 255, 255, .1);
}

.holo-card::before,
.holo-card::after {
  content: '';
  position: absolute;
  pointer-events: none;
  z-index: 4;
}

.holo-card::before {
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(120deg, rgba(255, 220, 145, .92), rgba(255, 255, 255, .08) 32%, rgba(126, 211, 255, .72) 70%, rgba(255, 196, 86, .75));
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: .72;
}

.holo-card::after {
  left: 4%;
  right: 4%;
  top: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 218, 128, .8), rgba(208, 242, 255, .92), transparent);
  filter: drop-shadow(0 0 8px rgba(101, 193, 255, .7));
}

.holo-card--gold::before {
  background: linear-gradient(110deg, #e8b84e, rgba(255,255,255,.08) 28%, #8cdcff 72%, #ffd98c);
}

.holo-card--silver::before {
  background: linear-gradient(110deg, #b8d8ed, rgba(255,255,255,.06) 32%, #7fd8ff 70%, #f0cf7d);
}

.chart-stage {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid rgba(170, 220, 255, .16);
  background:
    radial-gradient(circle at 50% 38%, rgba(41, 112, 188, .18), transparent 42%),
    linear-gradient(180deg, rgba(5, 24, 49, .55), rgba(1, 13, 30, .38));
  box-shadow:
    inset 0 0 42px rgba(41, 138, 230, .07),
    0 14px 26px rgba(0, 0, 0, .18);
  perspective: 1000px;
}

.chart-stage::before {
  content: '';
  position: absolute;
  inset: auto 8% 5% 8%;
  height: 28%;
  border-radius: 50%;
  transform: perspective(440px) rotateX(68deg);
  background:
    repeating-linear-gradient(90deg, rgba(74, 170, 255, .12) 0 1px, transparent 1px 34px),
    repeating-linear-gradient(0deg, rgba(74, 170, 255, .10) 0 1px, transparent 1px 22px);
  filter: drop-shadow(0 0 10px rgba(54, 166, 255, .22));
  opacity: .58;
  pointer-events: none;
}

.chart-stage__halo {
  position: absolute;
  left: 50%;
  bottom: 10%;
  width: 42%;
  height: 18%;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(255, 189, 69, .22), rgba(61, 154, 255, .12) 45%, transparent 72%);
  filter: blur(12px);
  animation: stagePulse 3.8s ease-in-out infinite;
  pointer-events: none;
}

.chart-stage--amber { box-shadow: inset 0 0 34px rgba(255, 165, 46, .06), 0 16px 30px rgba(0,0,0,.18); }
.chart-stage--violet { box-shadow: inset 0 0 34px rgba(136, 83, 255, .08), 0 16px 30px rgba(0,0,0,.18); }
.chart-stage--cyan { box-shadow: inset 0 0 34px rgba(42, 200, 255, .08), 0 16px 30px rgba(0,0,0,.18); }
.chart-stage--gold { box-shadow: inset 0 0 34px rgba(255, 190, 66, .07), 0 16px 30px rgba(0,0,0,.18); }

.chart-canvas { position: relative; z-index: 2; width: 100%; }
.chart-canvas--main { height: 500px; }
.chart-canvas--sub { height: 380px; }
.chart-canvas--time { height: 390px; }

@keyframes stagePulse {
  0%, 100% { opacity: .5; transform: translateX(-50%) scale(.95); }
  50% { opacity: .92; transform: translateX(-50%) scale(1.08); }
}

/* ===================== 案件情节动态气泡场景 ===================== */
.feature-scene {
  position: relative;
  height: 470px;
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid rgba(174, 222, 255, .28);
  background-image:
    linear-gradient(180deg, rgba(0, 13, 34, .14) 0%, rgba(0, 16, 40, .22) 42%, rgba(0, 10, 30, .68) 100%),
    url('/images/financial-street-city-grid.png');
  background-size: cover;
  background-position: center bottom;
  box-shadow:
    inset 0 0 70px rgba(17, 111, 205, .18),
    inset 0 -54px 90px rgba(0, 8, 25, .52),
    0 20px 42px rgba(0, 0, 0, .25);
  perspective: 900px;
}

.feature-scene::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 50% 18%, rgba(77, 180, 255, .18), transparent 28%),
    radial-gradient(circle at 23% 44%, rgba(101, 82, 255, .10), transparent 22%),
    radial-gradient(circle at 78% 50%, rgba(255, 169, 67, .08), transparent 20%);
  mix-blend-mode: screen;
}

.feature-scene__title {
  position: absolute;
  z-index: 6;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  padding: 5px 24px 7px;
  color: #effaff;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 3px;
  text-shadow: 0 0 10px rgba(76, 187, 255, .9), 0 0 22px rgba(42, 129, 255, .7);
  background: linear-gradient(90deg, transparent, rgba(29, 112, 211, .22), transparent);
  border-top: 1px solid rgba(126, 210, 255, .45);
  border-bottom: 1px solid rgba(126, 210, 255, .18);
}

.feature-scene__grid {
  position: absolute;
  z-index: 1;
  left: -10%;
  right: -10%;
  bottom: -25%;
  height: 58%;
  transform: perspective(450px) rotateX(66deg);
  transform-origin: center bottom;
  background:
    repeating-linear-gradient(90deg, rgba(34, 135, 246, .22) 0 1px, transparent 1px 54px),
    repeating-linear-gradient(0deg, rgba(34, 135, 246, .20) 0 1px, transparent 1px 34px);
  filter: drop-shadow(0 0 8px rgba(44, 148, 255, .34));
}

.feature-scene__beam {
  position: absolute;
  z-index: 2;
  left: 50%;
  bottom: 0;
  width: 2px;
  height: 58%;
  transform: translateX(-50%);
  background: linear-gradient(180deg, transparent, rgba(101, 201, 255, .78), rgba(69, 136, 255, .08));
  box-shadow: 0 0 14px rgba(62, 164, 255, .72), 0 0 36px rgba(62, 164, 255, .36);
  opacity: .62;
}

.feature-bubble {
  position: absolute;
  z-index: 5;
  display: grid;
  place-items: center;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  cursor: default;
  user-select: none;
  border: 1.5px solid rgba(223, 242, 255, .86);
  background:
    radial-gradient(circle at 30% 23%, #ffffff 0 2%, var(--bubble-light) 8%, var(--bubble-color) 38%, var(--bubble-dark) 70%, rgba(2, 10, 26, .72) 100%);
  box-shadow:
    inset -14px -20px 26px rgba(0, 0, 16, .34),
    inset 9px 10px 18px rgba(255, 255, 255, .17),
    0 14px 22px rgba(0, 0, 0, .32),
    0 0 18px var(--bubble-shadow),
    0 0 34px var(--bubble-shadow);
  animation: bubbleFloat var(--duration) ease-in-out var(--delay) infinite;
  transition: filter .25s ease, z-index .25s ease;
  will-change: transform;
}

.feature-bubble::before,
.feature-bubble::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.feature-bubble::before {
  inset: 7%;
  border: 1px solid rgba(255, 255, 255, .18);
  box-shadow: inset 0 0 18px rgba(255, 255, 255, .08);
}

.feature-bubble::after {
  width: 132%;
  height: 30%;
  left: -16%;
  bottom: -34%;
  background: radial-gradient(ellipse, var(--bubble-shadow), transparent 68%);
  filter: blur(8px);
  transform: rotateX(64deg);
  opacity: .45;
}

.feature-bubble__shine {
  position: absolute;
  top: 12%;
  left: 18%;
  width: 34%;
  height: 18%;
  border-radius: 50%;
  transform: rotate(-28deg);
  background: linear-gradient(180deg, rgba(255,255,255,.86), rgba(255,255,255,0));
  filter: blur(.6px);
  opacity: .8;
}

.feature-bubble__text {
  position: relative;
  z-index: 2;
  max-width: 80%;
  color: #ffffff;
  font-size: clamp(12px, 1vw, 17px);
  line-height: 1.25;
  text-align: center;
  font-weight: 800;
  letter-spacing: .5px;
  text-shadow: 0 2px 3px rgba(0, 0, 0, .7), 0 0 8px rgba(255, 255, 255, .32);
}

.feature-bubble:hover {
  z-index: 9;
  filter: brightness(1.18) saturate(1.12);
  animation-play-state: paused;
}

@keyframes bubbleFloat {
  0%, 100% {
    transform: translate(-50%, -50%) translate3d(0, 0, 0) rotate(-1deg) scale(1);
  }
  33% {
    transform: translate(-50%, -50%) translate3d(var(--float-x), var(--float-y), 28px) rotate(1.5deg) scale(1.035);
  }
  66% {
    transform: translate(-50%, -50%) translate3d(0, var(--float-y), 42px) rotate(-1.2deg) scale(.985);
  }
}

@media (prefers-reduced-motion: reduce) {
  .feature-bubble,
  .chart-stage__halo { animation: none !important; }
}

@media (max-width: 900px) {
  .chart-canvas--main { height: 430px; }
  .chart-canvas--sub { height: 350px; }
  .chart-canvas--time { height: 360px; }
  .feature-scene { height: 520px; }
  .feature-bubble { transform: translate(-50%, -50%) scale(.82); }
}

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
