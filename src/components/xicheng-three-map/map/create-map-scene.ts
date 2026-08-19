import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js'
import type { StreetCaseMetric } from '../case-count-metrics'
import type { MapSelectionState, StreetFeatureCollection } from '../types'
import { CameraController, type CameraPose } from './camera-controller'
import { createLabelLayer } from './create-label-layer'
import { createStreetLayer } from './create-street-layer'
import { createTechnologyPlatform } from './create-technology-platform'
import { disposeObject3D } from './dispose'
import { InteractionController } from './interaction-controller'
import { createLocalProjection } from './projection'
import type { MapSelectionStore } from './selection-state'

export interface MapSceneHandle {
  focusStreet(adcode: string): void
  zoomBy(factor: number): void
  resetCamera(): void
  resize(): void
  updateMetrics(metrics: Record<string, StreetCaseMetric>): void
  dispose(): void
}

export interface MapSceneOptions {
  collection: StreetFeatureCollection
  metrics: Record<string, StreetCaseMetric>
  store: MapSelectionStore
  onSelect(adcode: string): void
  onClear(): void
}

export function createMapScene(container: HTMLElement, options: MapSceneOptions): MapSceneHandle {
  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x020914, 0.0028)
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1200)
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.domElement.className = 'webgl-canvas'
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.9
  renderer.setClearColor(0x000000, 0)
  container.appendChild(renderer.domElement)

  const labelRenderer = new CSS2DRenderer()
  labelRenderer.domElement.className = 'label-layer'
  container.appendChild(labelRenderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.065
  controls.minDistance = 115
  controls.maxDistance = 360
  controls.minPolarAngle = Math.PI * 0.16
  controls.maxPolarAngle = Math.PI * 0.44
  controls.enablePan = true
  controls.screenSpacePanning = false
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.42

  const initialPose: CameraPose = {
    position: new THREE.Vector3(-158, 176, 210),
    target: new THREE.Vector3(0, -2, 0),
  }
  const cameraController = new CameraController(camera, controls, initialPose)
  const projection = createLocalProjection(options.collection, 160)
  const streetLayer = createStreetLayer({
    collection: options.collection,
    projection,
    metrics: options.metrics,
  })
  const labelLayer = createLabelLayer({
    collection: options.collection,
    projection,
    topHeight: 12.7,
  })
  const platformTexture = new THREE.TextureLoader().load(
    `${import.meta.env.BASE_URL}textures/xicheng-tech-platform-v1.png`,
  )
  platformTexture.colorSpace = THREE.SRGBColorSpace
  platformTexture.minFilter = THREE.LinearMipmapLinearFilter
  platformTexture.magFilter = THREE.LinearFilter
  platformTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  const technologyPlatform = createTechnologyPlatform({
    width: Math.max(1, container.clientWidth),
    height: Math.max(1, container.clientHeight),
    pixelRatio: window.devicePixelRatio,
    patternTexture: platformTexture,
  })
  scene.add(technologyPlatform.group, streetLayer.group, labelLayer.group)

  scene.add(new THREE.HemisphereLight(0xbdefff, 0x06111f, 1.05))
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.9)
  keyLight.position.set(-90, 160, 80)
  scene.add(keyLight)
  const rimLight = new THREE.PointLight(0x00c8ff, 720, 360, 2)
  rimLight.position.set(90, 86, -80)
  scene.add(rimLight)

  const composer = new EffectComposer(renderer)
  const renderPass = new RenderPass(scene, camera)
  composer.addPass(renderPass)
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.58, 0.42, 0.82)
  composer.addPass(bloom)

  const stopAutoRotate = () => {
    controls.autoRotate = false
    cameraController.cancel()
  }
  controls.addEventListener('start', stopAutoRotate)

  const focusStreet = (adcode: string) => {
    const street = streetLayer.groupsByAdcode.get(adcode)
    if (!street) return
    const bounds = new THREE.Box3().setFromObject(street)
    const center = bounds.getCenter(new THREE.Vector3())
    const size = bounds.getSize(new THREE.Vector3())
    const responsiveFactor = container.clientWidth < 720 ? 1.65 : 1
    const distance = Math.max(70, Math.max(size.x, size.z) * 2.7) * responsiveFactor
    stopAutoRotate()
    cameraController.focus({
      target: new THREE.Vector3(center.x, 8, center.z),
      position: new THREE.Vector3(center.x - distance * 0.72, distance * 0.88, center.z + distance),
    }, 760)
  }

  const zoomBy = (factor: number) => {
    if (!Number.isFinite(factor) || factor <= 0) return
    stopAutoRotate()
    const offset = camera.position.clone().sub(controls.target)
    const nextDistance = THREE.MathUtils.clamp(
      offset.length() * factor,
      controls.minDistance,
      controls.maxDistance,
    )
    if (offset.lengthSq() === 0) offset.set(0, 0, 1)
    camera.position.copy(controls.target).add(offset.setLength(nextDistance))
    controls.update()
  }

  const resetCamera = () => {
    stopAutoRotate()
    cameraController.reset(820, performance.now(), () => {
      controls.autoRotate = true
    })
  }

  const interaction = new InteractionController({
    canvas: renderer.domElement,
    camera,
    pickables: streetLayer.pickables,
    store: options.store,
    onSelect: (adcode) => {
      focusStreet(adcode)
      options.onSelect(adcode)
    },
    onClear: () => {
      resetCamera()
      options.onClear()
    },
  })

  const applySelectionState = (state: MapSelectionState) => {
    streetLayer.setVisualState(state)
    labelLayer.setVisibleLabels(
      container.clientWidth < 720 && state.selected ? new Set([state.selected]) : null,
    )
    for (const element of labelLayer.elements) {
      const active = element.dataset.adcode === state.hovered || element.dataset.adcode === state.selected
      element.classList.toggle('is-active', active)
    }
  }
  const unsubscribe = options.store.subscribe(applySelectionState)
  applySelectionState(options.store.snapshot())

  const resize = () => {
    const width = Math.max(1, container.clientWidth)
    const height = Math.max(1, container.clientHeight)
    const pixelRatio = Math.min(window.devicePixelRatio, 1.75)
    camera.fov = width < 720 ? 52 : 42
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setPixelRatio(pixelRatio)
    renderer.setSize(width, height, false)
    labelRenderer.setSize(width, height)
    composer.setPixelRatio(pixelRatio)
    composer.setSize(width, height)
    technologyPlatform.resize(width, height, pixelRatio)
    applySelectionState(options.store.snapshot())
  }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(container)
  resize()

  const clock = new THREE.Clock()
  let animationFrame = 0
  const render = (time: number) => {
    const delta = Math.min(clock.getDelta(), 0.05)
    cameraController.update(time)
    controls.update(delta)
    streetLayer.update(delta)
    technologyPlatform.update(delta)
    composer.render()
    labelRenderer.render(scene, camera)
    animationFrame = requestAnimationFrame(render)
  }
  animationFrame = requestAnimationFrame(render)

  let disposed = false
  return {
    focusStreet,
    zoomBy,
    resetCamera,
    resize,
    updateMetrics: (metrics) => streetLayer.updateMetrics(metrics),
    dispose: () => {
      if (disposed) return
      disposed = true
      cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      unsubscribe()
      interaction.dispose()
      controls.removeEventListener('start', stopAutoRotate)
      controls.dispose()
      streetLayer.dispose()
      labelLayer.dispose()
      technologyPlatform.dispose()
      renderPass.dispose()
      bloom.dispose()
      composer.dispose()
      disposeObject3D(scene)
      renderer.domElement.remove()
      labelRenderer.domElement.remove()
      renderer.dispose()
    },
  }
}
