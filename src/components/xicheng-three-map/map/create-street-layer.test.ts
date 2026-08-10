/// <reference types="node" />
import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'
import type { StreetCaseMetric } from '../case-count-metrics'
import { createStreetLayer } from './create-street-layer'
import { validateStreetCollection } from './geojson'
import { LEVEL_COLORS } from './materials'
import { createLocalProjection } from './projection'

const streetCollection = validateStreetCollection(JSON.parse(
  readFileSync(new URL('../../../../public/maps/xicheng_15_streets_clean.geojson', import.meta.url), 'utf8'),
))

function metricsFor(level: StreetCaseMetric['level']): Record<string, StreetCaseMetric> {
  return Object.fromEntries(streetCollection.features.map(({ properties }, index) => [
    properties.adcode,
    { adcode: properties.adcode, name: properties.name, caseCount: index, level, color: '#1689C4' },
  ]))
}

describe('createStreetLayer', () => {
  it('creates one uniquely pickable group for every street', () => {
    const layer = createStreetLayer({
      collection: streetCollection,
      projection: createLocalProjection(streetCollection, 160),
      metrics: metricsFor(2),
    })

    expect(layer.group.children).toHaveLength(15)
    expect(layer.pickables).toHaveLength(15)
    expect(new Set(layer.pickables.map((mesh) => mesh.userData.adcode)).size).toBe(15)
    expect(layer.pickables[0]?.userData).toEqual(expect.objectContaining({ adcode: expect.any(String), name: expect.any(String) }))
    layer.dispose()
  })

  it('updates metric-driven materials while keeping street geometry and visual state', () => {
    const layer = createStreetLayer({
      collection: streetCollection,
      projection: createLocalProjection(streetCollection, 160),
      metrics: metricsFor(1),
    })
    const mesh = layer.pickables.find((candidate) => candidate.userData.adcode === '110102011')
    if (!mesh) throw new Error('缺少金融街可拾取网格')
    const originalGeometry = mesh.geometry
    const originalPosition = layer.groupsByAdcode.get('110102011')?.position.clone()
    layer.setVisualState({ hovered: '110102011', selected: null })
    const updatedMetrics = metricsFor(1)
    updatedMetrics['110102011'] = {
      adcode: '110102011', name: '金融街街道', caseCount: 28, level: 5, color: '#E94B5B',
    }

    layer.updateMetrics(updatedMetrics)

    const [top, side] = mesh.material as [THREE.MeshStandardMaterial, THREE.ShaderMaterial]
    const streetGroup = layer.groupsByAdcode.get('110102011')
    const glow = streetGroup?.children.find((child) => child instanceof THREE.Line
      && (child.material as THREE.LineBasicMaterial).color.getHex() === LEVEL_COLORS[5]) as THREE.Line | undefined
    expect(layer.getMetric('110102011')?.caseCount).toBe(28)
    expect(mesh.geometry).toBe(originalGeometry)
    expect(streetGroup?.position).toEqual(originalPosition)
    expect(top.color.getHex()).toBe(LEVEL_COLORS[5])
    expect((side.uniforms.uColor?.value as THREE.Color).getHex()).toBe(LEVEL_COLORS[5])
    expect(glow).toBeTruthy()
    layer.update(0.2)
    expect(streetGroup?.position.y).toBeGreaterThan(0)
    layer.dispose()
  })

  it('disposes geometry and materials owned by the layer', () => {
    const layer = createStreetLayer({
      collection: streetCollection,
      projection: createLocalProjection(streetCollection, 160),
      metrics: metricsFor(3),
    })
    const mesh = layer.pickables[0]
    if (!mesh) throw new Error('缺少街道网格')
    const geometryDispose = vi.spyOn(mesh.geometry, 'dispose')
    const materialDisposes = (mesh.material as THREE.Material[]).map((material) => vi.spyOn(material, 'dispose'))

    layer.dispose()

    expect(geometryDispose).toHaveBeenCalledTimes(1)
    expect(materialDisposes.every((dispose) => dispose.mock.calls.length === 1)).toBe(true)
    expect(layer.group.children).toHaveLength(0)
  })
})
