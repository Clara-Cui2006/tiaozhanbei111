/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { loadStreetCollection, validateStreetCollection } from './geojson'

const raw = JSON.parse(
  readFileSync(new URL('../../../../public/maps/xicheng_15_streets_clean.geojson', import.meta.url), 'utf8')
)

describe('validateStreetCollection', () => {
  it('接受15个唯一街道的有效数据', () => {
    const collection = validateStreetCollection(raw)

    expect(collection.features).toHaveLength(15)
    expect(new Set(collection.features.map((feature) => feature.properties.adcode)).size).toBe(15)
  })

  it('拒绝街道数量缺失的数据', () => {
    const incomplete = { ...raw, features: raw.features.slice(0, 14) }

    expect(() => validateStreetCollection(incomplete)).toThrow('必须包含15个街道')
  })

  it('拒绝重复行政代码', () => {
    const duplicated = structuredClone(raw)
    duplicated.features[1].properties.adcode = duplicated.features[0].properties.adcode

    expect(() => validateStreetCollection(duplicated)).toThrow('行政代码必须唯一')
  })

  it('从网址加载并校验街道数据', async () => {
    const url = `data:application/json,${encodeURIComponent(JSON.stringify(raw))}`

    await expect(loadStreetCollection(url)).resolves.toMatchObject({
      type: 'FeatureCollection',
      features: expect.arrayContaining([
        expect.objectContaining({ properties: expect.objectContaining({ name: '德胜街道' }) })
      ])
    })
  })
})
