import type * as THREE from 'three'
import {
  validateProjectionProfile,
  validateReferenceProjectionHeight,
  validateSceneConfiguration,
} from './geometry.ts'
import type {
  ProjectionProfile,
  ResponsiveProjectionConfiguration,
  SceneConfiguration,
  ViewportSize,
} from './types.ts'
import { PortalInstance } from './PortalInstance.ts'
import { PortalRenderPass } from './PortalRenderPass.ts'
import { selectResponsiveProjection } from './responsive.ts'

export interface PortalDefinition extends SceneConfiguration {
  element: HTMLElement
  scene: THREE.Scene
  clearColor: THREE.ColorRepresentation
  cameraNear?: number
  cameraFar?: number
}

export interface PortalRuntimeOptions {
  renderer: THREE.WebGLRenderer
  projection: ResponsiveProjectionConfiguration
  referenceProjectionHeightMeters: number
  portals: readonly PortalDefinition[]
}

export class PortalRuntime {
  private readonly projection: ResponsiveProjectionConfiguration
  private mediaQueries: readonly MediaQueryList[] = []
  private currentProjection: ProjectionProfile
  private portals: PortalInstance[] = []
  private renderPass: PortalRenderPass | null = null

  constructor(options: PortalRuntimeOptions) {
    validateReferenceProjectionHeight(options.referenceProjectionHeightMeters)
    options.projection.rules.forEach(validateProjectionProfile)
    validateProjectionProfile(options.projection.otherwise)
    options.portals.forEach(validateSceneConfiguration)

    this.projection = options.projection
    this.currentProjection = options.projection.otherwise
    this.mediaQueries = options.projection.rules.map(({ query }) => window.matchMedia(query))

    try {
      this.currentProjection = this.selectCurrentProjection()
      this.portals = options.portals.map(
        (definition) => new PortalInstance(
          definition,
          options.referenceProjectionHeightMeters,
          this.currentProjection,
        ),
      )
      this.renderPass = new PortalRenderPass(options.renderer, this.portals)

      for (const mediaQuery of this.mediaQueries) {
        mediaQuery.addEventListener('change', this.handleMediaQueryChange)
      }
    } catch (error) {
      this.removeMediaQueryListeners()
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
    this.removeMediaQueryListeners()
    this.mediaQueries = []
    this.portals = []
    this.renderPass = null
  }

  private selectCurrentProjection(): ProjectionProfile {
    return selectResponsiveProjection(
      this.projection.rules,
      this.mediaQueries.map(({ matches }) => matches),
      this.projection.otherwise,
    )
  }

  private removeMediaQueryListeners(): void {
    for (const mediaQuery of this.mediaQueries) {
      mediaQuery.removeEventListener('change', this.handleMediaQueryChange)
    }
  }

  private readonly handleMediaQueryChange = (): void => {
    const nextProjection = this.selectCurrentProjection()

    if (nextProjection.referenceFovY === this.currentProjection.referenceFovY) {
      return
    }

    this.currentProjection = nextProjection

    for (const portal of this.portals) {
      portal.setProjection(nextProjection)
    }
  }
}
