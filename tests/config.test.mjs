import assert from 'node:assert/strict'
import test from 'node:test'
import { projectionProfiles } from '../src/portal/config.ts'

test('wide and narrow profiles share scene height and camera travel while using different FOVs', () => {
  const wide = projectionProfiles.find(({ profileId }) => profileId === 'wide')
  const narrow = projectionProfiles.find(({ profileId }) => profileId === 'narrow')

  assert.ok(wide)
  assert.ok(narrow)
  assert.equal(narrow.referenceProjectionHeightMeters, wide.referenceProjectionHeightMeters)
  assert.equal(narrow.cameraTopY, wide.cameraTopY)
  assert.equal(narrow.cameraBottomY, wide.cameraBottomY)
  assert.notEqual(narrow.referenceFovY, wide.referenceFovY)
})
