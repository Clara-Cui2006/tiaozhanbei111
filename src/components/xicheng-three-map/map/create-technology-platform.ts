import * as THREE from 'three'
import { Reflector } from 'three/addons/objects/Reflector.js'

export interface ReflectionSize { width: number; height: number }
export interface TechnologyPlatformViewport { width: number; height: number; pixelRatio: number }
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

const TECHNOLOGY_HUD_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const TECHNOLOGY_HUD_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uDensity;
  varying vec2 vUv;
  const float TAU = 6.28318530718;
  float band(float value, float center, float width) {
    return 1.0 - smoothstep(width, width + fwidth(value), abs(value - center));
  }
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float radius = length(p);
    float angle = atan(p.y, p.x);
    float mask = 1.0 - smoothstep(0.70, 1.0, radius);
    vec2 gridUv = vUv * (30.0 * uDensity);
    vec2 gridDistance = abs(fract(gridUv) - 0.5) / fwidth(gridUv);
    float grid = 1.0 - min(min(gridDistance.x, gridDistance.y), 1.0);
    grid *= 0.075 * (1.0 - smoothstep(0.18, 0.95, radius));
    float rings = 0.0;
    rings += band(radius, 0.36, 0.0025) * 0.34;
    rings += band(radius, 0.52, 0.0030) * 0.50;
    rings += band(radius, 0.68, 0.0040) * 0.72;
    rings += band(radius, 0.84, 0.0030) * 0.42;
    float dashPhase = fract((angle / TAU + 0.5) * 72.0 + uTime * 0.025);
    float dashedRing = band(radius, 0.76, 0.012) * step(0.34, dashPhase) * 0.72;
    float tickPhase = fract((angle / TAU + 0.5) * 108.0);
    float ticks = band(radius, 0.91, 0.028) * step(0.78, tickPhase) * 0.58;
    vec2 direction = vec2(cos(uTime * 0.18), sin(uTime * 0.18));
    float sweep = pow(max(dot(normalize(p + 0.0001), direction), 0.0), 56.0);
    sweep *= (1.0 - smoothstep(0.08, 0.92, radius)) * 0.80;
    vec2 nodeCell = floor(vUv * 22.0);
    vec2 nodeUv = fract(vUv * 22.0) - 0.5;
    float nodes = (1.0 - smoothstep(0.05, 0.14, length(nodeUv)));
    nodes *= step(0.91, hash21(nodeCell)) * 0.62;
    float signal = (grid + rings + dashedRing + ticks + sweep + nodes) * mask;
    vec3 cyan = vec3(0.02, 0.55, 1.0);
    vec3 ice = vec3(0.28, 0.92, 1.0);
    vec3 color = mix(cyan, ice, clamp(sweep + nodes, 0.0, 1.0));
    gl_FragColor = vec4(color * signal, clamp(signal * 0.72, 0.0, 0.64));
  }
`

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

  const hudGeometry = new THREE.CircleGeometry(133, 128)
  const hudMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 },
      uDensity: { value: viewport.width < 720 ? 0.72 : 1 },
    },
    vertexShader: TECHNOLOGY_HUD_VERTEX_SHADER,
    fragmentShader: TECHNOLOGY_HUD_FRAGMENT_SHADER,
  })
  const hud = new THREE.Mesh(hudGeometry, hudMaterial)
  hud.name = 'technology-hud'
  hud.rotation.x = -Math.PI / 2
  hud.position.y = -1.48
  hud.renderOrder = 2

  const particles = createParticleField(viewport.width < 720 ? 96 : 168)
  particles.renderOrder = 3
  const originalBeforeRender = reflector.onBeforeRender
  reflector.onBeforeRender = function (...args) {
    const hudVisible = hud.visible
    const particlesVisible = particles.visible
    hud.visible = false
    particles.visible = false
    try {
      originalBeforeRender.apply(this, args)
    } finally {
      hud.visible = hudVisible
      particles.visible = particlesVisible
    }
  }
  group.add(base, reflector, hud, particles)

  return {
    group,
    reflector,
    update: (deltaSeconds) => {
      const timeUniform = hudMaterial.uniforms.uTime
      if (timeUniform) timeUniform.value += Math.max(0, deltaSeconds)
    },
    resize: (width, height, pixelRatio) => {
      const nextSize = computeReflectionSize(width, height, pixelRatio)
      reflector.getRenderTarget().setSize(nextSize.width, nextSize.height)
      reflectorMaterial.uniforms.uTexelSize?.value.set(1 / nextSize.width, 1 / nextSize.height)
      const densityUniform = hudMaterial.uniforms.uDensity
      if (densityUniform) densityUniform.value = width < 720 ? 0.72 : 1
    },
    dispose: () => {
      reflector.dispose()
      reflector.geometry.dispose()
      baseGeometry.dispose()
      baseMaterial.dispose()
      hudGeometry.dispose()
      hudMaterial.dispose()
      particles.geometry.dispose()
      ;(particles.material as THREE.Material).dispose()
      group.clear()
    },
  }
}
