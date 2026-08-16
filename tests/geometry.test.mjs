import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateCameraY,
  calculateCenterProgress,
  calculatePortalGeometry,
  calculatePortalIntersection,
  calculateReferenceCameraDistance,
  calculateRenderCameraFovY,
  calculateWebGlScissor,
  validateProjectionProfile,
  validateReferenceProjectionHeight,
  validateSceneConfiguration,
} from '../src/lib/parallax-portal/index.ts'

const profile = {
  profileId: 'test',
  referenceFovY: 42 * Math.PI / 180,
}

const scene = {
  sceneId: 'test-scene',
  cameraTopY: 3,
  cameraBottomY: 0,
}

const referenceProjectionHeightMeters = 3

test('center progress reaches both endpoints and remains unclamped', () => {
  assert.equal(calculateCenterProgress(800, 400, 1000), 0)
  assert.equal(calculateCenterProgress(800, -600, 1000), 1)
  assert.equal(calculateCenterProgress(800, 600, 1000), -0.2)
  assert.equal(calculateCenterProgress(800, -800, 1000), 1.2)
})

test('camera Y interpolates and extrapolates without clamping', () => {
  assert.equal(calculateCameraY(scene, 0), 3)
  assert.equal(calculateCameraY(scene, 1), 0)
  assert.equal(calculateCameraY(scene, -0.5), 4.5)
  assert.equal(calculateCameraY(scene, 1.5), -1.5)
})

test('reference camera distance follows the projection equation', () => {
  const expected = 3 / (2 * Math.tan(profile.referenceFovY / 2))
  assert.ok(
    Math.abs(calculateReferenceCameraDistance(profile, referenceProjectionHeightMeters) - expected) < 1e-12,
  )
})

test('render FOV handles equal and unequal travel/reference heights', () => {
  const equalHeightFov = calculateRenderCameraFovY(
    profile,
    scene,
    referenceProjectionHeightMeters,
    800,
    400,
  )
  const expectedEqual = 2 * Math.atan(Math.tan(profile.referenceFovY / 2) * 2)
  assert.ok(Math.abs(equalHeightFov - expectedEqual) < 1e-12)

  const unequalScene = { ...scene, cameraTopY: 4.5, cameraBottomY: 0 }
  const unequalHeightFov = calculateRenderCameraFovY(
    profile,
    unequalScene,
    referenceProjectionHeightMeters,
    800,
    400,
  )
  const expectedUnequal = 2 * Math.atan(Math.tan(profile.referenceFovY / 2) * 2 * 1.5)
  assert.ok(Math.abs(unequalHeightFov - expectedUnequal) < 1e-12)
})

test('portal intersection covers partial, oversized, and invisible rects', () => {
  const viewport = { width: 1200, height: 800 }
  assert.deepEqual(
    calculatePortalIntersection({ x: -20, y: 100, width: 400, height: 900 }, viewport),
    { x: 0, y: 100, width: 380, height: 700 },
  )
  assert.deepEqual(
    calculatePortalIntersection({ x: -50, y: -100, width: 1400, height: 1000 }, viewport),
    { x: 0, y: 0, width: 1200, height: 800 },
  )
  assert.equal(
    calculatePortalIntersection({ x: 1300, y: 0, width: 100, height: 100 }, viewport),
    null,
  )
})

test('WebGL scissor rounds outward and converts to a bottom-left origin', () => {
  assert.deepEqual(
    calculateWebGlScissor({ x: 10.4, y: 20.2, width: 100.2, height: 200.1 }, 800),
    { x: 10, y: 579, width: 101, height: 201 },
  )
})

test('portal geometry keeps full portal height when only part is visible', () => {
  const geometry = calculatePortalGeometry(
    { x: 0, y: -500, width: 1200, height: 1200 },
    { width: 1200, height: 800 },
    profile,
    scene,
    referenceProjectionHeightMeters,
  )

  assert.ok(geometry)
  assert.equal(geometry.intersection.height, 700)
  assert.equal(geometry.centerProgress, 0.75)
  assert.equal(geometry.cameraY, 0.75)
})

test('invalid projection inputs throw configuration errors', () => {
  assert.throws(() => validateProjectionProfile({ ...profile, referenceFovY: 0 }), RangeError)
  assert.throws(() => validateReferenceProjectionHeight(0), RangeError)
  assert.throws(() => validateSceneConfiguration({ ...scene, cameraBottomY: 3 }), RangeError)
  assert.throws(
    () => calculateRenderCameraFovY(profile, scene, referenceProjectionHeightMeters, 0, 100),
    RangeError,
  )
  assert.throws(
    () => calculateRenderCameraFovY(profile, scene, referenceProjectionHeightMeters, 100, 0),
    RangeError,
  )
})
