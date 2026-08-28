import assert from 'node:assert/strict'
import test from 'node:test'
import {
  coolSceneConfiguration,
  projectionConfiguration,
  referenceProjectionHeightMeters,
  warmSceneConfiguration,
} from '../src/studies/layered-composition/studyConfig.ts'
import { createEmptyStudyScene } from '../src/studies/layered-composition/studyScene.ts'

test('layered composition starts with two empty scenes', () => {
  const sceneBundles = [
    createEmptyStudyScene(0x2c160d),
    createEmptyStudyScene(0x071c2c),
  ]

  sceneBundles.forEach((sceneBundle) => {
    assert.equal(sceneBundle.scene.children.length, 0)

    sceneBundle.dispose()
    assert.equal(sceneBundle.scene.children.length, 0)
  })
})

test('layered composition matches the two portal camera travel ranges', () => {
  assert.equal(referenceProjectionHeightMeters, 3)
  assert.equal(projectionConfiguration.rules?.length, 1)
  assert.deepEqual(warmSceneConfiguration, { cameraTopY: 7.5, cameraBottomY: 0 })
  assert.deepEqual(coolSceneConfiguration, { cameraTopY: 3, cameraBottomY: 0 })
})
