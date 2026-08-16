import type * as THREE from 'three'
import {
  validateProjectionProfile,
  validateProjectionProfileReferences,
  validateReferenceProjectionHeight,
  validateSceneConfiguration,
} from '../lib/parallax-portal/index.ts'
import type {
  PortalConfiguration,
  ProjectionProfile,
  SceneConfiguration,
  ViewportSize,
} from '../lib/parallax-portal/index.ts'
import { PortalInstance } from './PortalInstance.ts'
import type { PortalSceneBundle } from './PortalInstance.ts'
import { PortalRenderPass } from './PortalRenderPass.ts'

export type PortalSceneFactory = (sceneConfiguration: SceneConfiguration) => PortalSceneBundle

export interface PortalRuntimeOptions {
  renderer: THREE.WebGLRenderer
  configurations: readonly PortalConfiguration[]
  profiles: readonly ProjectionProfile[]
  referenceProjectionHeightMeters: number
  sceneConfigurations: readonly SceneConfiguration[]
  createScene: PortalSceneFactory
}

function createUniqueMap<T>(items: readonly T[], getId: (item: T) => string, label: string): Map<string, T> {
  const map = new Map<string, T>()

  for (const item of items) {
    const id = getId(item)

    if (map.has(id)) {
      throw new Error(`Duplicate ${label}: ${id}`)
    }

    map.set(id, item)
  }

  return map
}

export class PortalRuntime {
  private readonly options: PortalRuntimeOptions
  private portals: PortalInstance[] = []
  private renderPass: PortalRenderPass | null = null
  private isInitialized = false

  constructor(options: PortalRuntimeOptions) {
    this.options = options
  }

  initialize(): void {
    if (this.isInitialized) {
      return
    }

    const profiles = createUniqueMap(this.options.profiles, ({ profileId }) => profileId, 'profileId')
    const sceneConfigurations = createUniqueMap(
      this.options.sceneConfigurations,
      ({ sceneId }) => sceneId,
      'sceneId',
    )
    const portalIds = new Set<string>()

    profiles.forEach(validateProjectionProfile)
    validateReferenceProjectionHeight(this.options.referenceProjectionHeightMeters)
    sceneConfigurations.forEach(validateSceneConfiguration)

    const portals: PortalInstance[] = []

    try {
      for (const configuration of this.options.configurations) {
        if (portalIds.has(configuration.portalId)) {
          throw new Error(`Duplicate portalId: ${configuration.portalId}`)
        }
        portalIds.add(configuration.portalId)

        validateProjectionProfileReferences(configuration, profiles)

        const sceneConfiguration = sceneConfigurations.get(configuration.sceneId)

        if (!sceneConfiguration) {
          throw new Error(
            `Portal "${configuration.portalId}" references unknown scene "${configuration.sceneId}".`,
          )
        }

        const element = document.querySelector<HTMLElement>(
          `[data-portal-id="${CSS.escape(configuration.portalId)}"]`,
        )

        if (!element) {
          throw new Error(`Portal element "${configuration.portalId}" was not found.`)
        }

        const sceneBundle = this.options.createScene(sceneConfiguration)

        try {
          portals.push(
            new PortalInstance(
              configuration,
              element,
              profiles,
              sceneConfiguration,
              this.options.referenceProjectionHeightMeters,
              sceneBundle,
            ),
          )
        } catch (error) {
          sceneBundle.dispose()
          throw error
        }
      }

      this.portals = portals
      this.renderPass = new PortalRenderPass(this.options.renderer, this.portals)
      this.isInitialized = true
    } catch (error) {
      portals.forEach((portal) => portal.dispose())
      this.portals = []
      throw error
    }
  }

  render(viewport: ViewportSize): void {
    if (!this.isInitialized || !this.renderPass) {
      throw new Error('PortalRuntime must be initialized before render().')
    }

    this.renderPass.render(viewport)
  }

  dispose(): void {
    this.portals.forEach((portal) => portal.dispose())
    this.portals = []
    this.renderPass = null
    this.isInitialized = false
  }
}
