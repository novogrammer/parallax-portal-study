import { validateProjectionProfile } from './geometry.ts'
import { PortalInstance } from './PortalInstance.ts'
import { PortalRenderer } from './PortalRenderer.ts'
import { createStudyScene } from './studyScene.ts'
import type { PortalConfiguration, ProjectionProfile, SceneVariant } from './types.ts'

export interface ParallaxPortalAppOptions {
  canvas: HTMLCanvasElement
  configurations: readonly PortalConfiguration[]
  profiles: readonly ProjectionProfile[]
  sceneVariants: readonly SceneVariant[]
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

export class ParallaxPortalApp {
  private readonly options: ParallaxPortalAppOptions
  private portals: PortalInstance[] = []
  private renderer: PortalRenderer | null = null
  private isInitialized = false

  constructor(options: ParallaxPortalAppOptions) {
    this.options = options
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    const profiles = createUniqueMap(this.options.profiles, ({ profileId }) => profileId, 'profileId')
    const sceneVariants = createUniqueMap(
      this.options.sceneVariants,
      ({ sceneVariantId }) => sceneVariantId,
      'sceneVariantId',
    )
    const portalIds = new Set<string>()

    profiles.forEach(validateProjectionProfile)

    try {
      this.portals = this.options.configurations.map((configuration) => {
        if (portalIds.has(configuration.portalId)) {
          throw new Error(`Duplicate portalId: ${configuration.portalId}`)
        }
        portalIds.add(configuration.portalId)

        const element = document.querySelector<HTMLElement>(
          `[data-portal-id="${CSS.escape(configuration.portalId)}"]`,
        )

        if (!element) {
          throw new Error(`Portal element "${configuration.portalId}" was not found.`)
        }

        const sceneBundle = createStudyScene(configuration.sceneId)

        try {
          return new PortalInstance(
            configuration,
            element,
            profiles,
            sceneVariants,
            sceneBundle,
          )
        } catch (error) {
          sceneBundle.dispose()
          throw error
        }
      })

      this.renderer = new PortalRenderer(this.options.canvas, this.portals)
      this.isInitialized = true
    } catch (error) {
      this.portals.forEach((portal) => portal.dispose())
      this.portals = []
      throw error
    }
  }

  start(): void {
    if (!this.isInitialized || !this.renderer) {
      throw new Error('ParallaxPortalApp must be initialized before start().')
    }

    this.renderer.start()
    window.addEventListener('pagehide', this.handlePageHide, { once: true })
  }

  dispose(): void {
    window.removeEventListener('pagehide', this.handlePageHide)
    this.renderer?.dispose()
    this.portals.forEach((portal) => portal.dispose())
    this.renderer = null
    this.portals = []
    this.isInitialized = false
  }

  private readonly handlePageHide = (): void => {
    this.dispose()
  }
}
