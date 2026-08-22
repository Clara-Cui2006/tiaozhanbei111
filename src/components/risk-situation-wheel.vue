<template>
  <div class="risk-situation-wheel" role="img" aria-label="重点专题与刑法分则嵌套环形图">
    <div ref="chartRef" class="risk-situation-wheel__chart"></div>
    <div
      class="risk-situation-wheel__inner-rotate"
      :style="{ transform: `rotate(${innerDeg}deg)` }"
      ref="innerChartWrapRef"
    >
      <div ref="innerChartRef" class="risk-situation-wheel__inner-chart"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { chartTooltip } from '../utils/chart-visual'

export interface WheelDatum {
  name: string
  value: number
}

const props = withDefaults(defineProps<{
  outerData: WheelDatum[]
  innerData: WheelDatum[]
  compact?: boolean
  /** 内环整体旋转速度（度/帧），0 关闭 */
  innerRotateSpeed?: number
}>(), { compact: false, innerRotateSpeed: 0.02 })

const emit = defineEmits<{ select: [name: string] }>()
const chartRef = ref<HTMLDivElement | null>(null)
const innerChartRef = ref<HTMLDivElement | null>(null)
const innerChartWrapRef = ref<HTMLDivElement | null>(null)
const selectedName = ref('')
let outerChart: echarts.ECharts | null = null
let innerChart: echarts.ECharts | null = null
let resizeObserver: ResizeObserver | null = null
let rotateTimer: number | null = null
const innerDeg = ref(0)

const isLight = () => document.body.classList.contains('theme-light')
const labelWrap = (value: string, size: number) => Array.from(value).reduce<string[]>((out, char, index) => {
  if (index % size === 0) out.push('')
  out[out.length - 1] += char
  return out
}, []).join('\n')

const outerPalette = ['#5DADE2', '#5DADE2', '#5DADE2', '#5DADE2', '#5DADE2', '#5DADE2', '#5DADE2', '#5DADE2']
const innerPalette = ['#3971DE', '#3971DE', '#3971DE', '#3971DE', '#3971DE', '#3971DE', '#3971DE', '#3971DE']
const colorFor = (palette: string[], index: number) => palette[index % palette.length]!

const startInnerRotation = () => {
  stopInnerRotation()
  if (props.innerRotateSpeed <= 0) return
  const step = () => {
    innerDeg.value = (innerDeg.value + props.innerRotateSpeed) % 360
    rotateTimer = window.requestAnimationFrame(step)
  }
  rotateTimer = window.requestAnimationFrame(step)
}
const stopInnerRotation = () => {
  if (rotateTimer !== null) {
    cancelAnimationFrame(rotateTimer)
    rotateTimer = null
  }
}

const renderOuter = async () => {
  await nextTick()
  if (!chartRef.value) return
  if (!outerChart) {
    outerChart = echarts.init(chartRef.value)
    outerChart.getZr().on('click', (event: { target?: unknown }) => {
      if (!event.target && selectedName.value) {
        selectedName.value = ''
        renderOuter()
      }
    })
    outerChart.on('click', (params: { name: string }) => {
      selectedName.value = selectedName.value === params.name ? '' : params.name
      emit('select', params.name)
      renderOuter()
    })
  }

  const light = isLight()
  const outer = props.outerData.length > 0 ? props.outerData : [{ name: '暂无数据', value: 1 }]
  const outerMax = Math.max(...outer.map((d) => d.value), 1)
  const center: [string, string] = props.compact ? ['50%', '50%'] : ['50%', '50%']

  outerChart.setOption({
    backgroundColor: 'transparent',
    animationDuration: 900,
    animationEasing: 'cubicOut',
    tooltip: {
      trigger: 'item',
      formatter: (params: { name: string; value: number; percent: number }) => {
        return `<strong>${params.name}</strong><br/>${params.value}（${params.percent}%）`
      },
      ...chartTooltip(light, '#65dfff')
    },
    series: [
      {
        id: 'outer',
        name: '外环',
        type: 'pie',
        radius: ['43.5%', '70.5%'],
        center,
        startAngle: 90,
        padAngle: 2,
        itemStyle: { borderRadius: 3, borderWidth: 2, borderColor: 'transparent' },
        label: {
          position: 'inside',
          color: '#111',
          fontSize: props.compact ? 12 : 15,
          fontWeight: 600,
          lineHeight: props.compact ? 15 : 20,
          letterSpacing: 1.5,
          formatter: (p: { name: string }) => labelWrap(p.name, 5)
        },
        labelLine: { show: false },
        emphasis: { scale: true, scaleSize: 7 },
        data: outer.map((d, i) => ({
          name: d.name,
          value: d.value,
          itemStyle: {
            color: colorFor(outerPalette, i),
            opacity: !selectedName.value || selectedName.value === d.name ? 1 : 0.32
          }
        }))
      }
    ]
  }, true)
  outerChart.resize()
}

