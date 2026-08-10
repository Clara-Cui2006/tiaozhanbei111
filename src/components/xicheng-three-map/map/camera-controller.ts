import * as THREE from 'three'

export interface CameraPose {
  position: THREE.Vector3
  target: THREE.Vector3
}

interface ControlsAdapter {
  target: THREE.Vector3
  update(): void
}

interface CameraAnimation {
  start: CameraPose
  end: CameraPose
  startTime: number
  duration: number
  onComplete?: () => void
}

function clonePose(pose: CameraPose): CameraPose {
  return { position: pose.position.clone(), target: pose.target.clone() }
}

export class CameraController {
  private animation: CameraAnimation | null = null
  private readonly initialPose: CameraPose

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly controls: ControlsAdapter,
    initialPose: CameraPose,
  ) {
    this.initialPose = clonePose(initialPose)
    this.applyPose(initialPose)
  }

  focus(pose: CameraPose, duration = 750, startTime = performance.now(), onComplete?: () => void): void {
    this.animation = {
      start: { position: this.camera.position.clone(), target: this.controls.target.clone() },
      end: clonePose(pose),
      startTime,
      duration: Math.max(1, duration),
      onComplete,
    }
  }

  reset(duration = 800, startTime = performance.now(), onComplete?: () => void): void {
    this.focus(this.initialPose, duration, startTime, onComplete)
  }

  cancel(): void {
    this.animation = null
  }

  isAnimating(): boolean {
    return this.animation !== null
  }

  update(time: number): void {
    if (!this.animation) return
    const progress = THREE.MathUtils.clamp(
      (time - this.animation.startTime) / this.animation.duration,
      0,
      1,
    )
    const eased = 1 - Math.pow(1 - progress, 3)
    this.camera.position.lerpVectors(this.animation.start.position, this.animation.end.position, eased)
    this.controls.target.lerpVectors(this.animation.start.target, this.animation.end.target, eased)
    this.controls.update()
    if (progress >= 1) {
      const onComplete = this.animation.onComplete
      this.animation = null
      onComplete?.()
    }
  }

  private applyPose(pose: CameraPose): void {
    this.camera.position.copy(pose.position)
    this.controls.target.copy(pose.target)
    this.controls.update()
  }
}
