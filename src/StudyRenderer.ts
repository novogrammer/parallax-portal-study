import * as THREE from 'three/webgpu'
import type {
  PortalRuntime,
  ViewportSize,
} from 'parallax-portal'

const MAX_DEVICE_PIXEL_RATIO = 2

export class StudyRenderer {
  private readonly renderer: THREE.WebGPURenderer
  private readonly runtime: PortalRuntime
  private isStarted = false

  constructor(renderer: THREE.WebGPURenderer, runtime: PortalRuntime) {
    this.renderer = renderer
    this.runtime = runtime
  }

  async start(): Promise<void> {
    if (this.isStarted) {
      return
    }

    this.isStarted = true
    window.addEventListener('resize', this.resize, { passive: true })
    this.resize()

    try {
      await this.renderer.setAnimationLoop(this.render)
      this.renderer.domElement.dataset.rendererBackend =
        'isWebGPUBackend' in this.renderer.backend ? 'webgpu' : 'webgl2'
    } catch (error) {
      window.removeEventListener('resize', this.resize)
      this.isStarted = false
      throw error
    }
  }

  dispose(): void {
    window.removeEventListener('resize', this.resize)
    this.isStarted = false

    if (this.renderer.initialized) {
      void this.renderer.setAnimationLoop(null)
      this.renderer.dispose()
    }

    delete this.renderer.domElement.dataset.rendererBackend
  }

  private readonly resize = (): void => {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_DEVICE_PIXEL_RATIO))
    this.renderer.setSize(window.innerWidth, window.innerHeight, false)
  }

  private readonly render = (): void => {
    if (!this.isStarted) {
      return
    }

    const viewport: ViewportSize = {
      width: window.innerWidth,
      height: window.innerHeight,
    }

    if (viewport.width <= 0 || viewport.height <= 0) {
      return
    }

    this.renderer.setScissorTest(false)
    this.renderer.setViewport(0, 0, viewport.width, viewport.height)
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.clear(true, true, true)
    this.runtime.render(viewport)
  }
}

export function createStandaloneRenderer(
  canvas: HTMLCanvasElement,
  forceWebGL: boolean,
): THREE.WebGPURenderer {
  const renderer = new THREE.WebGPURenderer({
    canvas,
    alpha: true,
    antialias: true,
    forceWebGL,
  })
  renderer.autoClear = false
  renderer.setClearColor(0x000000, 0)
  return renderer
}
