import * as THREE from 'three'
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import type { StreetFeatureCollection } from '../types'
import { disposeObject3D } from './dispose'
import { findInteriorAnchor } from './geometry'
import type { LocalProjection } from './projection'

interface LabelLayerOptions {
  collection: StreetFeatureCollection
  projection: LocalProjection
  topHeight: number
}

export interface LabelLayerHandle {
  group: THREE.Group
  elements: HTMLDivElement[]
  setVisibleLabels(adcodes: Set<string> | null): void
  dispose(): void
}

export function createLabelLayer(options: LabelLayerOptions): LabelLayerHandle {
  const group = new THREE.Group()
  group.name = 'street-labels'
  const elements: HTMLDivElement[] = []
  const groupsByAdcode = new Map<string, THREE.Group>()

  for (const feature of options.collection.features) {
    const { adcode, name } = feature.properties
    const anchor = findInteriorAnchor(feature, options.projection)
    const marker = new THREE.Group()
    marker.name = `${name}-label`
    marker.userData = { adcode, name }
    marker.position.set(anchor.x, 0, -anchor.y)

    const poleGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, options.topHeight + 0.5, 0),
      new THREE.Vector3(0, options.topHeight + 16, 0),
    ])
    const poleMaterial = new THREE.LineBasicMaterial({
      color: 0xd9fbff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
    marker.add(new THREE.Line(poleGeometry, poleMaterial))

    const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xe8ffff, toneMapped: false })
    const topPoint = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 8), pointMaterial)
    topPoint.position.y = options.topHeight + 16
    const bottomPoint = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 6), pointMaterial.clone())
    bottomPoint.position.y = options.topHeight + 0.5
    marker.add(topPoint, bottomPoint)

    const element = document.createElement('div')
    element.className = 'street-label'
    element.textContent = name
    element.dataset.adcode = adcode
    const label = new CSS2DObject(element)
    label.position.set(0, options.topHeight + 19, 0)
    marker.add(label)

    group.add(marker)
    elements.push(element)
    groupsByAdcode.set(adcode, marker)
  }

  return {
    group,
    elements,
    setVisibleLabels: (adcodes) => {
      for (const [adcode, marker] of groupsByAdcode) {
        marker.visible = adcodes === null || adcodes.has(adcode)
      }
    },
    dispose: () => {
      elements.forEach((element) => element.remove())
      disposeObject3D(group)
    },
  }
}
