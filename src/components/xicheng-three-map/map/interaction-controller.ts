import * as THREE from 'three'
import type { MapSelectionStore } from './selection-state'

interface InteractionOptions {
  canvas: HTMLCanvasElement
  camera: THREE.PerspectiveCamera
  pickables: THREE.Mesh[]
  store: MapSelectionStore
  onSelect(adcode: string): void
  onClear(): void
}

export class InteractionController {
  private readonly raycaster = new THREE.Raycaster()
  private readonly pointer = new THREE.Vector2()
  private pointerDown: { x: number; y: number; pointerId: number } | null = null
  private suppressNextClick = false

  constructor(private readonly options: InteractionOptions) {
    options.canvas.addEventListener('pointerdown', this.handlePointerDown)
    options.canvas.addEventListener('pointerup', this.handlePointerUp)
    options.canvas.addEventListener('pointercancel', this.handlePointerCancel)
    options.canvas.addEventListener('pointermove', this.handlePointerMove)
    options.canvas.addEventListener('pointerleave', this.handlePointerLeave)
    options.canvas.addEventListener('click', this.handleClick)
  }

  dispose(): void {
    this.options.canvas.removeEventListener('pointerdown', this.handlePointerDown)
    this.options.canvas.removeEventListener('pointerup', this.handlePointerUp)
    this.options.canvas.removeEventListener('pointercancel', this.handlePointerCancel)
    this.options.canvas.removeEventListener('pointermove', this.handlePointerMove)
    this.options.canvas.removeEventListener('pointerleave', this.handlePointerLeave)
    this.options.canvas.removeEventListener('click', this.handleClick)
  }

  private updatePointer(event: MouseEvent): void {
    const bounds = this.options.canvas.getBoundingClientRect()
    this.pointer.set(
      ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * 2 - 1,
      -((event.clientY - bounds.top) / Math.max(1, bounds.height)) * 2 + 1,
    )
  }

  private pick(event: MouseEvent): string | null {
    this.updatePointer(event)
    this.raycaster.setFromCamera(this.pointer, this.options.camera)
    const hit = this.raycaster.intersectObjects(this.options.pickables, false)[0]
    return typeof hit?.object.userData.adcode === 'string' ? hit.object.userData.adcode : null
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    const adcode = this.pick(event)
    this.options.store.setHovered(adcode)
    this.options.canvas.style.cursor = adcode ? 'pointer' : 'grab'
  }

  private readonly handlePointerLeave = (): void => {
    this.options.store.setHovered(null)
    this.options.canvas.style.cursor = 'grab'
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.suppressNextClick = false
    this.pointerDown = { x: event.clientX, y: event.clientY, pointerId: event.pointerId }
  }

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (!this.pointerDown || this.pointerDown.pointerId !== event.pointerId) return
    const deltaX = event.clientX - this.pointerDown.x
    const deltaY = event.clientY - this.pointerDown.y
    this.suppressNextClick = deltaX * deltaX + deltaY * deltaY > 36
    this.pointerDown = null
  }

  private readonly handlePointerCancel = (): void => {
    this.pointerDown = null
    this.suppressNextClick = false
  }

  private readonly handleClick = (event: MouseEvent): void => {
    if (this.suppressNextClick) {
      this.suppressNextClick = false
      return
    }
    const adcode = this.pick(event)
    if (adcode) {
      this.options.store.setSelected(adcode)
      this.options.onSelect(adcode)
      return
    }
    this.options.store.setSelected(null)
    this.options.onClear()
  }
}
