import * as THREE from 'three'
import type { SceneVariant } from './types.ts'

export interface StudySceneBundle {
  scene: THREE.Scene
  clearColor: THREE.ColorRepresentation
  applyVariant: (variant: SceneVariant) => void
  dispose: () => void
}

function createMaterial(color: THREE.ColorRepresentation, roughness: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.08 })
}

function addCommonLights(scene: THREE.Scene, accent: THREE.ColorRepresentation): void {
  const ambient = new THREE.AmbientLight(0xffffff, 1.25)
  const key = new THREE.DirectionalLight(accent, 3.2)
  key.position.set(-3, 6, 5)
  const fill = new THREE.DirectionalLight(0xffffff, 1.1)
  fill.position.set(4, 1, 2)
  scene.add(ambient, key, fill)
}

function createWarmScene(root: THREE.Group): void {
  const near = new THREE.Group()
  const middle = new THREE.Group()
  const far = new THREE.Group()

  const nearMaterial = createMaterial(0xff8b42, 0.42)
  const middleMaterial = createMaterial(0xffc857, 0.58)
  const farMaterial = createMaterial(0x8a4f2d, 0.8)

  const nearBox = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), nearMaterial)
  nearBox.position.set(-1.7, 0.85, -1.4)
  nearBox.rotation.set(0.24, 0.45, 0.1)
  near.add(nearBox)

  for (let index = 0; index < 4; index += 1) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.35, 0.85), middleMaterial)
    box.position.set(-1.8 + index * 1.2, 1.4 + (index % 2) * 0.35, -4.2 - index * 0.25)
    box.rotation.y = index * 0.22
    middle.add(box)
  }

  for (let index = 0; index < 7; index += 1) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), farMaterial)
    box.position.set(-3 + index, 0.55 + (index % 3) * 0.72, -8.5 - (index % 2))
    far.add(box)
  }

  root.add(near, middle, far)
}

function createCoolScene(root: THREE.Group): void {
  const near = new THREE.Group()
  const middle = new THREE.Group()
  const far = new THREE.Group()

  const nearMaterial = createMaterial(0x52d3d8, 0.3)
  const middleMaterial = createMaterial(0x3c91e6, 0.48)
  const farMaterial = createMaterial(0x7067cf, 0.7)

  const nearSphere = new THREE.Mesh(new THREE.SphereGeometry(0.9, 28, 18), nearMaterial)
  nearSphere.position.set(1.7, 1.05, -1.7)
  near.add(nearSphere)

  for (let index = 0; index < 5; index += 1) {
    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.52, 1.65, 20), middleMaterial)
    cylinder.position.set(-2.3 + index * 1.15, 1.1 + (index % 2) * 0.45, -4.5 - index * 0.2)
    cylinder.rotation.z = (index - 2) * 0.08
    middle.add(cylinder)
  }

  for (let index = 0; index < 8; index += 1) {
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.3 + (index % 3) * 0.08, 18, 12), farMaterial)
    sphere.position.set(-3.2 + index * 0.9, 0.5 + (index % 4) * 0.62, -9 - (index % 2) * 0.8)
    far.add(sphere)
  }

  root.add(near, middle, far)
}

function disposeScene(scene: THREE.Scene): void {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()

  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return
    }

    geometries.add(object.geometry)
    const meshMaterials = Array.isArray(object.material) ? object.material : [object.material]
    meshMaterials.forEach((material) => materials.add(material))
  })

  geometries.forEach((geometry) => geometry.dispose())
  materials.forEach((material) => material.dispose())
  scene.clear()
}

export function createStudyScene(sceneId: string): StudySceneBundle {
  const scene = new THREE.Scene()
  const root = new THREE.Group()
  scene.add(root)

  let clearColor: THREE.ColorRepresentation

  if (sceneId === 'warm-boxes') {
    clearColor = 0x2c160d
    addCommonLights(scene, 0xffc857)
    createWarmScene(root)
  } else if (sceneId === 'cool-orbits') {
    clearColor = 0x071c2c
    addCommonLights(scene, 0x73fbd3)
    createCoolScene(root)
  } else {
    throw new Error(`Unknown study scene: ${sceneId}`)
  }

  return {
    scene,
    clearColor,
    applyVariant: (variant) => {
      root.position.set(...variant.position)
      root.rotation.set(...variant.rotation)
      root.scale.set(...variant.scale)
    },
    dispose: () => disposeScene(scene),
  }
}
