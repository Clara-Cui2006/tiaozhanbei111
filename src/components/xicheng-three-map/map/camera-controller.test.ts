import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'
import { CameraController, type CameraPose } from './camera-controller'

function controlsAdapter() {
  return { target: new THREE.Vector3(), update: vi.fn() }
}

const initialPose: CameraPose = {
  position: new THREE.Vector3(120, 150, 180),
  target: new THREE.Vector3(0, 0, 0),
}

describe('CameraController', () => {
  it('clamps a focus animation to its target pose after the duration', () => {
    const camera = new THREE.PerspectiveCamera()
    const controls = controlsAdapter()
    const controller = new CameraController(camera, controls, initialPose)
    const target = {
      position: new THREE.Vector3(30, 80, 40),
      target: new THREE.Vector3(10, 0, -5),
    }

    controller.focus(target, 800, 100)
    controller.update(1000)

    expect(camera.position.distanceTo(target.position)).toBeLessThan(0.01)
    expect(controls.target.distanceTo(target.target)).toBeLessThan(0.01)
    expect(controller.isAnimating()).toBe(false)
  })

  it('resets to the initial pose and completes once', () => {
    const camera = new THREE.PerspectiveCamera()
    const controls = controlsAdapter()
    const controller = new CameraController(camera, controls, initialPose)
    const onComplete = vi.fn()
    controller.focus({ position: new THREE.Vector3(1, 2, 3), target: new THREE.Vector3(4, 5, 6) }, 1, 0)
    controller.update(1)

    controller.reset(800, 20, onComplete)
    controller.update(820)
    controller.update(900)

    expect(camera.position.distanceTo(initialPose.position)).toBeLessThan(0.01)
    expect(controls.target.distanceTo(initialPose.target)).toBeLessThan(0.01)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('does not complete a cancelled animation', () => {
    const controller = new CameraController(new THREE.PerspectiveCamera(), controlsAdapter(), initialPose)
    const onComplete = vi.fn()
    controller.reset(800, 0, onComplete)
    controller.cancel()
    controller.update(800)
    expect(onComplete).not.toHaveBeenCalled()
  })
})
