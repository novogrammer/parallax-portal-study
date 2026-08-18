import * as THREE from 'three'
import {
  calculatePortalGeometry,
  calculatePortalIntersection,
  calculateWebGlScissor,
} from './geometry.ts'
import type {
  ProjectionProfile,
  Rect,
  ViewportSize,
  WebGlScissorRect,
} from './types.ts'
import type { PortalDefinition } from './PortalRuntime.ts'

export interface PortalRenderData {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  clearColor: THREE.ColorRepresentation
  scissor: WebGlScissorRect
}

interface CameraState {
  x: number
  y: number
  z: number
  fov: number
  aspect: number
}

const DEFAULT_CAMERA_NEAR = 0.1
const DEFAULT_CAMERA_FAR = 1000

function resolveCameraClippingPlanes(definition: PortalDefinition): {
  near: number
  far: number
} {
  const near = definition.cameraNear ?? DEFAULT_CAMERA_NEAR
  const far = definition.cameraFar ?? DEFAULT_CAMERA_FAR

  if (!Number.isFinite(near) || near <= 0) {
    throw new RangeError('cameraNear must be a finite value greater than 0.')
  }

  if (!Number.isFinite(far) || far <= near) {
    throw new RangeError('cameraFar must be finite and greater than cameraNear.')
  }

  return { near, far }
}

export class PortalInstance {
  private readonly definition: PortalDefinition
  private readonly referenceProjectionHeightMeters: number
  private readonly camera: THREE.PerspectiveCamera
  private activeProjection: ProjectionProfile
  private lastValidCameraState: CameraState | null = null
  private hasRuntimeGeometryError = false

  constructor(
    definition: PortalDefinition,
    referenceProjectionHeightMeters: number,
    initialProjection: ProjectionProfile,
  ) {
    const { near, far } = resolveCameraClippingPlanes(definition)

    this.definition = definition
    this.referenceProjectionHeightMeters = referenceProjectionHeightMeters
    this.activeProjection = initialProjection
    this.camera = new THREE.PerspectiveCamera(42, 1, near, far)
    this.camera.position.set(0, 0, 1)
    this.camera.rotation.set(0, 0, 0)
  }

  setProjection(projection: ProjectionProfile): void {
    this.activeProjection = projection
    this.lastValidCameraState = null
    this.hasRuntimeGeometryError = false
  }

  getRenderData(viewport: ViewportSize): PortalRenderData | null {
    const domRect = this.definition.element.getBoundingClientRect()
    const portalRect: Rect = {
      x: domRect.left,
      y: domRect.top,
      width: domRect.width,
      height: domRect.height,
    }

    let intersection: Rect | null

    try {
      intersection = calculatePortalIntersection(portalRect, viewport)
    } catch (error) {
      this.reportRuntimeGeometryError(error)
      return null
    }

    if (!intersection) {
      return null
    }

    try {
      const geometry = calculatePortalGeometry(
        portalRect,
        viewport,
        this.activeProjection,
        this.definition,
        this.referenceProjectionHeightMeters,
      )

      if (!geometry) {
        return null
      }

      const nextState: CameraState = {
        x: 0,
        y: geometry.cameraY,
        z: geometry.referenceCameraDistance,
        fov: THREE.MathUtils.radToDeg(geometry.renderCameraFovY),
        aspect: viewport.width / viewport.height,
      }

      if (!Number.isFinite(nextState.fov) || nextState.fov <= 0 || nextState.fov >= 180) {
        throw new RangeError('Derived camera FOV must be finite and between 0 and 180 degrees.')
      }

      this.applyCameraState(nextState)
      this.lastValidCameraState = nextState
      this.hasRuntimeGeometryError = false
    } catch (error) {
      this.reportRuntimeGeometryError(error)

      if (!this.lastValidCameraState) {
        return null
      }

      this.applyCameraState(this.lastValidCameraState)
    }

    return {
      scene: this.definition.scene,
      camera: this.camera,
      clearColor: this.definition.clearColor,
      scissor: calculateWebGlScissor(intersection, viewport.height),
    }
  }

  private applyCameraState(state: CameraState): void {
    this.camera.position.set(state.x, state.y, state.z)
    this.camera.rotation.set(0, 0, 0)
    this.camera.fov = state.fov
    this.camera.aspect = state.aspect
    this.camera.updateProjectionMatrix()
  }

  private reportRuntimeGeometryError(error: unknown): void {
    if (this.hasRuntimeGeometryError) {
      return
    }

    this.hasRuntimeGeometryError = true
    const portalId = this.definition.element.dataset.portalId
    const label = portalId ? `Portal "${portalId}"` : 'Portal'
    console.error(`${label} has invalid runtime geometry.`, error)
  }
}
