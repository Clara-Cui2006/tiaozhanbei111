import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { QUANTITY_COLORS } from '../case-count-metrics'
import { createSideMaterial, createTopMaterial, sampleSideGradient } from './materials'

describe('map materials', () => {
  it('creates top and side materials from the shared metric color', () => {
    const metricColor = QUANTITY_COLORS[3]!
    const top = createTopMaterial(metricColor)
    const side = createSideMaterial(metricColor, 12)

    expect(top.color.getHexString()).toBe(metricColor.slice(1).toLowerCase())
    expect(top.emissive.getHex()).not.toBe(0x000000)
    expect((side.uniforms.uColor?.value as THREE.Color).getHexString())
      .toBe(metricColor.slice(1).toLowerCase())
    expect(side.uniforms.uDepth?.value).toBe(12)

    top.dispose()
    side.dispose()
  })

  it('keeps the side gradient visible and brighter toward the top', () => {
    for (const metricColor of QUANTITY_COLORS) {
      const base = new THREE.Color(metricColor)
      const bottom = sampleSideGradient(metricColor, 0, 1)
      const top = sampleSideGradient(metricColor, 1, 1)

      expect(bottom.color.r).toBeGreaterThanOrEqual(base.r * 0.3)
      expect(bottom.color.g).toBeGreaterThanOrEqual(base.g * 0.3)
      expect(bottom.color.b).toBeGreaterThanOrEqual(base.b * 0.3)
      expect(bottom.color.getHSL({ h: 0, s: 0, l: 0 }).l)
        .toBeLessThan(top.color.getHSL({ h: 0, s: 0, l: 0 }).l)
      expect(bottom.opacity).toBeGreaterThanOrEqual(0.72)
    }
  })
})
