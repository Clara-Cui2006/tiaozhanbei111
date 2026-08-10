import * as THREE from 'three'

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
  color: THREE.ColorRepresentation,
  normalizedHeight: number,
  intensity: number,
): SideGradientSample {
  const height = THREE.MathUtils.clamp(normalizedHeight, 0, 1)
  const smoothHeight = height * height * (3 - 2 * height)
  const topFactor = SIDE_GRADIENT.topBaseFactor
    + SIDE_GRADIENT.topIntensityGain * Math.max(0, intensity)
  const factor = THREE.MathUtils.lerp(SIDE_GRADIENT.bottomFactor, topFactor, smoothHeight)

  return {
    color: new THREE.Color(color).multiplyScalar(factor),
    opacity: THREE.MathUtils.lerp(SIDE_GRADIENT.bottomOpacity, SIDE_GRADIENT.topOpacity, height),
  }
}

export function createTopMaterial(colorValue: THREE.ColorRepresentation): THREE.MeshStandardMaterial {
  const color = new THREE.Color(colorValue)
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
  color: THREE.ColorRepresentation,
  depth: number,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
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

export function createOutlineMaterial(
  color: THREE.ColorRepresentation,
  opacity: number,
): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })
}
