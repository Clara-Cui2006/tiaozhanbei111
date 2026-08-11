import * as THREE from 'three'
import { Reflector } from 'three/addons/objects/Reflector.js'

export interface ReflectionSize { width: number; height: number }
export interface TechnologyPlatformViewport {
  width: number
  height: number
  pixelRatio: number
  patternTexture: THREE.Texture
}
export interface TechnologyPlatformHandle {
  group: THREE.Group
  reflector: Reflector
  update(deltaSeconds: number): void
  resize(width: number, height: number, pixelRatio: number): void
  dispose(): void
}

const REFLECTION_SHADER = {
  name: 'SoftMapReflection',
  uniforms: {
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
    uTexelSize: { value: new THREE.Vector2(1 / 512, 1 / 512) },
    uBlur: { value: 2.1 },
    uOpacity: { value: 0.34 },
    uTint: { value: new THREE.Color(0x06395f) },
  },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vProjectedUv;
    varying vec2 vSurfaceUv;
    #include <logdepthbuf_pars_vertex>
    void main() {
      vSurfaceUv = uv;
      vProjectedUv = textureMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      #include <logdepthbuf_vertex>
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uTexelSize;
    uniform float uBlur;
    uniform float uOpacity;
    uniform vec3 uTint;
    varying vec4 vProjectedUv;
    varying vec2 vSurfaceUv;
    #include <logdepthbuf_pars_fragment>
    vec3 projectedSample(vec2 offset) {
      vec4 uv = vProjectedUv;
      uv.xy += offset * uTexelSize * uBlur * uv.w;
      return texture2DProj(tDiffuse, uv).rgb;
    }
    void main() {
      #include <logdepthbuf_fragment>
      vec3 reflection = projectedSample(vec2(0.0)) * 0.24;
      reflection += projectedSample(vec2(1.0, 0.0)) * 0.12;
      reflection += projectedSample(vec2(-1.0, 0.0)) * 0.12;
      reflection += projectedSample(vec2(0.0, 1.0)) * 0.12;
      reflection += projectedSample(vec2(0.0, -1.0)) * 0.12;
      reflection += projectedSample(vec2(1.7, 1.7)) * 0.07;
      reflection += projectedSample(vec2(-1.7, 1.7)) * 0.07;
      reflection += projectedSample(vec2(1.7, -1.7)) * 0.07;
      reflection += projectedSample(vec2(-1.7, -1.7)) * 0.07;
      float radius = distance(vSurfaceUv, vec2(0.5)) * 2.0;
      float edgeFade = 1.0 - smoothstep(0.58, 0.98, radius);
      float centerFade = smoothstep(0.03, 0.22, radius);
      vec3 tinted = mix(reflection, reflection * uTint * 2.25, 0.26);
      gl_FragColor = vec4(tinted, uOpacity * edgeFade * centerFade);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
}

export function computeReflectionSize(
  viewportWidth: number,
  viewportHeight: number,
  pixelRatio: number,
): ReflectionSize {
  const width = Number.isFinite(viewportWidth) && viewportWidth > 0 ? viewportWidth : 1
  const height = Number.isFinite(viewportHeight) && viewportHeight > 0 ? viewportHeight : 1
  const dpr = Number.isFinite(pixelRatio) && pixelRatio > 0 ? Math.min(pixelRatio, 1.75) : 1
  const narrow = width < 720
  const renderScale = narrow ? 0.42 : 0.55
  const maxDimension = narrow ? 512 : 1024
  const rawWidth = width * dpr * renderScale
  const rawHeight = height * dpr * renderScale
  const clampScale = Math.min(1, maxDimension / Math.max(rawWidth, rawHeight))
  return {
    width: Math.max(64, Math.round(rawWidth * clampScale)),
    height: Math.max(64, Math.round(rawHeight * clampScale)),
  }
}

function createParticleField(count: number): THREE.Points {
  const positions: number[] = []
  for (let index = 0; index < count; index += 1) {
    const angle = index * 2.399963
    const radius = 78 + (index % 41) * 1.42
    positions.push(Math.cos(angle) * radius, 0.8 + (index % 7) * 0.42, Math.sin(angle) * radius)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color: 0x39c8ff,
    size: 0.58,
    transparent: true,
    opacity: 0.27,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })
  const particles = new THREE.Points(geometry, material)
  particles.name = 'technology-particles'
  return particles
}

export function createTechnologyPlatform(viewport: TechnologyPlatformViewport): TechnologyPlatformHandle {
  const reflectionSize = computeReflectionSize(viewport.width, viewport.height, viewport.pixelRatio)
  const group = new THREE.Group()
  group.name = 'technology-platform'

  const baseGeometry = new THREE.CircleGeometry(134, 128)
  const baseMaterial = new THREE.MeshBasicMaterial({
    color: 0x010712, transparent: true, opacity: 0.96, depthWrite: true,
  })
  const base = new THREE.Mesh(baseGeometry, baseMaterial)
  base.name = 'technology-base'
  base.rotation.x = -Math.PI / 2
  base.position.y = -2.25

  const reflector = new Reflector(new THREE.CircleGeometry(128, 128), {
    color: 0x172d41,
    clipBias: 0.0025,
    textureWidth: reflectionSize.width,
    textureHeight: reflectionSize.height,
    multisample: 0,
    shader: REFLECTION_SHADER,
  })
  reflector.name = 'technology-reflector'
  reflector.rotation.x = -Math.PI / 2
  reflector.position.y = -1.85
  reflector.renderOrder = 1
  const reflectorMaterial = reflector.material as THREE.ShaderMaterial
  reflectorMaterial.transparent = true
  reflectorMaterial.depthWrite = false
  reflectorMaterial.blending = THREE.NormalBlending
  reflectorMaterial.uniforms.uTexelSize?.value.set(1 / reflectionSize.width, 1 / reflectionSize.height)

  const patternGeometry = new THREE.PlaneGeometry(270, 270)
  const patternMaterial = new THREE.MeshBasicMaterial({
    map: viewport.patternTexture,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    toneMapped: false,
  })
  const pattern = new THREE.Mesh(patternGeometry, patternMaterial)
  pattern.name = 'technology-pattern'
  pattern.rotation.x = -Math.PI / 2
  pattern.position.y = -2.04
  pattern.renderOrder = 1

  reflector.position.y = -1.72
  reflector.renderOrder = 2

  const particles = createParticleField(viewport.width < 720 ? 96 : 168)
  particles.renderOrder = 3
  const originalBeforeRender = reflector.onBeforeRender
  reflector.onBeforeRender = function (...args) {
    const patternVisible = pattern.visible
    const particlesVisible = particles.visible
    pattern.visible = false
    particles.visible = false
    try {
      originalBeforeRender.apply(this, args)
    } finally {
      pattern.visible = patternVisible
      particles.visible = particlesVisible
    }
  }
  group.add(base, pattern, reflector, particles)

  return {
    group,
    reflector,
    update: () => {},
    resize: (width, height, pixelRatio) => {
      const nextSize = computeReflectionSize(width, height, pixelRatio)
      reflector.getRenderTarget().setSize(nextSize.width, nextSize.height)
      reflectorMaterial.uniforms.uTexelSize?.value.set(1 / nextSize.width, 1 / nextSize.height)
    },
    dispose: () => {
      reflector.dispose()
      reflector.geometry.dispose()
      baseGeometry.dispose()
      baseMaterial.dispose()
      patternGeometry.dispose()
      patternMaterial.dispose()
      viewport.patternTexture.dispose()
      particles.geometry.dispose()
      ;(particles.material as THREE.Material).dispose()
      group.clear()
    },
  }
}
