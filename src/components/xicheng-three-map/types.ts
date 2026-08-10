export type Position = [number, number]

export interface PolygonGeometry {
  type: 'Polygon'
  coordinates: Position[][]
}

export interface StreetProperties {
  name: string
  adcode: string
  osm_relation_id: number
  admin_level: string
  admin_type?: string
  source: string
  license: string
  clean_note: string
}

export interface StreetFeature {
  type: 'Feature'
  properties: StreetProperties
  geometry: PolygonGeometry
}

export interface StreetFeatureCollection {
  type: 'FeatureCollection'
  properties?: Record<string, unknown>
  features: StreetFeature[]
}

export interface MapSelectionState {
  hovered: string | null
  selected: string | null
}

export type { StreetCaseMetric } from './case-count-metrics'
