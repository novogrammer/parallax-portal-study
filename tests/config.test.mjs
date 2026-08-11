import assert from 'node:assert/strict'
import test from 'node:test'
import { projectionProfiles, sceneConfigurations } from '../src/portal/config.ts'

test('wide and narrow profiles contain only their different FOVs', () => {
  const wide = projectionProfiles.find(({ profileId }) => profileId === 'wide')
  const narrow = projectionProfiles.find(({ profileId }) => profileId === 'narrow')

  assert.ok(wide)
  assert.ok(narrow)
  assert.notEqual(narrow.referenceFovY, wide.referenceFovY)
})

test('each scene defines its own projection height and camera travel', () => {
  assert.deepEqual(
    sceneConfigurations.map(({ sceneId, referenceProjectionHeightMeters, cameraTopY, cameraBottomY }) => ({
      sceneId,
      referenceProjectionHeightMeters,
      cameraTopY,
      cameraBottomY,
    })),
    [
      { sceneId: 'warm-boxes', referenceProjectionHeightMeters: 3, cameraTopY: 3, cameraBottomY: 0 },
      { sceneId: 'cool-orbits', referenceProjectionHeightMeters: 3, cameraTopY: 3, cameraBottomY: 0 },
    ],
  )
})
