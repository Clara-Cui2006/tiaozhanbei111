import type { Position, StreetFeature, StreetFeatureCollection } from '../types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isPosition(value: unknown): value is Position {
  return Array.isArray(value)
    && value.length >= 2
    && Number.isFinite(value[0])
    && Number.isFinite(value[1])
}

function assertFeature(value: unknown, index: number): asserts value is StreetFeature {
  if (!isRecord(value) || value.type !== 'Feature') {
    throw new Error(`第${index + 1}条街道必须是Feature`)
  }

  const properties = value.properties
  if (!isRecord(properties)) {
    throw new Error(`第${index + 1}条街道缺少属性`)
  }
  if (typeof properties.name !== 'string' || properties.name.trim().length === 0) {
    throw new Error(`第${index + 1}条街道名称不能为空`)
  }
  if (typeof properties.adcode !== 'string' || !/^\d{9}$/.test(properties.adcode)) {
    throw new Error(`${properties.name}的行政代码必须是9位数字`)
  }

  const geometry = value.geometry
  if (!isRecord(geometry) || geometry.type !== 'Polygon' || !Array.isArray(geometry.coordinates)) {
    throw new Error(`${properties.name}的几何必须是Polygon`)
  }
  if (geometry.coordinates.length === 0) {
    throw new Error(`${properties.name}的坐标环不能为空`)
  }
  for (const ring of geometry.coordinates) {
    if (!Array.isArray(ring) || ring.length < 4 || !ring.every(isPosition)) {
      throw new Error(`${properties.name}包含无效坐标环`)
    }
    const first = ring[0]
    const last = ring.at(-1)
    if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) {
      throw new Error(`${properties.name}的坐标环必须闭合`)
    }
  }
}

export function validateStreetCollection(input: unknown): StreetFeatureCollection {
  if (!isRecord(input) || input.type !== 'FeatureCollection' || !Array.isArray(input.features)) {
    throw new Error('地图数据必须是FeatureCollection')
  }
  if (input.features.length !== 15) {
    throw new Error('地图数据必须包含15个街道')
  }

  input.features.forEach(assertFeature)
  const adcodes = input.features.map((feature) => feature.properties.adcode)
  if (new Set(adcodes).size !== adcodes.length) {
    throw new Error('街道行政代码必须唯一')
  }

  return input as unknown as StreetFeatureCollection
}

export async function loadStreetCollection(url: string): Promise<StreetFeatureCollection> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`地图数据加载失败（${response.status}）`)
  }
  return validateStreetCollection(await response.json())
}
