import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { PortalRenderPass } from '../src/portal/PortalRenderPass.ts'

class FakeRenderer {
  autoClear = true
  viewport = new THREE.Vector4(2, 3, 640, 480)
  scissor = new THREE.Vector4(4, 5, 320, 240)
  scissorTest = false
  clearColor = new THREE.Color(0x123456)
  clearAlpha = 0.25
  renderTarget = { name: 'host-target' }
  activeCubeFace = 2
  activeMipmapLevel = 1
  calls = []
  throwOnRender = false

  getViewport(target) {
    return target.copy(this.viewport)
  }

  setViewport(x, y, width, height) {
    this.viewport.copy(x instanceof THREE.Vector4 ? x : new THREE.Vector4(x, y, width, height))
    this.calls.push(['viewport', ...this.viewport.toArray()])
  }

  getScissor(target) {
    return target.copy(this.scissor)
  }

  setScissor(x, y, width, height) {
    this.scissor.copy(x instanceof THREE.Vector4 ? x : new THREE.Vector4(x, y, width, height))
    this.calls.push(['scissor', ...this.scissor.toArray()])
  }

  getScissorTest() {
    return this.scissorTest
  }

  setScissorTest(enabled) {
    this.scissorTest = enabled
    this.calls.push(['scissorTest', enabled])
  }

  getClearColor(target) {
    return target.copy(this.clearColor)
  }

  getClearAlpha() {
    return this.clearAlpha
  }

  setClearColor(color, alpha) {
    this.clearColor.set(color)
    this.clearAlpha = alpha
    this.calls.push(['clearColor', this.clearColor.getHex(), alpha])
  }

  getRenderTarget() {
    return this.renderTarget
  }

  getActiveCubeFace() {
    return this.activeCubeFace
  }

  getActiveMipmapLevel() {
    return this.activeMipmapLevel
  }

  setRenderTarget(target, activeCubeFace = 0, activeMipmapLevel = 0) {
    this.renderTarget = target
    this.activeCubeFace = activeCubeFace
    this.activeMipmapLevel = activeMipmapLevel
    this.calls.push(['renderTarget', target, activeCubeFace, activeMipmapLevel])
  }

  clear(color, depth, stencil) {
    this.calls.push(['clear', color, depth, stencil])
  }

  render(scene, camera) {
    this.calls.push(['render', scene, camera])

    if (this.throwOnRender) {
      throw new Error('render failed')
    }
  }
}

function createPortal() {
  return {
    getRenderData: () => ({
      scene: { name: 'portal-scene' },
      camera: { name: 'portal-camera' },
      clearColor: 0xabcdef,
      scissor: { x: 10, y: 20, width: 300, height: 400 },
    }),
  }
}

function captureState(renderer) {
  return {
    autoClear: renderer.autoClear,
    viewport: renderer.viewport.toArray(),
    scissor: renderer.scissor.toArray(),
    scissorTest: renderer.scissorTest,
    clearColor: renderer.clearColor.getHex(),
    clearAlpha: renderer.clearAlpha,
    renderTarget: renderer.renderTarget,
    activeCubeFace: renderer.activeCubeFace,
    activeMipmapLevel: renderer.activeMipmapLevel,
  }
}

test('render pass draws portals to the canvas and restores borrowed renderer state', () => {
  const renderer = new FakeRenderer()
  const initialState = captureState(renderer)
  const renderPass = new PortalRenderPass(renderer, [createPortal()])

  renderPass.render({ width: 1200, height: 800 })

  assert.deepEqual(captureState(renderer), initialState)
  assert.equal(renderer.calls.filter(([name]) => name === 'clear').length, 1)
  assert.equal(renderer.calls.filter(([name]) => name === 'render').length, 1)
  assert.deepEqual(renderer.calls.find(([name, target]) => name === 'renderTarget' && target === null), [
    'renderTarget',
    null,
    0,
    0,
  ])
})

test('render pass restores borrowed renderer state when portal rendering throws', () => {
  const renderer = new FakeRenderer()
  const initialState = captureState(renderer)
  const renderPass = new PortalRenderPass(renderer, [createPortal()])
  renderer.throwOnRender = true

  assert.throws(() => renderPass.render({ width: 1200, height: 800 }), /render failed/)
  assert.deepEqual(captureState(renderer), initialState)
})
