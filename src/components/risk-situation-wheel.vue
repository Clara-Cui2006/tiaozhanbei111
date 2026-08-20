<template>
  <div class="risk-situation-wheel" role="img" aria-label="重点专题与刑法分则双圈联动态势盘">
    <div ref="chartRef" class="risk-situation-wheel__chart"></div>
    <template v-if="compact">
      <div class="wheel-topic-row wheel-topic-row--top"><button v-for="item in categories.slice(0, 3)" :key="item.name" :class="{ active: selectedTopic === item.name }" @click="selectTopic(item.name)">{{ item.name }}</button></div>
      <div class="wheel-topic-row wheel-topic-row--bottom"><button v-for="item in categories.slice(3, 7)" :key="item.name" :class="{ active: selectedTopic === item.name }" @click="selectTopic(item.name)">{{ item.name }}</button></div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { CRIMINAL_LAW_CHAPTERS, resolveVisibleChapters, resolveVisibleTopics } from '../features/risk-analysis/classification'
import type { PriorityTag } from '../features/priority-alerts'
import type { CaseCategory } from '../types/platform'
import { CHART_PALETTES, buildPieDepthLayers, chartTooltip, raisedPieStyle, shadeHex, type ChartDatum } from '../utils/chart-visual'

const props = withDefaults(defineProps<{ categories: CaseCategory[]; compact?: boolean }>(), { compact: false })
const emit = defineEmits<{ select: [name: string] }>()
const chartRef = ref<HTMLDivElement | null>(null)
const selectedTopic = ref('')
const selectedChapter = ref('')
let chart: echarts.ECharts | null = null
let resizeObserver: ResizeObserver | null = null

const isLight = () => document.body.classList.contains('theme-light')
const labelWrap = (value: string, size: number) => Array.from(value).reduce<string[]>((out, char, index) => {
  if (index % size === 0) out.push('')
  out[out.length - 1] += char
  return out
}, []).join('\n')

const selectTopic = (name: string) => {
  selectedTopic.value = selectedTopic.value === name ? '' : name
  selectedChapter.value = ''
  emit('select', name)
  render()
}

