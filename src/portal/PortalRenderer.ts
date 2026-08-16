import * as THREE from 'three'
import type { ViewportSize } from '../lib/parallax-portal/index.ts'
import type { PortalInstance } from './PortalInstance.ts'

const MAX_DEVICE_PIXEL_RATIO = 2

export class PortalRenderer {
  private readonly renderer: THREE.WebGLRenderer
  private readonly portals: readonly PortalInstance[]
  private animationFrameId: number | null = null
  private isStarted = false

  constructor(canvas: HTMLCanvasElement, portals: readonly PortalInstance[]) {
    this.portals = portals
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    })
    this.renderer.autoClear = false
    this.renderer.setClearColor(0x000000, 0)
  }

  start(): void {
    if (this.isStarted) {
      return
    }

    this.isStarted = true
    window.addEventListener('resize', this.resize, { passive: true })
    this.resize()
    this.animationFrameId = window.requestAnimationFrame(this.render)
  }

  dispose(): void {
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }

    window.removeEventListener('resize', this.resize)
    this.isStarted = false
    this.renderer.dispose()
  }

  private readonly resize = (): void => {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_DEVICE_PIXEL_RATIO))
    this.renderer.setSize(window.innerWidth, window.innerHeight, false)
  }

  private readonly render = (): void => {
    if (!this.isStarted) {
      return
    }

    this.animationFrameId = window.requestAnimationFrame(this.render)

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
    this.renderer.setScissorTest(true)

    for (const portal of this.portals) {
      const renderData = portal.getRenderData(viewport)

      if (!renderData) {
        continue
      }

      const { scissor } = renderData
      this.renderer.setViewport(0, 0, viewport.width, viewport.height)
      this.renderer.setScissor(scissor.x, scissor.y, scissor.width, scissor.height)
      this.renderer.setClearColor(renderData.clearColor, 1)
      this.renderer.clear(true, true, true)
      this.renderer.render(renderData.scene, renderData.camera)
    }
  }
}
