import { PortalRuntime } from 'parallax-portal'
import { createStandaloneRenderer, StudyRenderer } from './StudyRenderer.ts'
import {
  coolSceneConfiguration,
  projectionConfiguration,
  referenceProjectionHeightMeters,
  warmSceneConfiguration,
} from './studyConfig.ts'
import { createDomPlaneStudyScene } from './studyScene.ts'
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
    const renderer = createStandaloneRenderer(this.options.canvas, this.options.forceWebGL)
    const sceneBundles: StudySceneBundle[] = []
    let runtime: PortalRuntime | null = null

    try {
      const warmScene = createDomPlaneStudyScene({
        portalElement: warmElement,
        clearColor: 0x2c160d,
        projectionConfiguration,
        referenceProjectionHeightMeters,
        sceneConfiguration: warmSceneConfiguration,
      })
      sceneBundles.push(warmScene)
      const coolScene = createDomPlaneStudyScene({
        portalElement: coolElement,
        clearColor: 0x071c2c,
        projectionConfiguration,
        referenceProjectionHeightMeters,
        sceneConfiguration: coolSceneConfiguration,
      })
      sceneBundles.push(coolScene)

      runtime = new PortalRuntime({
        renderer,
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
      this.renderer = new StudyRenderer(
        renderer,
        runtime,
        () => sceneBundles.forEach((sceneBundle) => sceneBundle.updateLayout()),
      )
      this.isInitialized = true
    } catch (error) {
      runtime?.dispose()
      sceneBundles.forEach((sceneBundle) => sceneBundle.dispose())
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
      await Promise.all(this.sceneBundles.map((sceneBundle) => sceneBundle.ready))
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
