import * as THREE from 'three'
import type { StreetCaseMetric } from '../case-count-metrics'

export const LEVEL_COLORS: Record<StreetCaseMetric['level'], number> = {
  1: 0x0877d9,
  2: 0x06d6d0,
  3: 0xffd45a,
  4: 0xff8a3d,
  5: 0xff355d,
}

const SIDE_GRADIENT = {
  bottomFactor: 0.42,
  topBaseFactor: 0.86,
  topIntensityGain: 0.12,
  bottomOpacity: 0.88,
  topOpacity: 0.96,
} as const

export interface SideGradientSample {
  color: THREE.Color
  opacity: number
}

export function sampleSideGradient(
  level: StreetCaseMetric['level'],
  normalizedHeight: number,
  intensity: number,
): SideGradientSample {
  const height = THREE.MathUtils.clamp(normalizedHeight, 0, 1)
  const smoothHeight = height * height * (3 - 2 * height)
  const topFactor = SIDE_GRADIENT.topBaseFactor
    + SIDE_GRADIENT.topIntensityGain * Math.max(0, intensity)
  const factor = THREE.MathUtils.lerp(SIDE_GRADIENT.bottomFactor, topFactor, smoothHeight)

  return {
    color: new THREE.Color(LEVEL_COLORS[level]).multiplyScalar(factor),
    opacity: THREE.MathUtils.lerp(SIDE_GRADIENT.bottomOpacity, SIDE_GRADIENT.topOpacity, height),
  }
}

export function createTopMaterial(level: StreetCaseMetric['level']): THREE.MeshStandardMaterial {
  const color = new THREE.Color(LEVEL_COLORS[level])
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color.clone().multiplyScalar(0.24),
    emissiveIntensity: 0.78,
    metalness: 0,
    roughness: 0.92,
    transparent: true,
    opacity: 0.94,
  })
}

export function createSideMaterial(
  level: StreetCaseMetric['level'],
  depth: number,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color(LEVEL_COLORS[level]) },
      uDepth: { value: depth },
      uIntensity: { value: 1 },
      uBottomFactor: { value: SIDE_GRADIENT.bottomFactor },
      uTopBaseFactor: { value: SIDE_GRADIENT.topBaseFactor },
      uTopIntensityGain: { value: SIDE_GRADIENT.topIntensityGain },
      uBottomOpacity: { value: SIDE_GRADIENT.bottomOpacity },
      uTopOpacity: { value: SIDE_GRADIENT.topOpacity },
    },
    vertexShader: `
      varying float vHeight;
      uniform float uDepth;
      void main() {
        vHeight = clamp(position.z / uDepth, 0.0, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying float vHeight;
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uBottomFactor;
      uniform float uTopBaseFactor;
      uniform float uTopIntensityGain;
      uniform float uBottomOpacity;
      uniform float uTopOpacity;
      void main() {
        vec3 deep = uColor * uBottomFactor;
        vec3 bright = uColor * (uTopBaseFactor + uTopIntensityGain * uIntensity);
        vec3 color = mix(deep, bright, smoothstep(0.0, 1.0, vHeight));
        float alpha = mix(uBottomOpacity, uTopOpacity, vHeight);
        gl_FragColor = vec4(color, alpha);
      }
    `,
  })
}

export function createOutlineMaterial(color: number, opacity: number): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })
}
