import type * as THREE from 'three'
import {
  validateProjectionProfile,
  validateReferenceProjectionHeight,
  validateSceneConfiguration,
} from '../lib/parallax-portal/index.ts'
import type {
  ProjectionProfile,
  ResponsiveProjectionConfiguration,
  ViewportSize,
} from '../lib/parallax-portal/index.ts'
import { PortalInstance } from './PortalInstance.ts'
import type { PortalDefinition } from './PortalInstance.ts'
import { PortalRenderPass } from './PortalRenderPass.ts'
import { ResponsiveProjectionController } from './ResponsiveProjectionController.ts'

export type { PortalDefinition } from './PortalInstance.ts'

export interface PortalRuntimeOptions {
  renderer: THREE.WebGLRenderer
  projection: ResponsiveProjectionConfiguration
  referenceProjectionHeightMeters: number
  portals: readonly PortalDefinition[]
}

export class PortalRuntime {
  private portals: PortalInstance[] = []
  private renderPass: PortalRenderPass | null = null
  private responsiveController: ResponsiveProjectionController | null = null

  constructor(options: PortalRuntimeOptions) {
    validateReferenceProjectionHeight(options.referenceProjectionHeightMeters)
    options.projection.rules.forEach(validateProjectionProfile)
    validateProjectionProfile(options.projection.otherwise)
    options.portals.forEach(validateSceneConfiguration)

    const responsiveController = new ResponsiveProjectionController(
      options.projection,
      this.applyProjection,
    )

    try {
      const initialProjection = responsiveController.getCurrentProjection()
      this.portals = options.portals.map(
        (definition) => new PortalInstance(
          definition,
          options.referenceProjectionHeightMeters,
          initialProjection,
        ),
      )
      this.renderPass = new PortalRenderPass(options.renderer, this.portals)
      this.responsiveController = responsiveController
    } catch (error) {
      responsiveController.dispose()
      this.portals = []
      throw error
    }
  }

  render(viewport: ViewportSize): void {
    if (!this.renderPass) {
      throw new Error('PortalRuntime cannot render after dispose().')
    }

    this.renderPass.render(viewport)
  }

  dispose(): void {
    this.responsiveController?.dispose()
    this.responsiveController = null
    this.portals = []
    this.renderPass = null
  }

  private readonly applyProjection = (projection: ProjectionProfile): void => {
    for (const portal of this.portals) {
      portal.setProjection(projection)
    }
  }
}
