<template>
  <div class="echarts-heat-map-3d">
    <div
      class="echarts-heat-map-3d__scene"
      :style="{ perspective: `${props.perspectivePx}px` }"
    >
      <div
        class="echarts-heat-map-3d__rotate"
        :style="{
          transformOrigin: props.transformOrigin,
          transform: `translate(${props.offsetX}px, ${props.offsetY}px) rotateX(${props.tiltDeg}deg) rotateZ(${props.rotationDeg}deg) scale(${props.mapScaleX * props.mapScale}, ${props.mapScaleY * props.mapScale})`
        }"
      >
        <div ref="chartRef" class="echarts-heat-map-3d__canvas"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import xichengGeoJson from '@/assets/geodata/110102.json'

interface StreetStatItem {
  streetName?: string
  community?: string
  caseCount?: number
  annualCases?: number
}

const props = withDefaults(defineProps<{
  streets: StreetStatItem[]
  selectedStreetName?: string | null
  /** 水平偏移（px），正值向右，负值向左，用于对齐背景图 */
  offsetX?: number
  /** 垂直偏移（px），正值向下，负值向上，用于对齐背景图 */
  offsetY?: number
  /** 平面旋转角度（度），正值顺时针（rotateZ），用于对齐背景图的左右旋转方向 */
  rotationDeg?: number
  /** 俯仰倾斜角度（度），正值抬起产生俯视倾角（rotateX），用于对齐背景图的倾斜视角 */
  tiltDeg?: number
  /** 整体等比缩放（>1 放大 <1 缩小），会与 mapScaleX/Y 相乘 */
  mapScale?: number
  /** 水平方向独立拉伸系数（1=不拉伸 >1 横向拉宽 <1 横向收窄） */
  mapScaleX?: number
  /** 垂直方向独立拉伸系数（1=不拉伸 >1 纵向拉长 <1 纵向压扁） */
  mapScaleY?: number
  /** 透视距离（px），越大倾斜形变越弱，默认 1600 */
  perspectivePx?: number
  /** 变换锚点，默认中心 */
  transformOrigin?: string
}>(), { offsetX: 0, offsetY: 0, rotationDeg: 0, tiltDeg: 0, mapScale: 1, mapScaleX: 1, mapScaleY: 1, perspectivePx: 1600, transformOrigin: '50% 50%' })

const emit = defineEmits<{
  (e: 'select', streetName: string): void
  (e: 'clear'): void
  (e: 'error', message: string): void
}>()

const chartRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
const MAP_NAME = '西城街道'
const zoomValue = 0.5

// 街道数据 -> 热力数据 { name, value }
const buildHeatData = () =>
  props.streets.map((item) => ({
    name: item.streetName || item.community || '',
    value: Number(item.caseCount ?? item.annualCases ?? 0)
  }))

const buildOption = () => {
  const heatData = buildHeatData()
  const values = heatData.map(d => d.value).filter(v => !isNaN(v))
  const minVal = values.length ? Math.min(...values) : 0
  const maxVal = values.length ? Math.max(...values) : 1

  return {
    backgroundColor: 'transparent',
    title: { show: false },
    visualMap: {
      show: false,
      min: minVal,
      max: maxVal,
      calculable: false,
      inRange: {
        color: [
          'rgba(122, 154, 181, 0.45)',
          'rgba(74, 123, 168, 0.50)',
          'rgba(46, 90, 150, 0.55)',
          'rgba(30, 63, 128, 0.60)',
          'rgba(20, 53, 110, 0.65)',
          'rgba(13, 90, 140, 0.68)',
          'rgba(15, 123, 168, 0.70)',
          'rgba(23, 162, 196, 0.72)',
          'rgba(34, 198, 220, 0.74)',
          'rgba(53, 224, 236, 0.76)'
        ]
      },
      outOfRange: {
        color: 'rgba(64, 156, 255, 0.18)'
      }
    },
  geo: [
    {
      layoutCenter: ['50%', '50%'],
      layoutSize: '180%',
      show: true,
      map: MAP_NAME,
      roam: false,
      zoom: zoomValue,
      aspectScale: 1.2,
      selectedMode: 'single',
      label: {
        show: true,
        color: '#fff',
        normal: {
          show: true,
          textStyle: { color: '#fff', fontWeight: 600, fontSize: 18 }
        },
        emphasis: {
          show: true,
          textStyle: { color: '#CC7A19', fontWeight: 700, fontSize: 22 }
        }
      },
      itemStyle: {
        normal: {
          areaColor: 'transparent',
          borderColor: 'rgba(120, 240, 255, 0.98)',
          borderWidth: 2,
          shadowBlur: 10,
          shadowColor: 'rgba(89, 226, 255, 0.0)'
        },
        emphasis: {
          areaColor: 'rgba(255, 179, 71, 0.22)',
          borderColor: 'rgba(255, 179, 71, 0.75)',
          borderWidth: 2
        },
        select: {
          areaColor: 'rgba(255, 179, 71, 0.30)',
          borderColor: 'rgba(255, 179, 71, 0.85)',
          borderWidth: 2.5
        }
      }
    }
  ],
  series: [
    {
      type: 'map',
      map: MAP_NAME,
      geoIndex: 0,
      aspectScale: 1.2,
      zoom: zoomValue,
      layoutCenter: ['50%', '50%'],
      layoutSize: '194%',
      roam: false,
      label: { show: false },
      itemStyle: {
        borderWidth: 0
      },
      emphasis: {
        label: { show: false },
        itemStyle: { opacity: 0.7 }
      },
      data: heatData
    }
  ]
}
}

