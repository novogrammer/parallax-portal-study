import assert from 'node:assert/strict'
import test from 'node:test'
import { StudyRenderer } from '../src/studies/layered-composition/StudyRenderer.ts'

class FakeRenderer {
  initialized = true
  backend = { isWebGPUBackend: true }
  domElement = { dataset: {} }
  animationLoop = null
  sizes = []

  async setAnimationLoop(callback) { this.animationLoop = callback }
  setPixelRatio() {}
  setSize(width, height, updateStyle) { this.sizes.push([width, height, updateStyle]) }
  setScissorTest() {}
  setViewport() {}
  setClearColor() {}
  clear() {}
  dispose() {}
}

test('Layered Composition recalculates layout on start and resize', async () => {
  const listeners = new Map()
  globalThis.window = {
    devicePixelRatio: 1,
    innerWidth: 1280,
    innerHeight: 720,
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type) => listeners.delete(type),
  }

  try {
    const renderer = new FakeRenderer()
    let layoutUpdates = 0
    let rendererReadyCalls = 0
    const studyRenderer = new StudyRenderer(
      renderer,
      { render: () => {} },
      () => { layoutUpdates += 1 },
      (initializedRenderer) => {
        assert.equal(initializedRenderer, renderer)
        rendererReadyCalls += 1
      },
    )

    await studyRenderer.start()
    assert.equal(layoutUpdates, 1)
    assert.equal(rendererReadyCalls, 1)
    assert.deepEqual(renderer.sizes.at(-1), [1280, 720, false])

    window.innerWidth = 375
    window.innerHeight = 667
    listeners.get('resize')()

    assert.equal(layoutUpdates, 2)
    assert.deepEqual(renderer.sizes.at(-1), [375, 667, false])

    studyRenderer.dispose()
    assert.equal(listeners.has('resize'), false)
  } finally {
    delete globalThis.window
  }
})
