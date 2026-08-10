// @vitest-environment jsdom

import * as THREE from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StreetCaseMetric } from '../case-count-metrics'
import type { StreetFeatureCollection } from '../types'
import { createMapScene } from './create-map-scene'
import type { MapSelectionStore } from './selection-state'

const mocks = vi.hoisted(() => ({
  renderers: [] as Array<Record<string, unknown>>,
  labelRenderers: [] as Array<Record<string, unknown>>,
  controls: [] as Array<Record<string, unknown>>,
  composers: [] as Array<Record<string, unknown>>,
  renderPasses: [] as Array<Record<string, unknown>>,
  bloomPasses: [] as Array<Record<string, unknown>>,
  cameraControllers: [] as Array<Record<string, unknown>>,
  streetLayers: [] as Array<Record<string, unknown>>,
  labelLayers: [] as Array<Record<string, unknown>>,
  technologyPlatforms: [] as Array<Record<string, unknown>>,
  interactions: [] as Array<Record<string, unknown>>,
  resizeObservers: [] as Array<Record<string, unknown>>,
  disposeObject3D: vi.fn(),
}))

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>()
  class WebGLRenderer {
    readonly domElement = document.createElement('canvas')
    outputColorSpace: unknown
    toneMapping: unknown
    toneMappingExposure = 1
    readonly setClearColor = vi.fn()
    readonly setPixelRatio = vi.fn()
    readonly setSize = vi.fn()
    readonly dispose = vi.fn()
    constructor() { mocks.renderers.push(this as unknown as Record<string, unknown>) }
  }
  return { ...actual, WebGLRenderer }
})

vi.mock('three/addons/controls/OrbitControls.js', () => ({
  OrbitControls: class {
    readonly target = new THREE.Vector3()
    enableDamping = false
    dampingFactor = 0
    minDistance = 0
    maxDistance = Number.POSITIVE_INFINITY
    minPolarAngle = 0
    maxPolarAngle = Math.PI
    enablePan = true
    screenSpacePanning = false
    autoRotate = false
    autoRotateSpeed = 0
    readonly update = vi.fn()
    readonly addEventListener = vi.fn()
    readonly removeEventListener = vi.fn()
    readonly dispose = vi.fn()
    constructor() { mocks.controls.push(this as unknown as Record<string, unknown>) }
  },
}))

vi.mock('three/addons/postprocessing/EffectComposer.js', () => ({
  EffectComposer: class {
    readonly addPass = vi.fn()
    readonly setPixelRatio = vi.fn()
    readonly setSize = vi.fn()
    readonly render = vi.fn()
    readonly dispose = vi.fn()
    constructor() { mocks.composers.push(this as unknown as Record<string, unknown>) }
  },
}))

vi.mock('three/addons/postprocessing/RenderPass.js', () => ({
  RenderPass: class {
    readonly dispose = vi.fn()
    constructor(readonly scene: THREE.Scene, readonly camera: THREE.PerspectiveCamera) {
      mocks.renderPasses.push(this as unknown as Record<string, unknown>)
    }
  },
}))

vi.mock('three/addons/postprocessing/UnrealBloomPass.js', () => ({
  UnrealBloomPass: class {
    readonly dispose = vi.fn()
    constructor() { mocks.bloomPasses.push(this as unknown as Record<string, unknown>) }
  },
}))

vi.mock('three/addons/renderers/CSS2DRenderer.js', () => ({
  CSS2DRenderer: class {
    readonly domElement = document.createElement('div')
    readonly setSize = vi.fn()
    readonly render = vi.fn()
    constructor() { mocks.labelRenderers.push(this as unknown as Record<string, unknown>) }
  },
}))

vi.mock('./camera-controller', () => ({
  CameraController: class {
    readonly focus = vi.fn()
    readonly reset = vi.fn()
    readonly cancel = vi.fn()
    readonly update = vi.fn()
    constructor(
      readonly camera: THREE.PerspectiveCamera,
      readonly controls: { target: THREE.Vector3; update(): void },
      initialPose: { position: THREE.Vector3; target: THREE.Vector3 },
    ) {
      camera.position.copy(initialPose.position)
      controls.target.copy(initialPose.target)
      mocks.cameraControllers.push(this as unknown as Record<string, unknown>)
    }
  },
}))

vi.mock('./create-street-layer', () => ({
  createStreetLayer: () => {
    const group = new THREE.Group()
    const street = new THREE.Group()
    street.position.set(10, 0, -5)
    street.add(new THREE.Mesh(new THREE.BoxGeometry(20, 2, 30), new THREE.MeshBasicMaterial()))
    group.add(street)
    const handle = {
      group,
      pickables: [],
      groupsByAdcode: new Map([['110102011', street]]),
      setVisualState: vi.fn(),
      update: vi.fn(),
      updateMetrics: vi.fn(),
      getMetric: vi.fn(),
      dispose: vi.fn(),
    }
    mocks.streetLayers.push(handle)
    return handle
  },
}))

vi.mock('./create-label-layer', () => ({
  createLabelLayer: () => {
    const element = document.createElement('div')
    element.dataset.adcode = '110102011'
    const handle = {
      group: new THREE.Group(),
      elements: [element],
      setVisibleLabels: vi.fn(),
      dispose: vi.fn(),
    }
    mocks.labelLayers.push(handle)
    return handle
  },
}))

vi.mock('./create-technology-platform', () => ({
  createTechnologyPlatform: () => {
    const handle = { group: new THREE.Group(), update: vi.fn(), resize: vi.fn(), dispose: vi.fn() }
    mocks.technologyPlatforms.push(handle)
    return handle
  },
}))

