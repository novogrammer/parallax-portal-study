import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  coolSceneConfiguration,
  projectionConfiguration,
  referenceProjectionHeightMeters,
  warmSceneConfiguration,
} from '../src/studies/layered-composition/studyConfig.ts'
import {
  createDomPlaneStudyScene,
  createEmptyStudyScene,
} from '../src/studies/layered-composition/studyScene.ts'

test('layered composition keeps Portal 02 empty', async () => {
  const sceneBundle = createEmptyStudyScene(0x071c2c)

  await sceneBundle.ready
  assert.equal(sceneBundle.scene.children.length, 0)
  sceneBundle.updateLayout()

  sceneBundle.dispose()
  assert.equal(sceneBundle.scene.children.length, 0)
})

test('layered composition defines four DOM plane sources', async () => {
  const html = await readFile(
    new URL('../src/studies/layered-composition/index.html', import.meta.url),
    'utf8',
  )
  const zValues = Array.from(html.matchAll(/data-z="([^"]+)"/g), (match) => Number(match[1]))

  assert.deepEqual(zValues, [-3, -2, -1, 0])
})

test('Portal 01 owns four transparent planes and disposes their resources', async () => {
  const projectedClasses = new Set()
  const images = [-3, -2, -1, 0].map((z) => ({
    className: `plane-${z}`,
    decode: async () => {},
    getAttribute: (name) => name === 'data-z' ? String(z) : null,
    getBoundingClientRect: () => ({
      left: 256,
      top: 320,
      width: 160,
      height: 160,
    }),
  }))
  const sourceElement = {
    classList: {
      add: (name) => projectedClasses.add(name),
      remove: (name) => projectedClasses.delete(name),
    },
    querySelectorAll: () => images,
  }
  const portalElement = {
    getBoundingClientRect: () => ({
      left: 0,
      top: -500,
      width: 1280,
      height: 1800,
    }),
    querySelector: () => sourceElement,
  }
  globalThis.window = {
    innerWidth: 1280,
    matchMedia: () => ({ matches: true }),
  }

  try {
    const sceneBundle = createDomPlaneStudyScene({
      portalElement,
      clearColor: 0x2c160d,
      projectionConfiguration,
      referenceProjectionHeightMeters,
      sceneConfiguration: warmSceneConfiguration,
    })

    await sceneBundle.ready
    assert.equal(sceneBundle.scene.children.length, 4)
    assert.equal(projectedClasses.has('p-home-introduction__background--projected'), true)

    const meshes = [...sceneBundle.scene.children]
    const geometry = meshes[0].geometry
    let geometryDisposals = 0
    let materialDisposals = 0
    let textureDisposals = 0
    geometry.addEventListener('dispose', () => { geometryDisposals += 1 })
    meshes.forEach((mesh) => {
      assert.equal(mesh.material.transparent, true)
      assert.equal(mesh.material.depthWrite, false)
      mesh.material.addEventListener('dispose', () => { materialDisposals += 1 })
      mesh.material.map.addEventListener('dispose', () => { textureDisposals += 1 })
    })

    sceneBundle.dispose()

    assert.equal(sceneBundle.scene.children.length, 0)
    assert.equal(projectedClasses.size, 0)
    assert.equal(geometryDisposals, 1)
    assert.equal(materialDisposals, 4)
    assert.equal(textureDisposals, 4)
  } finally {
    delete globalThis.window
  }
})

test('layered composition matches the two portal camera travel ranges', () => {
  assert.equal(referenceProjectionHeightMeters, 3)
  assert.equal(projectionConfiguration.rules?.length, 1)
  assert.deepEqual(warmSceneConfiguration, { cameraTopY: 7.5, cameraBottomY: 0 })
  assert.deepEqual(coolSceneConfiguration, { cameraTopY: 3, cameraBottomY: 0 })
})
