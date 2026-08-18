import assert from 'node:assert/strict'
import test from 'node:test'
import { StudyRenderer } from '../src/StudyRenderer.ts'

class FakeWebGpuRenderer {
  initialized = true
  backend = { isWebGPUBackend: true }
  domElement = { dataset: {} }
  animationLoop = null
  animationLoopCalls = []
  calls = []
  disposed = false
  failToStart = false

  async setAnimationLoop(callback) {
    this.animationLoopCalls.push(callback)

    if (this.failToStart) {
      throw new Error('renderer initialization failed')
    }

    this.animationLoop = callback
  }

  setPixelRatio(value) { this.calls.push(['pixelRatio', value]) }
  setSize(width, height, updateStyle) { this.calls.push(['size', width, height, updateStyle]) }
  setScissorTest(value) { this.calls.push(['scissorTest', value]) }
  setViewport(x, y, width, height) { this.calls.push(['viewport', x, y, width, height]) }
  setClearColor(color, alpha) { this.calls.push(['clearColor', color, alpha]) }
  clear(color, depth, stencil) { this.calls.push(['clear', color, depth, stencil]) }
  dispose() { this.disposed = true }
}

test.beforeEach(() => {
  globalThis.window = {
    devicePixelRatio: 3,
    innerWidth: 1200,
    innerHeight: 800,
    addEventListener: () => {},
    removeEventListener: () => {},
  }
})

test.afterEach(() => {
  delete globalThis.window
})

test('StudyRenderer uses WebGPURenderer setAnimationLoop and stops it on dispose', async () => {
  const renderer = new FakeWebGpuRenderer()
  const renderedViewports = []
  const runtime = { render: (viewport) => renderedViewports.push(viewport) }
  const studyRenderer = new StudyRenderer(renderer, runtime)

  await studyRenderer.start()

  assert.equal(typeof renderer.animationLoop, 'function')
  assert.equal(renderer.domElement.dataset.rendererBackend, 'webgpu')
  assert.deepEqual(renderer.calls.slice(0, 2), [
    ['pixelRatio', 2],
    ['size', 1200, 800, false],
  ])

  renderer.animationLoop()

  assert.deepEqual(renderedViewports, [{ width: 1200, height: 800 }])
  assert.ok(renderer.calls.some((call) => call[0] === 'clear'))

  studyRenderer.dispose()

  assert.equal(renderer.animationLoopCalls.at(-1), null)
  assert.equal(renderer.disposed, true)
  assert.equal(renderer.domElement.dataset.rendererBackend, undefined)
})

test('StudyRenderer surfaces setAnimationLoop initialization failures', async () => {
  const renderer = new FakeWebGpuRenderer()
  renderer.initialized = false
  renderer.failToStart = true
  const studyRenderer = new StudyRenderer(renderer, { render: () => {} })

  await assert.rejects(() => studyRenderer.start(), /renderer initialization failed/)

  studyRenderer.dispose()
  assert.equal(renderer.disposed, false)
})