const render = async () => {
  await nextTick()
  if (!chartRef.value) return
  if (!chart) {
    chart = echarts.init(chartRef.value)
    chart.getZr().on('click', (event: { target?: unknown }) => {
      if (!event.target && (selectedTopic.value || selectedChapter.value)) {
        selectedTopic.value = ''
        selectedChapter.value = ''
        render()
      }
    })
    chart.on('click', (params: { name: string }) => {
      const topic = props.categories.find((item) => item.name === params.name)
      if (topic) {
        selectTopic(topic.name)
        return
      } else if (CRIMINAL_LAW_CHAPTERS.includes(params.name as (typeof CRIMINAL_LAW_CHAPTERS)[number])) {
        selectedChapter.value = selectedChapter.value === params.name ? '' : params.name
        selectedTopic.value = ''
      }
      emit('select', params.name)
      render()
    })
  }

  const light = isLight()
  const palette = light ? CHART_PALETTES.governance.map((color) => shadeHex(color, -22)) : CHART_PALETTES.governance
  const visibleTopics = resolveVisibleTopics(selectedChapter.value)
  const visibleChapters = resolveVisibleChapters(selectedTopic.value)
  const topicData: ChartDatum[] = props.categories
    .filter((item) => visibleTopics.includes(item.name as PriorityTag))
    .map((item, index) => ({ ...item, baseColor: palette[index % palette.length], itemStyle: raisedPieStyle(palette[index % palette.length]!, index) }))
  const chapterData: ChartDatum[] = visibleChapters.map((name, index) => ({
    name,
    value: Math.max(1, ...props.categories.flatMap((topic) => topic.children.filter((item) => item.name === name).map((item) => item.value))),
    baseColor: palette[(index + 2) % palette.length],
    itemStyle: raisedPieStyle(palette[(index + 2) % palette.length]!, index + 1)
  }))
  const center: [string, string] = props.compact ? ['50%', '49%'] : ['54%', '50%']
  const innerRadius: [string, string] = props.compact ? ['11%', '31%'] : ['14%', '36%']
  const outerRadius: [string, string] = props.compact ? ['39%', '55%'] : ['49%', '69%']

  chart.setOption({
    backgroundColor: 'transparent',
    animationDuration: 900,
    animationEasing: 'cubicOut',
    tooltip: { trigger: 'item', formatter: '{b}<br/>{c}（{d}%）', ...chartTooltip(light, '#65dfff') },
    legend: props.compact ? { show: false } : {
      orient: 'vertical', left: 8, top: 'middle', itemWidth: 10, itemHeight: 10, itemGap: 9,
      textStyle: { color: light ? '#315f83' : '#bfe8f8', fontSize: 11 }, data: props.categories.map((item) => item.name)
    },
    series: [
      ...buildPieDepthLayers('重点专题', topicData, innerRadius, center, 8, 96),
      ...buildPieDepthLayers('刑法分则一级章名', chapterData, outerRadius, center, 8, 96),
      {
        name: '重点专题', type: 'pie', radius: innerRadius, center, startAngle: 96, z: 30,
        selectedMode: 'single', selectedOffset: 0, padAngle: 2,
        label: { show: !props.compact, position: 'inside', color: '#fff', fontSize: 11, lineHeight: 14, fontWeight: 700, formatter: (p: { name: string }) => labelWrap(p.name, 4), textBorderWidth: 2, textBorderColor: 'rgba(0,15,36,.72)' },
        labelLine: { show: false }, emphasis: { scale: true, scaleSize: 6 }, data: topicData
      },
      {
        name: '刑法分则一级章名', type: 'pie', radius: outerRadius, center, startAngle: 96, z: 24,
        selectedMode: 'single', selectedOffset: 0, padAngle: 2.5,
        label: { show: true, color: light ? '#315f83' : '#d9f5ff', fontSize: props.compact ? 8 : 11, lineHeight: props.compact ? 10 : 14, formatter: (p: { name: string; percent: number }) => props.compact ? labelWrap(p.name, 4) : `${labelWrap(p.name, 5)}\n${p.percent}%`, textBorderWidth: 2, textBorderColor: light ? '#fff' : '#06152c' },
        labelLine: { show: true, length: props.compact ? 6 : 9, length2: props.compact ? 4 : 7, smooth: 0.2 },
        emphasis: { scale: true, scaleSize: 7 }, data: chapterData
      }
    ]
  }, true)
  chart.resize()
}

watch(() => [props.categories, props.compact], render, { deep: true })
onMounted(() => {
  render()
  if (chartRef.value) {
    resizeObserver = new ResizeObserver(() => chart?.resize())
    resizeObserver.observe(chartRef.value)
  }
})
onUnmounted(() => { resizeObserver?.disconnect(); chart?.dispose(); chart = null })
</script>

<style scoped>
.risk-situation-wheel { position: relative; width: 100%; height: 100%; min-height: 0; }
.risk-situation-wheel__chart { width: 100%; height: 100%; }
.wheel-topic-row { position: absolute; z-index: 2; right: 7px; left: 7px; display: flex; justify-content: center; gap: 4px; }
.wheel-topic-row--top { top: 5px; }
.wheel-topic-row--bottom { bottom: 5px; }
.wheel-topic-row button { min-width: 0; padding: 3px 5px; overflow: hidden; border: 1px solid rgba(77, 207, 255, .32); border-radius: 3px; color: #aeeaff; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; background: rgba(5, 39, 68, .86); cursor: pointer; }
.wheel-topic-row button.active { border-color: #5de7ff; color: #fff; box-shadow: 0 0 10px rgba(63, 220, 255, .42); background: rgba(17, 112, 158, .86); }
</style>
