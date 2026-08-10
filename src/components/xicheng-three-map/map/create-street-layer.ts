import * as THREE from 'three'
import type { StreetCaseMetric } from '../case-count-metrics'
import type { MapSelectionState, StreetFeatureCollection } from '../types'
import { disposeObject3D } from './dispose'
import { featureToShape, projectRing } from './geometry'
import { createOutlineMaterial, createSideMaterial, createTopMaterial, LEVEL_COLORS } from './materials'
import type { LocalProjection } from './projection'

interface StreetLayerOptions {
  collection: StreetFeatureCollection
  projection: LocalProjection
  metrics: Record<string, StreetCaseMetric>
}

interface StreetVisual {
  group: THREE.Group
  topMaterial: THREE.MeshStandardMaterial
  sideMaterial: THREE.ShaderMaterial
  crispMaterial: THREE.LineBasicMaterial
  glowMaterial: THREE.LineBasicMaterial
}

export interface StreetLayerHandle {
  group: THREE.Group
  pickables: THREE.Mesh[]
  groupsByAdcode: Map<string, THREE.Group>
  setVisualState(state: MapSelectionState): void
  update(deltaSeconds: number): void
  updateMetrics(metrics: Record<string, StreetCaseMetric>): void
  getMetric(adcode: string): StreetCaseMetric | undefined
  dispose(): void
}

const EXTRUDE_DEPTH = 12

export function createStreetLayer(options: StreetLayerOptions): StreetLayerHandle {
  const group = new THREE.Group()
  group.name = 'xicheng-streets'
  const pickables: THREE.Mesh[] = []
  const groupsByAdcode = new Map<string, THREE.Group>()
  const visuals = new Map<string, StreetVisual>()
  let metrics = options.metrics
  let visualState: MapSelectionState = { hovered: null, selected: null }

  for (const feature of options.collection.features) {
    const { adcode, name } = feature.properties
    const metric = metrics[adcode]
    if (!metric) throw new Error(`${name}缺少演示指标`)

    const streetGroup = new THREE.Group()
    streetGroup.name = name
    streetGroup.userData = { adcode, name }
    streetGroup.rotation.x = -Math.PI / 2

    const geometry = new THREE.ExtrudeGeometry(featureToShape(feature, options.projection), {
      depth: EXTRUDE_DEPTH,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.55,
      bevelThickness: 0.55,
      curveSegments: 2,
    })
    geometry.computeVertexNormals()
    const topMaterial = createTopMaterial(metric.level)
    const sideMaterial = createSideMaterial(metric.level, EXTRUDE_DEPTH)
    const mesh = new THREE.Mesh(geometry, [topMaterial, sideMaterial])
    mesh.name = `${name}-mesh`
    mesh.userData = { adcode, name }
    streetGroup.add(mesh)

    const ring = projectRing(feature.geometry.coordinates[0]!, options.projection)
    const outlinePoints = ring.map((point) => new THREE.Vector3(point.x, point.y, EXTRUDE_DEPTH + 0.7))
    const firstOutlinePoint = outlinePoints[0]
    if (!firstOutlinePoint) throw new Error(`${name}缺少有效外环`)
    const outlineGeometry = new THREE.BufferGeometry().setFromPoints([...outlinePoints, firstOutlinePoint])
    const crispMaterial = createOutlineMaterial(0xe8fbff, 0.96)
    const glowMaterial = createOutlineMaterial(LEVEL_COLORS[metric.level], 0.72)
    const crisp = new THREE.Line(outlineGeometry, crispMaterial)
    const glow = new THREE.Line(outlineGeometry.clone(), glowMaterial)
    glow.scale.setScalar(1.002)
    streetGroup.add(glow, crisp)

    group.add(streetGroup)
    pickables.push(mesh)
    groupsByAdcode.set(adcode, streetGroup)
    visuals.set(adcode, { group: streetGroup, topMaterial, sideMaterial, crispMaterial, glowMaterial })
  }

  return {
    group,
    pickables,
    groupsByAdcode,
    setVisualState: (state) => {
      visualState = { ...state }
    },
    update: (deltaSeconds) => {
      const alpha = 1 - Math.exp(-Math.max(0, deltaSeconds) * 14)
      for (const [adcode, visual] of visuals) {
        const active = adcode === visualState.hovered || adcode === visualState.selected
        visual.group.position.y = THREE.MathUtils.lerp(visual.group.position.y, active ? 3 : 0, alpha)
        visual.topMaterial.emissiveIntensity = THREE.MathUtils.lerp(
          visual.topMaterial.emissiveIntensity,
          active ? 1.48 : 0.78,
          alpha,
        )
        const intensityUniform = visual.sideMaterial.uniforms.uIntensity
        if (intensityUniform) intensityUniform.value = active ? 1.45 : 1
        visual.crispMaterial.opacity = active ? 1 : 0.96
        visual.glowMaterial.opacity = active ? 1 : 0.72
      }
    },
    updateMetrics: (nextMetrics) => {
      for (const feature of options.collection.features) {
        if (!nextMetrics[feature.properties.adcode]) {
          throw new Error(`${feature.properties.name}缺少演示指标`)
        }
      }
      metrics = nextMetrics
      for (const [adcode, visual] of visuals) {
        const metric = metrics[adcode]!
        const color = LEVEL_COLORS[metric.level]
        visual.topMaterial.color.setHex(color)
        visual.topMaterial.emissive.setHex(color).multiplyScalar(0.24)
        const sideColor = visual.sideMaterial.uniforms.uColor?.value as THREE.Color | undefined
        sideColor?.setHex(color)
        visual.glowMaterial.color.setHex(color)
      }
    },
    getMetric: (adcode) => metrics[adcode],
    dispose: () => disposeObject3D(group),
  }
}
