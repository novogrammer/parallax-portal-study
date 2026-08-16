import * as THREE from 'three'
import {
  calculatePortalGeometry,
  calculatePortalIntersection,
  calculateWebGlScissor,
} from '../lib/parallax-portal/index.ts'
import type {
  PortalConfiguration,
  ProjectionProfile,
  Rect,
  ResponsiveVariant,
  SceneConfiguration,
  ViewportSize,
  WebGlScissorRect,
} from '../lib/parallax-portal/index.ts'
import { ResponsiveVariantController } from './ResponsiveVariantController.ts'
import type { StudySceneBundle } from './studyScene.ts'

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

export class PortalInstance {
  private readonly configuration: PortalConfiguration
  private readonly element: HTMLElement
  private readonly profiles: ReadonlyMap<string, ProjectionProfile>
  private readonly sceneConfiguration: SceneConfiguration
  private readonly referenceProjectionHeightMeters: number
  private readonly sceneBundle: StudySceneBundle
  private readonly camera: THREE.PerspectiveCamera
  private readonly responsiveController: ResponsiveVariantController
  private activeProfile: ProjectionProfile
  private lastValidCameraState: CameraState | null = null
  private hasRuntimeGeometryError = false

  constructor(
    configuration: PortalConfiguration,
    element: HTMLElement,
    profiles: ReadonlyMap<string, ProjectionProfile>,
    sceneConfiguration: SceneConfiguration,
    referenceProjectionHeightMeters: number,
    sceneBundle: StudySceneBundle,
  ) {
    this.configuration = configuration
    this.element = element
    this.profiles = profiles
    this.sceneConfiguration = sceneConfiguration
    this.referenceProjectionHeightMeters = referenceProjectionHeightMeters
    this.sceneBundle = sceneBundle
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
    this.camera.position.set(0, 0, 1)
    this.camera.rotation.set(0, 0, 0)

    this.responsiveController = new ResponsiveVariantController(
      configuration.responsiveVariants.rules,
      configuration.responsiveVariants.otherwise,
      this.applyResponsiveVariant,
    )

    const initialVariant = this.responsiveController.getCurrentVariant()
    this.activeProfile = this.requireProfile(initialVariant.projectionProfileId)
  }

  getRenderData(viewport: ViewportSize): PortalRenderData | null {
    const domRect = this.element.getBoundingClientRect()
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
        this.activeProfile,
        this.sceneConfiguration,
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
      scene: this.sceneBundle.scene,
      camera: this.camera,
      clearColor: this.sceneBundle.clearColor,
      scissor: calculateWebGlScissor(intersection, viewport.height),
    }
  }

  dispose(): void {
    this.responsiveController.dispose()
    this.sceneBundle.dispose()
  }

  private readonly applyResponsiveVariant = (variant: ResponsiveVariant): void => {
    this.activeProfile = this.requireProfile(variant.projectionProfileId)
    this.lastValidCameraState = null
    this.hasRuntimeGeometryError = false
  }

  private requireProfile(profileId: string): ProjectionProfile {
    const profile = this.profiles.get(profileId)

    if (!profile) {
      throw new Error(`Portal "${this.configuration.portalId}" references unknown profile "${profileId}".`)
    }

    return profile
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
    console.error(`Portal "${this.configuration.portalId}" has invalid runtime geometry.`, error)
  }
}
