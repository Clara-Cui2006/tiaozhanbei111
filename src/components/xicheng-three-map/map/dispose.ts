import * as THREE from 'three'

function disposeTextureValue(value: unknown, disposed: Set<THREE.Texture>): void {
  if (value instanceof THREE.Texture) {
    if (!disposed.has(value)) {
      disposed.add(value)
      value.dispose()
    }
    return
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => disposeTextureValue(entry, disposed))
    return
  }
  if (value && typeof value === 'object' && !(value instanceof THREE.Object3D)) {
    Object.values(value).forEach((entry) => disposeTextureValue(entry, disposed))
  }
}

function disposeMaterial(material: THREE.Material, disposedTextures: Set<THREE.Texture>): void {
  Object.values(material).forEach((value) => disposeTextureValue(value, disposedTextures))
  material.dispose()
}

export function disposeObject3D(root: THREE.Object3D): void {
  const disposedTextures = new Set<THREE.Texture>()
  root.traverse((object) => {
    const renderable = object as THREE.Mesh
    renderable.geometry?.dispose()
    if (Array.isArray(renderable.material)) {
      renderable.material.forEach((material) => disposeMaterial(material, disposedTextures))
    } else if (renderable.material) {
      disposeMaterial(renderable.material, disposedTextures)
    }
  })
  root.clear()
}
