import * as THREE from 'three/webgpu'

export interface StudySceneBundle {
  scene: THREE.Scene
  clearColor: THREE.ColorRepresentation
  dispose: () => void
}

export function createEmptyStudyScene(): StudySceneBundle {
  const scene = new THREE.Scene()

  return {
    scene,
    clearColor: 0x17201d,
    dispose: () => scene.clear(),
  }
}
