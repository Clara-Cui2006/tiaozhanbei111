import { Vector2 } from 'three'
import type { Position, StreetFeatureCollection } from '../types'

export interface LocalProjection {
  center: Position
  scale: number
  project(position: Position): Vector2
}

export function createLocalProjection(
  collection: StreetFeatureCollection,
  targetSpan: number,
): LocalProjection {
  const positions = collection.features.flatMap((feature) => feature.geometry.coordinates.flat())
  const longitudes = positions.map(([longitude]) => longitude)
  const latitudes = positions.map(([, latitude]) => latitude)
  const minLongitude = Math.min(...longitudes)
  const maxLongitude = Math.max(...longitudes)
  const minLatitude = Math.min(...latitudes)
  const maxLatitude = Math.max(...latitudes)
  const center: Position = [
    (minLongitude + maxLongitude) / 2,
    (minLatitude + maxLatitude) / 2,
  ]
  const longitudeFactor = Math.cos(center[1] * Math.PI / 180)
  const rawWidth = (maxLongitude - minLongitude) * longitudeFactor
  const rawHeight = maxLatitude - minLatitude
  const scale = targetSpan / Math.max(rawWidth, rawHeight)

  return {
    center,
    scale,
    project: ([longitude, latitude]) => new Vector2(
      (longitude - center[0]) * longitudeFactor * scale,
      (latitude - center[1]) * scale,
    ),
  }
}
