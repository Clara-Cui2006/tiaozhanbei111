import { describe, expect, it } from 'vitest'
import {
  QUANTITY_COLORS,
  buildCaseCountRanges,
  buildStreetCaseMetrics,
  getCaseCountRange,
  normalizeStreetName
} from './case-count-metrics'

describe('case-count metrics', () => {
  it('builds the five case-count bands from the current maximum', () => {
    expect(buildCaseCountRanges(28).map(({ min, max }) => [min, max])).toEqual([
      [0, 5], [6, 11], [12, 16], [17, 22], [23, 28]
    ])
  })

  it('represents an empty case total with one zero band', () => {
    expect(buildCaseCountRanges(0)).toEqual([
      { min: 0, max: 0, level: 1, color: QUANTITY_COLORS[0], label: '0 件' }
    ])
  })

  it('assigns the upper boundary to the fifth band', () => {
    expect(getCaseCountRange(23, 28).level).toBe(5)
  })

  it('normalizes a short street name with the 街道 suffix', () => {
    expect(normalizeStreetName('金融街')).toBe('金融街街道')
  })

  it('indexes each street metric by administrative code and normalized name', () => {
    const metrics = buildStreetCaseMetrics([
      { streetCode: '110102011', streetName: '金融街街道', caseCount: 23 }
    ])

    expect(metrics['110102011']).toMatchObject({ name: '金融街街道', caseCount: 23, level: 5 })
    expect(metrics['金融街街道']).toBe(metrics['110102011'])
  })
})
