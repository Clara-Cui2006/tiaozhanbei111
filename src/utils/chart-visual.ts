import * as echarts from 'echarts'

export type ChartDatum = {
  name: string
  value: number
  baseColor?: string
  itemStyle?: Record<string, unknown>
}

export const CHART_PALETTES = {
  rainbow: ['#f0445e', '#ff7a1a', '#ffc62e', '#69d35d', '#20d0a5', '#20bfe8'],
  governance: ['#ff5f55', '#ff9f43', '#ffd166', '#56d364', '#25c7a2'],
  political: ['#ef4058', '#ff7b35', '#f7c948', '#21c9a6', '#27a5ed'],
  caseBlue: ['#0d5bd7', '#117be6', '#169fe8', '#38bee9', '#75d8ee'],
  violetCyan: ['#7758e8', '#9c62f0', '#b65ede', '#3cc8ec', '#28a9e0'],
  amberTeal: ['#e8a43e', '#f6c85f', '#69cf8e', '#28b8a5', '#2f8fcb']
} as const

const normalizeHex = (color: string) => {
  const value = color.replace('#', '')
  return value.length === 3 ? value.split('').map((char) => char + char).join('') : value
}

const colorChannels = (color: string) => {
  const value = normalizeHex(color)
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16))
}

export const shadeHex = (color: string, amount: number) => {
  const channels = colorChannels(color).map((channel) => Math.max(0, Math.min(255, channel + amount)))
  return `#${channels.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`
}

export const rgbaHex = (color: string, alpha: number) => {
  const [red, green, blue] = colorChannels(color)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

export const verticalGradient = (color: string) => new echarts.graphic.LinearGradient(0, 0, 0, 1, [
  { offset: 0, color: shadeHex(color, 58) },
  { offset: 0.28, color },
  { offset: 1, color: shadeHex(color, -58) }
])

export const areaGradient = (color: string, alpha = 0.36) => new echarts.graphic.LinearGradient(0, 0, 0, 1, [
  { offset: 0, color: rgbaHex(shadeHex(color, 34), alpha) },
  { offset: 0.72, color: rgbaHex(color, alpha * 0.3) },
  { offset: 1, color: rgbaHex(color, 0.01) }
])

export const metallicBorder = (index: number) => index % 2 === 0 ? '#f3d28a' : '#d8edf8'

const offsetPercent = (value: string, delta: number) => `${Number.parseFloat(value) + delta}%`

export const raisedBarStyle = (color: string, index = 0) => ({
  color: verticalGradient(color),
  borderColor: metallicBorder(index),
  borderWidth: 1.2,
  borderRadius: [8, 8, 2, 2],
  shadowBlur: 18,
  shadowOffsetY: 10,
  shadowColor: rgbaHex(color, 0.5)
})

export const raisedPieStyle = (color: string, index = 0) => ({
  color: new echarts.graphic.RadialGradient(0.32, 0.24, 0.88, [
    { offset: 0, color: shadeHex(color, 64) },
    { offset: 0.34, color },
    { offset: 1, color: shadeHex(color, -62) }
  ]),
  borderColor: metallicBorder(index),
  borderWidth: 1.4,
  borderRadius: 8,
  shadowBlur: 20,
  shadowOffsetY: 10,
  shadowColor: rgbaHex(color, 0.52)
})

export const buildPieDepthLayers = (
  name: string,
  data: ChartDatum[],
  radius: [string, string],
  center: [string, string],
  depth = 6,
  startAngle = 90
) => Array.from({ length: depth }, (_, layer) => ({
  name,
  type: 'pie' as const,
  silent: true,
  animation: false,
  radius,
  center: [center[0], offsetPercent(center[1], (depth - layer) * 0.55)],
  startAngle,
  z: layer + 1,
  label: { show: false },
  labelLine: { show: false },
  tooltip: { show: false },
  itemStyle: { borderWidth: 0 },
  data: data.map((item, index) => {
    const paletteColor = CHART_PALETTES.caseBlue[index % CHART_PALETTES.caseBlue.length]!
    const baseColor = item.baseColor ?? paletteColor
    return {
      ...item,
      itemStyle: {
        color: shadeHex(baseColor, -46 + layer * 2),
        opacity: 0.92
      }
    }
  })
}))

export const chartTooltip = (light: boolean, accent = '#e8c36a') => ({
  backgroundColor: light ? 'rgba(244, 249, 255, 0.97)' : 'rgba(5, 18, 39, 0.94)',
  borderColor: accent,
  borderWidth: 1,
  textStyle: { color: light ? '#173c5e' : '#edf8ff', fontSize: 13 },
  extraCssText: 'box-shadow:0 12px 30px rgba(0,0,0,.3);backdrop-filter:blur(8px);'
})

export const chartAxis = (light: boolean) => ({
  text: light ? '#315f83' : '#b9dff2',
  line: light ? 'rgba(60, 112, 154, .42)' : 'rgba(142, 207, 240, .32)',
  split: light ? 'rgba(60, 112, 154, .14)' : 'rgba(104, 180, 220, .14)'
})
