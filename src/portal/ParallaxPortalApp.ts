import type {
  PortalConfiguration,
  ProjectionProfile,
  SceneConfiguration,
} from '../lib/parallax-portal/index.ts'
import { createStandaloneRenderer, PortalRenderer } from './PortalRenderer.ts'
import { PortalRuntime } from './PortalRuntime.ts'
import { createStudyScene } from './studyScene.ts'

export interface ParallaxPortalAppOptions {
  canvas: HTMLCanvasElement
  configurations: readonly PortalConfiguration[]
  profiles: readonly ProjectionProfile[]
  referenceProjectionHeightMeters: number
  sceneConfigurations: readonly SceneConfiguration[]
}

export class ParallaxPortalApp {
  private readonly options: ParallaxPortalAppOptions
  private runtime: PortalRuntime | null = null
  private renderer: PortalRenderer | null = null
  private isInitialized = false

  constructor(options: ParallaxPortalAppOptions) {
    this.options = options
  }

  initialize(): void {
    if (this.isInitialized) {
      return
    }

    const webGlRenderer = createStandaloneRenderer(this.options.canvas)
    const runtime = new PortalRuntime({
      renderer: webGlRenderer,
      configurations: this.options.configurations,
      profiles: this.options.profiles,
      referenceProjectionHeightMeters: this.options.referenceProjectionHeightMeters,
      sceneConfigurations: this.options.sceneConfigurations,
      createScene: createStudyScene,
    })

    try {
      runtime.initialize()
      this.runtime = runtime
      this.renderer = new PortalRenderer(webGlRenderer, runtime)
      this.isInitialized = true
    } catch (error) {
      runtime.dispose()
      webGlRenderer.dispose()
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
    this.runtime?.dispose()
    this.renderer = null
    this.runtime = null
    this.isInitialized = false
  }

  private readonly handlePageHide = (): void => {
    this.dispose()
  }
}
