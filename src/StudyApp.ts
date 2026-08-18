import { PortalRuntime } from 'parallax-portal'
import { createStandaloneRenderer, StudyRenderer } from './StudyRenderer.ts'
import {
  coolSceneConfiguration,
  projectionConfiguration,
  referenceProjectionHeightMeters,
  warmSceneConfiguration,
} from './studyConfig.ts'
import {
  createCoolStudyScene,
  createWarmStudyScene,
} from './studyScene.ts'
import type { StudySceneBundle } from './studyScene.ts'

export interface StudyAppOptions {
  canvas: HTMLCanvasElement
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
  private sceneBundles: StudySceneBundle[] = []
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

    const warmElement = requirePortalElement('warm-depth')
    const coolElement = requirePortalElement('cool-depth')
    const webGlRenderer = createStandaloneRenderer(this.options.canvas)
    const sceneBundles: StudySceneBundle[] = []
    let runtime: PortalRuntime | null = null

    try {
      const warmScene = createWarmStudyScene(warmSceneConfiguration)
      sceneBundles.push(warmScene)
      const coolScene = createCoolStudyScene(coolSceneConfiguration)
      sceneBundles.push(coolScene)

      runtime = new PortalRuntime({
        renderer: webGlRenderer,
        projection: projectionConfiguration,
        referenceProjectionHeightMeters,
        portals: [
          {
            element: warmElement,
            scene: warmScene.scene,
            clearColor: warmScene.clearColor,
            ...warmSceneConfiguration,
          },
          {
            element: coolElement,
            scene: coolScene.scene,
            clearColor: coolScene.clearColor,
            ...coolSceneConfiguration,
          },
        ],
      })

      this.sceneBundles = sceneBundles
      this.runtime = runtime
      this.renderer = new StudyRenderer(webGlRenderer, runtime)
      this.isInitialized = true
    } catch (error) {
      runtime?.dispose()
      sceneBundles.forEach((sceneBundle) => sceneBundle.dispose())
      webGlRenderer.dispose()
      throw error
    }
  }

  start(): void {
    if (!this.isInitialized || !this.renderer) {
      throw new Error('StudyApp must be initialized before start().')
    }

    this.renderer.start()
    window.addEventListener('pagehide', this.handlePageHide, { once: true })
  }

  dispose(): void {
    window.removeEventListener('pagehide', this.handlePageHide)
    this.renderer?.dispose()
    this.runtime?.dispose()
    this.sceneBundles.forEach((sceneBundle) => sceneBundle.dispose())
    this.renderer = null
    this.runtime = null
    this.sceneBundles = []
    this.isInitialized = false
  }

  private readonly handlePageHide = (): void => {
    this.dispose()
  }
}
