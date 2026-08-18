import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { PortalRuntime } from '../src/lib/parallax-portal/index.ts'
import { PortalInstance } from '../src/lib/parallax-portal/PortalInstance.ts'

const projection = {
  referenceFovY: THREE.MathUtils.degToRad(42),
}

function createRuntime(camera = {}) {
  return new PortalRuntime({
    renderer: {},
    projection,
    referenceProjectionHeightMeters: 3,
    portals: [
      {
        element: {},
        scene: new THREE.Scene(),
        clearColor: 0x000000,
        cameraTopY: 3,
        cameraBottomY: 0,
        ...camera,
      },
    ],
  })
}

test('camera clipping planes accept defaults and valid portal overrides', () => {
  const defaultRuntime = createRuntime()
  const configuredRuntime = createRuntime({ cameraNear: 0.5, cameraFar: 500 })

  defaultRuntime.dispose()
  configuredRuntime.dispose()
})

test('camera clipping plane defaults are applied to the generated camera', () => {
  const portal = new PortalInstance(
    {
      element: {
        dataset: {},
        getBoundingClientRect: () => ({
          left: 0,
          top: 0,
          width: 100,
          height: 100,
        }),
      },
      scene: new THREE.Scene(),
      clearColor: 0x000000,
      cameraTopY: 3,
      cameraBottomY: 0,
    },
    3,
    projection,
  )

  const renderData = portal.getRenderData({ width: 100, height: 100 })

  assert.ok(renderData)
  assert.equal(renderData.camera.near, 0.1)
  assert.equal(renderData.camera.far, 1000)
})

test('camera clipping planes reject invalid portal configuration', () => {
  assert.throws(() => createRuntime({ cameraNear: 0 }), /cameraNear/)
  assert.throws(() => createRuntime({ cameraFar: Number.NaN }), /cameraFar/)
  assert.throws(
    () => createRuntime({ cameraNear: 10, cameraFar: 10 }),
    /cameraFar/,
  )
})
