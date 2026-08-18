import assert from 'node:assert/strict'
import test from 'node:test'
import {
  coolSceneConfiguration,
  projectionConfiguration,
  referenceProjectionHeightMeters,
  warmSceneConfiguration,
} from '../src/studyConfig.ts'

test('wide and narrow viewing conditions use different shared FOVs', () => {
  assert.equal(projectionConfiguration.rules.length, 1)
  assert.equal(projectionConfiguration.rules[0].query, '(min-width: 768px)')
  assert.notEqual(
    projectionConfiguration.rules[0].referenceFovY,
    projectionConfiguration.otherwise.referenceFovY,
  )
})

test('projection height is shared while each scene defines its camera travel', () => {
  assert.equal(referenceProjectionHeightMeters, 3)
  assert.deepEqual(warmSceneConfiguration, { cameraTopY: 7.5, cameraBottomY: 0 })
  assert.deepEqual(coolSceneConfiguration, { cameraTopY: 3, cameraBottomY: 0 })
})