const render = async () => {
  await nextTick()
  if (!chartRef.value) return
  if (!chart) {
    echarts.registerMap(MAP_NAME, xichengGeoJson as any)
    chart = echarts.init(chartRef.value)
    chart.on('click', (params: any) => {
      if (params?.componentType === 'geo' || params?.componentType === 'series') {
        const name = params.name as string | undefined
        if (name) {
          emit('select', name)
        } else {
          emit('clear')
        }
      }
    })
    chart.getZr().on('click', (event: any) => {
      if (!event?.target) {
        emit('clear')
      }
    })
  }
  chart.setOption(buildOption(), true)
  chart.resize()
}

const selectByName = (streetName: string) => {
  if (!chart) return
  chart.dispatchAction({ type: 'mapSelect', name: streetName })
  chart.dispatchAction({ type: 'highlight', name: streetName })
}

watch(() => props.streets, render, { deep: true })
watch(
  () => [props.tiltDeg, props.rotationDeg, props.mapScale, props.perspectivePx, props.transformOrigin],
  () => chart?.resize(),
  { flush: 'post' }
)
watch(
  () => props.selectedStreetName,
  (name) => {
    if (name) selectByName(name)
    else chart?.dispatchAction({ type: 'mapUnselect', name: '' })
  }
)

const onResize = () => chart?.resize()
let resizeObserver: ResizeObserver | null = null

onMounted(async () => {
  await render()
  window.addEventListener('resize', onResize)
  if (chartRef.value) {
    resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(chartRef.value)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  resizeObserver?.disconnect()
  chart?.dispose()
  chart = null
})

defineExpose({
  zoomIn: () => {
    if (!chart) return
    const opt = chart.getOption() as any
    chart.setOption({ geo: [{ zoom: (opt?.geo?.[0]?.zoom ?? zoomValue) + 0.2 }] })
  },
  zoomOut: () => {
    if (!chart) return
    const opt = chart.getOption() as any
    chart.setOption({ geo: [{ zoom: Math.max(0.2, (opt?.geo?.[0]?.zoom ?? zoomValue) - 0.2) }] })
  },
  reset: () => {
    if (!chart) return
    chart.dispatchAction({ type: 'geoUnselect' })
    chart.setOption({ geo: [{ zoom: zoomValue, center: undefined }] })
    emit('clear')
  },
  focusStreet: (streetName: string) => {
    selectByName(streetName)
  }
})
</script>

<style scoped>
.echarts-heat-map-3d {
  position: relative;
  width: 100%;
  height: 100%;
  background: transparent;
  overflow: hidden;
}
.echarts-heat-map-3d__scene {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective-origin: center center;
}
.echarts-heat-map-3d__rotate {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  will-change: transform;
}
.echarts-heat-map-3d__canvas {
  width: 100%;
  height: 100%;
  min-height: 360px;
}
</style>

