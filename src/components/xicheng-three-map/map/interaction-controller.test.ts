// @vitest-environment jsdom

import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'
import { InteractionController } from './interaction-controller'
import { createSelectionState } from './selection-state'

function pointerEvent(type: string, x: number, y: number, pointerId = 1): MouseEvent {
  const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y })
  Object.defineProperty(event, 'pointerId', { value: pointerId })
  return event
}

function setupInteraction() {
  const canvas = document.createElement('canvas')
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    x: 0, y: 0, left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100,
    toJSON: () => ({}),
  })
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100)
  camera.position.set(0, 0, 5)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld(true)
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial())
  mesh.userData = { adcode: '110102011', name: '金融街街道' }
  mesh.updateMatrixWorld(true)
  const store = createSelectionState()
  const onSelect = vi.fn()
  const onClear = vi.fn()
  const controller = new InteractionController({ canvas, camera, pickables: [mesh], store, onSelect, onClear })
  return { canvas, mesh, store, onSelect, onClear, controller }
}

describe('InteractionController', () => {
  it('selects a street clicked without dragging', () => {
    const fixture = setupInteraction()
    fixture.canvas.dispatchEvent(pointerEvent('click', 50, 50))

    expect(fixture.store.snapshot().selected).toBe('110102011')
    expect(fixture.onSelect).toHaveBeenCalledWith('110102011')
    fixture.controller.dispose()
  })

  it('clears selection when the click misses every street', () => {
    const fixture = setupInteraction()
    fixture.store.setSelected('110102011')
    fixture.canvas.dispatchEvent(pointerEvent('click', 99, 1))

    expect(fixture.store.snapshot().selected).toBeNull()
    expect(fixture.onClear).toHaveBeenCalledTimes(1)
    fixture.controller.dispose()
  })

  it('suppresses the click generated after a drag', () => {
    const fixture = setupInteraction()
    fixture.canvas.dispatchEvent(pointerEvent('pointerdown', 40, 50))
    fixture.canvas.dispatchEvent(pointerEvent('pointerup', 50, 50))
    fixture.canvas.dispatchEvent(pointerEvent('click', 50, 50))

    expect(fixture.store.snapshot().selected).toBeNull()
    expect(fixture.onSelect).not.toHaveBeenCalled()
    fixture.controller.dispose()
  })

  it('removes its listeners on disposal', () => {
    const fixture = setupInteraction()
    fixture.controller.dispose()
    fixture.canvas.dispatchEvent(pointerEvent('click', 50, 50))

    expect(fixture.onSelect).not.toHaveBeenCalled()
    fixture.mesh.geometry.dispose()
    fixture.mesh.material.dispose()
  })
})
