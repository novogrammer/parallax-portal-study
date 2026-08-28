import { PortalRuntime } from 'parallax-portal'
import { createStandaloneRenderer, StudyRenderer } from './StudyRenderer.ts'
import {
  projectionConfiguration,
  referenceProjectionHeightMeters,
  sceneConfiguration,
} from './studyConfig.ts'
import { createEmptyStudyScene } from './studyScene.ts'
import type { StudySceneBundle } from './studyScene.ts'

export interface StudyAppOptions {
  canvas: HTMLCanvasElement
  forceWebGL: boolean
}

function requirePortalElement(portalId: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(
    `[data-portal-id="${CSS.escape(portalId)}"]`,
  )

  if (!element) {
    throw new Error(`Portal element "${portalId}" was not found.`)
  }

  return element
}

export class StudyApp {
  private readonly options: StudyAppOptions
  private sceneBundle: StudySceneBundle | null = null
  private runtime: PortalRuntime | null = null
  private renderer: StudyRenderer | null = null
  private isInitialized = false

  constructor(options: StudyAppOptions) {
    this.options = options
  }

  initialize(): void {
    if (this.isInitialized) {
      return
    }

    const portalElement = requirePortalElement('layered-composition')
    const renderer = createStandaloneRenderer(this.options.canvas, this.options.forceWebGL)
    const sceneBundle = createEmptyStudyScene()
    let runtime: PortalRuntime | null = null

    try {
      runtime = new PortalRuntime({
        renderer,
        projection: projectionConfiguration,
        referenceProjectionHeightMeters,
        portals: [
          {
            element: portalElement,
            scene: sceneBundle.scene,
            clearColor: sceneBundle.clearColor,
            ...sceneConfiguration,
          },
        ],
      })

      this.sceneBundle = sceneBundle
      this.runtime = runtime
      this.renderer = new StudyRenderer(renderer, runtime)
      this.isInitialized = true
    } catch (error) {
      runtime?.dispose()
      sceneBundle.dispose()
      if (renderer.initialized) {
        renderer.dispose()
      }
      throw error
    }
  }

  async start(): Promise<void> {
    if (!this.isInitialized || !this.renderer) {
      throw new Error('StudyApp must be initialized before start().')
    }

    try {
      await this.renderer.start()
      window.addEventListener('pagehide', this.handlePageHide, { once: true })
    } catch (error) {
      this.dispose()
      throw error
    }
  }

  dispose(): void {
    window.removeEventListener('pagehide', this.handlePageHide)
    this.renderer?.dispose()
    this.runtime?.dispose()
    this.sceneBundle?.dispose()
    this.renderer = null
    this.runtime = null
    this.sceneBundle = null
    this.isInitialized = false
  }

  private readonly handlePageHide = (): void => {
    this.dispose()
  }
}
