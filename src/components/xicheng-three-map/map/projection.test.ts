/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { validateStreetCollection } from './geojson'
import { createLocalProjection } from './projection'

const streetCollection = validateStreetCollection(JSON.parse(
  readFileSync(new URL('../../../../public/maps/xicheng_15_streets_clean.geojson', import.meta.url), 'utf8')
))

describe('createLocalProjection', () => {
  it('把数据中心投影到场景原点附近', () => {
    const projection = createLocalProjection(streetCollection, 160)
    const center = projection.project(projection.center)

    expect(Math.abs(center.x)).toBeLessThan(0.001)
    expect(Math.abs(center.y)).toBeLessThan(0.001)
  })

  it('把最长边统一缩放到目标尺寸', () => {
    const projection = createLocalProjection(streetCollection, 160)
    const projected = streetCollection.features.flatMap((feature) => {
      const outerRing = feature.geometry.coordinates[0]
      if (!outerRing) throw new Error(`${feature.properties.name}缺少外环`)
      return outerRing.map((position) => projection.project(position))
    })
    const width = Math.max(...projected.map((point) => point.x)) - Math.min(...projected.map((point) => point.x))
    const height = Math.max(...projected.map((point) => point.y)) - Math.min(...projected.map((point) => point.y))

    expect(Math.max(width, height)).toBeCloseTo(160, 5)
  })
})
