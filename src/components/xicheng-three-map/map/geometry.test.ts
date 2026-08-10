/// <reference types="node" />
import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { validateStreetCollection } from './geojson'
import { featureToShape, findInteriorAnchor } from './geometry'
import { createLocalProjection } from './projection'

const streetCollection = validateStreetCollection(JSON.parse(
  readFileSync(new URL('../../../../public/maps/xicheng_15_streets_clean.geojson', import.meta.url), 'utf8')
))

function pointInRing(point: THREE.Vector2, ring: THREE.Vector2[]): boolean {
  let inside = false
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const currentPoint = ring[index]!
    const previousPoint = ring[previous]!
    const crosses = (currentPoint.y > point.y) !== (previousPoint.y > point.y)
      && point.x < ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y))
        / (previousPoint.y - currentPoint.y) + currentPoint.x
    if (crosses) inside = !inside
  }
  return inside
}

describe('street geometry', () => {
  it('为15个街道生成有面积的Shape', () => {
    const projection = createLocalProjection(streetCollection, 160)

    for (const feature of streetCollection.features) {
      const shape = featureToShape(feature, projection)
      expect(Math.abs(THREE.ShapeUtils.area(shape.getPoints()))).toBeGreaterThan(0.01)
    }
  })

  it('把每个标签锚点放在街道外环内部', () => {
    const projection = createLocalProjection(streetCollection, 160)

    for (const feature of streetCollection.features) {
      const anchor = findInteriorAnchor(feature, projection)
      const outerRing = feature.geometry.coordinates[0]
      if (!outerRing) throw new Error(`${feature.properties.name}缺少外环`)
      const ring = outerRing.map(projection.project)
      expect(pointInRing(anchor, ring), feature.properties.name).toBe(true)
    }
  })
})
