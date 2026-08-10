import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { LEVEL_COLORS, createSideMaterial, createTopMaterial, sampleSideGradient } from './materials'

describe('map materials', () => {
  it('creates top and side materials from the selected level color', () => {
    const top = createTopMaterial(4)
    const side = createSideMaterial(4, 12)

    expect(top.color.getHex()).toBe(LEVEL_COLORS[4])
    expect(top.emissive.getHex()).not.toBe(0x000000)
    expect((side.uniforms.uColor?.value as THREE.Color).getHex()).toBe(LEVEL_COLORS[4])
    expect(side.uniforms.uDepth?.value).toBe(12)

    top.dispose()
    side.dispose()
  })

  it('keeps the side gradient visible and brighter toward the top', () => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      const base = new THREE.Color(LEVEL_COLORS[level])
      const bottom = sampleSideGradient(level, 0, 1)
      const top = sampleSideGradient(level, 1, 1)

      expect(bottom.color.r).toBeGreaterThanOrEqual(base.r * 0.3)
      expect(bottom.color.g).toBeGreaterThanOrEqual(base.g * 0.3)
      expect(bottom.color.b).toBeGreaterThanOrEqual(base.b * 0.3)
      expect(bottom.color.getHSL({ h: 0, s: 0, l: 0 }).l)
        .toBeLessThan(top.color.getHSL({ h: 0, s: 0, l: 0 }).l)
      expect(bottom.opacity).toBeGreaterThanOrEqual(0.72)
    }
  })
})
