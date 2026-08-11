import { describe, expect, it } from 'vitest'
import {
  QUANTITY_COLORS,
  buildStreetCaseMetrics,
  buildRelativeLegendStops,
  getCaseCountExtent,
  getRelativeCaseColor,
  normalizeStreetName
} from './case-count-metrics'

describe('case-count metrics', () => {
  it('derives the extent from the current fifteen-street values', () => {
    expect(getCaseCountExtent([18, 7, 31, 12])).toEqual({ min: 7, max: 31 })
  })

  it('maps the current minimum to blue and maximum to red', () => {
    expect(getRelativeCaseColor(10, 10, 30)).toBe('#1689C4')
    expect(getRelativeCaseColor(30, 10, 30)).toBe('#E94B5B')
  })

  it('interpolates intermediate values across the shared color ramp', () => {
    expect(getRelativeCaseColor(15, 10, 30)).toBe('#16A8B7')
    expect(getRelativeCaseColor(20, 10, 30)).toBe('#D4B64D')
  })

  it('uses blue when every street has the same case count', () => {
    expect(getRelativeCaseColor(12, 12, 12)).toBe(QUANTITY_COLORS[0])
  })

  it('builds legend stops from the current minimum and maximum', () => {
    expect(buildRelativeLegendStops(10, 30).map(({ value, color }) => [value, color])).toEqual([
      [10, '#1689C4'], [15, '#16A8B7'], [20, '#D4B64D'], [25, '#EC8438'], [30, '#E94B5B']
    ])
  })

  it('normalizes a short street name with the 街道 suffix', () => {
    expect(normalizeStreetName('金融街')).toBe('金融街街道')
  })

  it('indexes each street metric by administrative code and normalized name', () => {
    const metrics = buildStreetCaseMetrics([
      { streetCode: '110102011', streetName: '金融街街道', caseCount: 23 },
      { streetCode: '110102010', streetName: '德胜街道', caseCount: 7 }
    ])

    expect(metrics['110102011']).toMatchObject({ name: '金融街街道', caseCount: 23, level: 5, color: '#E94B5B' })
    expect(metrics['110102010']).toMatchObject({ name: '德胜街道', caseCount: 7, level: 1, color: '#1689C4' })
    expect(metrics['金融街街道']).toBe(metrics['110102011'])
  })
})
