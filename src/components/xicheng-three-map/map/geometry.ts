import * as THREE from 'three'
import type { Position, StreetFeature } from '../types'
import type { LocalProjection } from './projection'

function samePoint(a: THREE.Vector2, b: THREE.Vector2): boolean {
  return a.distanceToSquared(b) < 1e-12
}

export function projectRing(ring: Position[], projection: LocalProjection): THREE.Vector2[] {
  const projected = ring.map(projection.project)
  const first = projected[0]
  const last = projected.at(-1)
  if (first && last && projected.length > 1 && samePoint(first, last)) {
    projected.pop()
  }
  return projected
}

function normalizedRing(
  ring: Position[],
  projection: LocalProjection,
  clockwise: boolean,
): THREE.Vector2[] {
  const points = projectRing(ring, projection)
  if (THREE.ShapeUtils.isClockWise(points) !== clockwise) points.reverse()
  return points
}

export function featureToShape(feature: StreetFeature, projection: LocalProjection): THREE.Shape {
  const [outer, ...holes] = feature.geometry.coordinates
  if (!outer) throw new Error(`${feature.properties.name}缺少外环`)
  const shape = new THREE.Shape(normalizedRing(outer, projection, true))
  shape.holes = holes.map((hole) => new THREE.Path(normalizedRing(hole, projection, false)))
  return shape
}

function pointInRing(point: THREE.Vector2, ring: THREE.Vector2[]): boolean {
  let inside = false
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const currentPoint = ring[index]
    const previousPoint = ring[previous]
    if (!currentPoint || !previousPoint) continue
    const crosses = (currentPoint.y > point.y) !== (previousPoint.y > point.y)
      && point.x < ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y))
        / (previousPoint.y - currentPoint.y) + currentPoint.x
    if (crosses) inside = !inside
  }
  return inside
}

function distanceToSegment(point: THREE.Vector2, start: THREE.Vector2, end: THREE.Vector2): number {
  const segment = end.clone().sub(start)
  const lengthSquared = segment.lengthSq()
  if (lengthSquared === 0) return point.distanceTo(start)
  const ratio = THREE.MathUtils.clamp(point.clone().sub(start).dot(segment) / lengthSquared, 0, 1)
  return point.distanceTo(start.clone().addScaledVector(segment, ratio))
}

function edgeDistance(point: THREE.Vector2, ring: THREE.Vector2[]): number {
  let minimum = Number.POSITIVE_INFINITY
  for (let index = 0; index < ring.length; index += 1) {
    const start = ring[index]
    const end = ring[(index + 1) % ring.length]
    if (start && end) minimum = Math.min(minimum, distanceToSegment(point, start, end))
  }
  return minimum
}

export function findInteriorAnchor(feature: StreetFeature, projection: LocalProjection): THREE.Vector2 {
  const outer = feature.geometry.coordinates[0]
  if (!outer) throw new Error(`${feature.properties.name}缺少外环`)
  const ring = projectRing(outer, projection)
  const bounds = new THREE.Box2().setFromPoints(ring)
  const size = bounds.getSize(new THREE.Vector2())
  let best: THREE.Vector2 | null = null
  let bestDistance = -1
  const gridSize = 36

  for (let row = 0; row < gridSize; row += 1) {
    for (let column = 0; column < gridSize; column += 1) {
      const candidate = new THREE.Vector2(
        bounds.min.x + size.x * (column + 0.5) / gridSize,
        bounds.min.y + size.y * (row + 0.5) / gridSize,
      )
      if (!pointInRing(candidate, ring)) continue
      const distance = edgeDistance(candidate, ring)
      if (distance > bestDistance) {
        best = candidate
        bestDistance = distance
      }
    }
  }

  if (best) return best
  const center = bounds.getCenter(new THREE.Vector2())
  if (pointInRing(center, ring)) return center
  throw new Error(`无法计算${feature.properties.name}的内部标签位置`)
}
