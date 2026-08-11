import assert from 'node:assert/strict'
import test from 'node:test'
import {
  projectionProfiles,
  referenceProjectionHeightMeters,
  sceneConfigurations,
} from '../src/portal/config.ts'

test('wide and narrow profiles contain only their different FOVs', () => {
  const wide = projectionProfiles.find(({ profileId }) => profileId === 'wide')
  const narrow = projectionProfiles.find(({ profileId }) => profileId === 'narrow')

  assert.ok(wide)
  assert.ok(narrow)
  assert.notEqual(narrow.referenceFovY, wide.referenceFovY)
})

test('projection height is global while each scene defines its own camera travel', () => {
  assert.equal(referenceProjectionHeightMeters, 3)
  assert.deepEqual(
    sceneConfigurations.map(({ sceneId, cameraTopY, cameraBottomY }) => ({
      sceneId,
      cameraTopY,
      cameraBottomY,
    })),
    [
      { sceneId: 'warm-boxes', cameraTopY: 3, cameraBottomY: 0 },
      { sceneId: 'cool-orbits', cameraTopY: 3, cameraBottomY: 0 },
    ],
  )
})
