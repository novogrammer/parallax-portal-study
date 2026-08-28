import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateReferenceCameraDistance } from 'parallax-portal'
import {
  calculateDomPlaneLayout,
  parseDomPlaneZ,
} from '../src/studies/layered-composition/domPlaneLayout.ts'

const sceneConfiguration = {
  cameraTopY: 7.5,
  cameraBottomY: 0,
}

const portalRect = {
  x: 0,
  y: -500,
  width: 1280,
  height: 1800,
}

const elementRect = {
  x: 256,
  y: 320,
  width: 160,
  height: 160,
}

const referenceProjectionHeightMeters = 3
const wideCameraDistance = calculateReferenceCameraDistance(
  { referenceFovY: 42 * Math.PI / 180 },
  referenceProjectionHeightMeters,
)

function createLayout(z, overrides = {}) {
  return calculateDomPlaneLayout({
    portalRect,
    elementRect,
    viewportWidth: 1280,
    z,
    cameraDistance: wideCameraDistance,
    sceneConfiguration,
    ...overrides,
  })
}

test('z=0 maps the DOM rectangle onto the reference plane', () => {
  const layout = createLayout(0)
  const metersPerCssPixel = 7.5 / 1800

  assert.equal(layout.depthScale, 1)
  assert.equal(layout.position.z, 0)
  assert.equal(layout.position.y, 3.75)
  assert.equal(layout.position.x, (336 - 640) * metersPerCssPixel)
  assert.equal(layout.size.width, 160 * metersPerCssPixel)
  assert.equal(layout.size.height, 160 * metersPerCssPixel)
})

test('different z values project to the same DOM rectangle at the portal center', () => {
  const anchorCameraY = 3.75
  const metersPerCssPixel = 7.5 / 1800

  for (const z of [-3, -2, -1, 0]) {
    const layout = createLayout(z)
    const worldMetersPerCssPixel = metersPerCssPixel * layout.depthScale
    const projectedCenterX = 640 + layout.position.x / worldMetersPerCssPixel
    const projectedCenterY = 400
      - (layout.position.y - anchorCameraY) / worldMetersPerCssPixel
    const projectedWidth = layout.size.width / worldMetersPerCssPixel
    const projectedHeight = layout.size.height / worldMetersPerCssPixel

    assert.ok(Math.abs(projectedCenterX - 336) < 1e-10)
    assert.ok(Math.abs(projectedCenterY - 400) < 1e-10)
    assert.ok(Math.abs(projectedWidth - 160) < 1e-10)
    assert.ok(Math.abs(projectedHeight - 160) < 1e-10)
  }
})

test('resize and responsive FOV produce a newly derived transform', () => {
  const narrowCameraDistance = calculateReferenceCameraDistance(
    { referenceFovY: 50 * Math.PI / 180 },
    referenceProjectionHeightMeters,
  )
  const wideLayout = createLayout(-3)
  const narrowLayout = createLayout(-3, {
    portalRect: { x: 0, y: -437.5, width: 375, height: 1675 },
    elementRect: { x: 12.5, y: 320, width: 160, height: 160 },
    viewportWidth: 375,
    cameraDistance: narrowCameraDistance,
  })

  assert.notEqual(narrowLayout.depthScale, wideLayout.depthScale)
  assert.notEqual(narrowLayout.position.x, wideLayout.position.x)
  assert.notEqual(narrowLayout.size.width, wideLayout.size.width)
})

test('data-z and geometry inputs are validated', () => {
  assert.equal(parseDomPlaneZ('-3'), -3)
  assert.equal(parseDomPlaneZ('0'), 0)
  assert.throws(() => parseDomPlaneZ(null), /data-z/)
  assert.throws(() => parseDomPlaneZ(''), /data-z/)
  assert.throws(() => parseDomPlaneZ('not-a-number'), /data-z/)
  assert.throws(() => createLayout(0, {
    portalRect: { ...portalRect, height: 0 },
  }), /portalRect.height/)
  assert.throws(() => createLayout(0, {
    cameraDistance: 0,
  }), /cameraDistance/)
  assert.throws(() => createLayout(wideCameraDistance + 1), /depthScale/)
})
