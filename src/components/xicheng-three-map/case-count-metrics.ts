import type { StreetMapStreetStat } from '../../api/platform'

export type CaseCountLevel = 1 | 2 | 3 | 4 | 5

export interface CaseCountRange {
  min: number
  max: number
  level: CaseCountLevel
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

export function buildCaseCountRanges(maxValue: number): CaseCountRange[] {
  const normalizedMax = Math.max(0, Math.floor(Number(maxValue) || 0))
  if (normalizedMax === 0) {
    return [{ min: 0, max: 0, level: 1, color: QUANTITY_COLORS[0] ?? '#dbeafe', label: '0 件' }]
  }

  const starts = [
    0,
    Math.ceil(normalizedMax * 0.2),
    Math.ceil(normalizedMax * 0.4),
    Math.ceil(normalizedMax * 0.6),
    Math.ceil(normalizedMax * 0.8)
  ]

  return starts
    .map((min, index) => {
      const nextStart = starts[index + 1] ?? normalizedMax
      const max = index === starts.length - 1 ? normalizedMax : Math.min(normalizedMax, nextStart - 1)
      return {
        min,
        max,
        level: (index + 1) as CaseCountLevel,
        color: QUANTITY_COLORS[index] ?? QUANTITY_COLORS[0] ?? '#dbeafe',
        label: min === max ? `${min} 件` : `${min}–${max} 件`
      }
    })
    .filter((item) => item.min <= item.max)
}

export function getCaseCountRange(value: number, maxValue: number): CaseCountRange {
  const normalizedValue = Math.max(0, Math.floor(Number(value) || 0))
  const ranges = buildCaseCountRanges(maxValue)
  return ranges.find((item) => normalizedValue >= item.min && normalizedValue <= item.max) ?? ranges[0]!
}

export function buildStreetCaseMetrics(streets: StreetMapStreetStat[]): Record<string, StreetCaseMetric> {
  const maxCaseCount = Math.max(0, ...streets.map((street) => street.caseCount))

  return streets.reduce<Record<string, StreetCaseMetric>>((metrics, street) => {
    const name = normalizeStreetName(street.streetName)
    const range = getCaseCountRange(street.caseCount, maxCaseCount)
    const metric: StreetCaseMetric = {
      adcode: street.streetCode,
      name,
      caseCount: street.caseCount,
      level: range.level,
      color: range.color
    }

    metrics[street.streetCode] = metric
    metrics[name] = metric
    return metrics
  }, {})
}