const renderInner = async () => {
  await nextTick()
  if (!innerChartRef.value) return
  if (!innerChart) {
    innerChart = echarts.init(innerChartRef.value)
    innerChart.on('click', (params: { name: string }) => {
      selectedName.value = selectedName.value === params.name ? '' : params.name
      emit('select', params.name)
      renderInner()
    })
  }

  const light = isLight()
  const inner = props.innerData.length > 0 ? props.innerData : [{ name: '暂无数据', value: 1 }]
  const innerMax = Math.max(...inner.map((d) => d.value), 1)

  innerChart.setOption({
    backgroundColor: 'transparent',
    animationDuration: 900,
    animationEasing: 'cubicOut',
    tooltip: {
      trigger: 'item',
      formatter: (params: { name: string; value: number; percent: number }) => {
        return `<strong>${params.name}</strong><br/>${params.value}（${params.percent}%）`
      },
      ...chartTooltip(light, '#65dfff')
    },
    series: [
      {
        id: 'inner',
        name: '内环',
        type: 'pie',
        radius: ['35%', '92%'],
        center: ['50%', '50%'],
        startAngle: 90,
        padAngle: 3,
        itemStyle: { borderRadius: 3, borderWidth: 2, borderColor: 'transparent' },
        label: {
          position: 'inside',
          color: '#fff',
          fontSize: props.compact ? 13 : 16,
          fontWeight: 700,
          lineHeight: props.compact ? 17 : 22,
          letterSpacing: 2,
          formatter: (p: { name: string }) => labelWrap(p.name, 4)
        },
        labelLine: { show: false },
        emphasis: { scale: true, scaleSize: 6 },
        data: inner.map((d, i) => ({
          name: d.name,
          value: d.value,
          itemStyle: {
            color: colorFor(innerPalette, i),
            opacity: !selectedName.value || selectedName.value === d.name ? 1 : 0.32
          }
        }))
      }
    ]
  }, true)
  innerChart.resize()
}

const render = () => {
  renderOuter()
  renderInner()
}

watch(() => [props.outerData, props.compact], renderOuter, { deep: true })
watch(() => [props.innerData, props.compact], renderInner, { deep: true })
watch(() => props.innerRotateSpeed, () => { startInnerRotation() })
onMounted(() => {
  render()
  startInnerRotation()
  if (chartRef.value) {
    resizeObserver = new ResizeObserver(() => {
      outerChart?.resize()
      innerChart?.resize()
    })
    resizeObserver.observe(chartRef.value)
  }
})
onUnmounted(() => {
  stopInnerRotation()
  resizeObserver?.disconnect()
  outerChart?.dispose()
  innerChart?.dispose()
  outerChart = null
  innerChart = null
})
</script>

<style scoped>
.risk-situation-wheel {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
}
.risk-situation-wheel__chart {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
/* 内环旋转容器：中心对齐，尺寸恰好落在内环半径范围内 */
.risk-situation-wheel__inner-rotate {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  transform-origin: center center;
  will-change: transform;
}
/* 内环画布：裁剪到环中心的小方块，让 CSS rotate 带着它整体转 */
.risk-situation-wheel__inner-chart {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 40.5%;
  height: 40.5%;
  transform: translate(-50%, -50%);
  pointer-events: auto;
}
</style>
