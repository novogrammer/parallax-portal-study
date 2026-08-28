import assert from 'node:assert/strict'
import test from 'node:test'
import {
  projectionConfiguration,
  referenceProjectionHeightMeters,
  sceneConfiguration,
} from '../src/studies/layered-composition/studyConfig.ts'
import { createEmptyStudyScene } from '../src/studies/layered-composition/studyScene.ts'

test('layered composition starts with an empty scene', () => {
  const sceneBundle = createEmptyStudyScene()

  assert.equal(sceneBundle.scene.children.length, 0)

  sceneBundle.dispose()
  assert.equal(sceneBundle.scene.children.length, 0)
})

test('layered composition uses one non-zero camera travel range', () => {
  assert.equal(referenceProjectionHeightMeters, 3)
  assert.equal(projectionConfiguration.rules?.length, 1)
  assert.deepEqual(sceneConfiguration, { cameraTopY: 3, cameraBottomY: 0 })
})