vi.mock('./interaction-controller', () => ({
  InteractionController: class {
    readonly dispose = vi.fn()
    constructor() { mocks.interactions.push(this as unknown as Record<string, unknown>) }
  },
}))

vi.mock('./projection', () => ({
  createLocalProjection: () => ({ center: [0, 0], scale: 1, project: () => new THREE.Vector2() }),
}))

vi.mock('./dispose', () => ({
  disposeObject3D: (...args: unknown[]) => mocks.disposeObject3D(...args),
}))

class ResizeObserverDouble {
  readonly observe = vi.fn()
  readonly disconnect = vi.fn()
  constructor() { mocks.resizeObservers.push(this as unknown as Record<string, unknown>) }
}

const emptyCollection: StreetFeatureCollection = { type: 'FeatureCollection', features: [] }

function createStore() {
  const unsubscribe = vi.fn()
  const store: MapSelectionStore = {
    snapshot: vi.fn(() => ({ hovered: null, selected: null })),
    setHovered: vi.fn(),
    setSelected: vi.fn(),
    reset: vi.fn(),
    subscribe: vi.fn(() => unsubscribe),
  }
  return { store, unsubscribe }
}

function createContainer(width: number, height: number): HTMLElement {
  const container = document.createElement('div')
  Object.defineProperties(container, {
    clientWidth: { configurable: true, value: width },
    clientHeight: { configurable: true, value: height },
  })
  document.body.appendChild(container)
  return container
}

function asMock(value: unknown): ReturnType<typeof vi.fn> {
  return value as ReturnType<typeof vi.fn>
}

beforeEach(() => {
  for (const value of Object.values(mocks)) {
    if (Array.isArray(value)) value.length = 0
  }
  mocks.disposeObject3D.mockReset()
  vi.stubGlobal('ResizeObserver', ResizeObserverDouble)
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 73))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 2 })
  document.body.replaceChildren()
})

describe('createMapScene', () => {
  it('focuses from the selected street bounds with the narrow-screen distance factor', () => {
    const container = createContainer(600, 400)
    const { store } = createStore()
    const handle = createMapScene(container, {
      collection: emptyCollection,
      metrics: {} as Record<string, StreetCaseMetric>,
      store,
      onSelect: vi.fn(),
      onClear: vi.fn(),
    })

    handle.focusStreet('110102011')

    const controller = mocks.cameraControllers[0]!
    const [pose, duration] = asMock(controller.focus).mock.calls[0] as [
      { position: THREE.Vector3; target: THREE.Vector3 }, number,
    ]
    const distance = 30 * 2.7 * 1.65
    expect(pose.target.toArray()).toEqual([10, 8, -5])
    expect(pose.position.x).toBeCloseTo(10 - distance * 0.72)
    expect(pose.position.y).toBeCloseTo(distance * 0.88)
    expect(pose.position.z).toBeCloseTo(-5 + distance)
    expect(duration).toBe(760)
    expect(mocks.controls[0]!.autoRotate).toBe(false)
    handle.dispose()
  })

  it('switches the camera field of view at the responsive width boundary', () => {
    const container = createContainer(600, 400)
    const { store } = createStore()
    const handle = createMapScene(container, {
      collection: emptyCollection,
      metrics: {} as Record<string, StreetCaseMetric>,
      store,
      onSelect: vi.fn(),
      onClear: vi.fn(),
    })
    const camera = mocks.renderPasses[0]!.camera as THREE.PerspectiveCamera
    expect(camera.fov).toBe(52)

    Object.defineProperties(container, {
      clientWidth: { configurable: true, value: 900 },
      clientHeight: { configurable: true, value: 450 },
    })
    handle.resize()

    expect(camera.fov).toBe(42)
    expect(camera.aspect).toBe(2)
    handle.dispose()
  })

  it('releases every scene lifecycle resource exactly once', () => {
    const container = createContainer(900, 600)
    const { store, unsubscribe } = createStore()
    const handle = createMapScene(container, {
      collection: emptyCollection,
      metrics: {} as Record<string, StreetCaseMetric>,
      store,
      onSelect: vi.fn(),
      onClear: vi.fn(),
    })
    const controls = mocks.controls[0]!
    const startHandler = asMock(controls.addEventListener).mock.calls.find(([event]) => event === 'start')?.[1]

    handle.dispose()
    handle.dispose()

    expect(cancelAnimationFrame).toHaveBeenCalledWith(73)
    expect(asMock(mocks.resizeObservers[0]!.disconnect)).toHaveBeenCalledTimes(1)
    expect(unsubscribe).toHaveBeenCalledTimes(1)
    expect(asMock(mocks.interactions[0]!.dispose)).toHaveBeenCalledTimes(1)
    expect(asMock(controls.removeEventListener)).toHaveBeenCalledWith('start', startHandler)
    expect(asMock(controls.dispose)).toHaveBeenCalledTimes(1)
    expect(asMock(mocks.renderPasses[0]!.dispose)).toHaveBeenCalledTimes(1)
    expect(asMock(mocks.bloomPasses[0]!.dispose)).toHaveBeenCalledTimes(1)
    expect(asMock(mocks.composers[0]!.dispose)).toHaveBeenCalledTimes(1)
    expect(asMock(mocks.streetLayers[0]!.dispose)).toHaveBeenCalledTimes(1)
    expect(asMock(mocks.labelLayers[0]!.dispose)).toHaveBeenCalledTimes(1)
    expect(asMock(mocks.technologyPlatforms[0]!.dispose)).toHaveBeenCalledTimes(1)
    expect(mocks.disposeObject3D).toHaveBeenCalledTimes(1)
    expect(asMock(mocks.renderers[0]!.dispose)).toHaveBeenCalledTimes(1)
    expect(container.childElementCount).toBe(0)
  })
})
