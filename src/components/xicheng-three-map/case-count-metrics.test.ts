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

  it('maps the current minimum to blue gray and maximum to cyan', () => {
    expect(getRelativeCaseColor(10, 10, 30)).toBe('#7A9AB5')
    expect(getRelativeCaseColor(30, 10, 30)).toBe('#35E0EC')
  })

  it('interpolates intermediate values across the shared color ramp', () => {
    expect(getRelativeCaseColor(15, 10, 30)).toBe('#2E5A96')
    expect(getRelativeCaseColor(20, 10, 30)).toBe('#1E3F80')
  })

  it('uses blue when every street has the same case count', () => {
    expect(getRelativeCaseColor(12, 12, 12)).toBe(QUANTITY_COLORS[0])
  })

  it('builds legend stops from the current minimum and maximum', () => {
    expect(buildRelativeLegendStops(10, 30).map(({ value, color }) => [value, color])).toEqual([
      [10, '#7A9AB5'], [15, '#2E5A96'], [20, '#1E3F80'], [25, '#17A2C4'], [30, '#35E0EC']
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

    expect(metrics['110102011']).toMatchObject({ name: '金融街街道', caseCount: 23, level: 5, color: '#35E0EC' })
    expect(metrics['110102010']).toMatchObject({ name: '德胜街道', caseCount: 7, level: 1, color: '#7A9AB5' })
    expect(metrics['金融街街道']).toBe(metrics['110102011'])
  })

  it('fills known streets without data as zero-case metrics', () => {
    const metrics = buildStreetCaseMetrics(
      [{ streetCode: '110102011', streetName: '金融街街道', caseCount: 23 }],
      [
        { adcode: '110102001', name: '西长安街街道' },
        { adcode: '110102011', name: '金融街街道' }
      ]
    )

    expect(metrics['110102001']).toMatchObject({ name: '西长安街街道', caseCount: 0, level: 1, color: '#7A9AB5' })
    expect(metrics['西长安街街道']).toBe(metrics['110102001'])
    expect(metrics['110102011']).toMatchObject({ caseCount: 23, level: 5, color: '#35E0EC' })
  })
})
