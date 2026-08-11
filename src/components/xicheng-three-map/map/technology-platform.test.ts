// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { computeReflectionSize, createTechnologyPlatform } from './create-technology-platform'

const createViewport = () => ({
  width: 1200,
  height: 800,
  pixelRatio: 1,
  patternTexture: new THREE.Texture(),
})

describe('computeReflectionSize', () => {
  it('limits desktop and narrow-screen reflection targets', () => {
    expect(computeReflectionSize(1200, 800, 2)).toEqual({ width: 1024, height: 683 })
    expect(computeReflectionSize(390, 844, 3)).toEqual({ width: 237, height: 512 })
  })
})

describe('createTechnologyPlatform', () => {
  it('places the supplied pattern texture beneath the reflector', () => {
    const viewport = createViewport()
    const platform = createTechnologyPlatform(viewport)
    const reflector = platform.group.getObjectByName('technology-reflector') as THREE.Object3D
    const pattern = platform.group.getObjectByName('technology-pattern') as THREE.Mesh<
      THREE.PlaneGeometry,
      THREE.MeshBasicMaterial
    >

    expect(pattern).toBeTruthy()
    expect(pattern.material.map).toBe(viewport.patternTexture)
    expect(pattern.position.y).toBeLessThan(reflector.position.y)
    expect(platform.group.getObjectByName('technology-hud')).toBeFalsy()

    platform.dispose()
  })

  it('releases the supplied texture with the platform', () => {
    const viewport = createViewport()
    const disposeTexture = vi.spyOn(viewport.patternTexture, 'dispose')
    const platform = createTechnologyPlatform(viewport)

    platform.dispose()

    expect(disposeTexture).toHaveBeenCalledTimes(1)
  })
})
