import type { StreetMapStreetStat } from '../../api/platform'

export type CaseCountLevel = 1 | 2 | 3 | 4 | 5

export interface RelativeLegendStop {
  value: number
  color: string
  label: string
}

export interface StreetCaseMetric {
  adcode: string
  name: string
  caseCount: number
  level: CaseCountLevel
  color: string
}

export interface StreetMetricIdentity {
  adcode: string
  name: string
}

export const QUANTITY_COLORS: readonly string[] = [
  '#1689C4',
  '#16A8B7',
  '#D4B64D',
  '#EC8438',
  '#E94B5B'
]

export function normalizeStreetName(name: string): string {
  const normalizedName = name.trim()
  if (!normalizedName || normalizedName.endsWith('街道')) return normalizedName
  return `${normalizedName}街道`
}

const normalizeCaseCount = (value: number) => Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0)

export function getCaseCountExtent(values: number[]): { min: number; max: number } {
  const normalizedValues = values.map(normalizeCaseCount)
  if (!normalizedValues.length) return { min: 0, max: 0 }
  return {
    min: Math.min(...normalizedValues),
    max: Math.max(...normalizedValues)
  }
}

export function getRelativeCaseRatio(value: number, minValue: number, maxValue: number): number {
  const min = normalizeCaseCount(minValue)
  const max = normalizeCaseCount(maxValue)
  if (max <= min) return 0
  return Math.max(0, Math.min(1, (normalizeCaseCount(value) - min) / (max - min)))
}

const parseHexColor = (color: string): [number, number, number] => [
  Number.parseInt(color.slice(1, 3), 16),
  Number.parseInt(color.slice(3, 5), 16),
  Number.parseInt(color.slice(5, 7), 16)
]

const toHexColor = (channels: number[]) => `#${channels
  .map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
  .join('')
  .toUpperCase()}`

export function getRelativeCaseColor(value: number, minValue: number, maxValue: number): string {
  const ratio = getRelativeCaseRatio(value, minValue, maxValue)
  const scaled = ratio * (QUANTITY_COLORS.length - 1)
  const lowerIndex = Math.floor(scaled)
  const upperIndex = Math.min(QUANTITY_COLORS.length - 1, Math.ceil(scaled))
  const lowerColor = parseHexColor(QUANTITY_COLORS[lowerIndex] ?? QUANTITY_COLORS[0]!)
  const upperColor = parseHexColor(QUANTITY_COLORS[upperIndex] ?? QUANTITY_COLORS.at(-1)!)
  const progress = scaled - lowerIndex
  return toHexColor(lowerColor.map((channel, index) =>
    channel + (upperColor[index]! - channel) * progress
  ))
}

export function buildRelativeLegendStops(minValue: number, maxValue: number): RelativeLegendStop[] {
  const min = normalizeCaseCount(minValue)
  const max = normalizeCaseCount(maxValue)
  return QUANTITY_COLORS.map((color, index) => {
    const ratio = index / Math.max(1, QUANTITY_COLORS.length - 1)
    const value = Math.round(min + (max - min) * ratio)
    return { value, color, label: `${value} 件` }
  })
}

const createMetric = (
  adcode: string,
  name: string,
  caseCount: number,
  min: number,
  max: number,
): StreetCaseMetric => {
  const normalizedName = normalizeStreetName(name)
  const normalizedCaseCount = normalizeCaseCount(caseCount)
  const ratio = getRelativeCaseRatio(normalizedCaseCount, min, max)

  return {
    adcode,
    name: normalizedName,
    caseCount: normalizedCaseCount,
    level: Math.min(5, Math.floor(ratio * 5) + 1) as CaseCountLevel,
    color: getRelativeCaseColor(normalizedCaseCount, min, max)
  }
}

const indexMetric = (metrics: Record<string, StreetCaseMetric>, metric: StreetCaseMetric) => {
  metrics[metric.adcode] = metric
  metrics[metric.name] = metric
}

export function buildStreetCaseMetrics(
  streets: StreetMapStreetStat[],
  knownStreets: StreetMetricIdentity[] = [],
): Record<string, StreetCaseMetric> {
  const knownStreetValues = knownStreets.map(({ adcode, name }) => {
    const matched = streets.find((street) => street.streetCode === adcode || normalizeStreetName(street.streetName) === normalizeStreetName(name))
    return matched ? normalizeCaseCount(matched.caseCount) : 0
  })
  const { min, max } = getCaseCountExtent(knownStreets.length ? knownStreetValues : streets.map((street) => street.caseCount))

  const metrics: Record<string, StreetCaseMetric> = {}

  for (const street of knownStreets) {
    const matched = streets.find((item) => item.streetCode === street.adcode || normalizeStreetName(item.streetName) === normalizeStreetName(street.name))
    indexMetric(metrics, createMetric(
      street.adcode,
      street.name,
      matched?.caseCount ?? 0,
      min,
      max,
    ))
  }

  for (const street of streets) {
    if (metrics[street.streetCode]) continue
    indexMetric(metrics, createMetric(
      street.streetCode,
      street.streetName,
      street.caseCount,
      min,
      max,
    ))
  }

  return metrics
}
