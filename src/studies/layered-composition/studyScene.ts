import * as THREE from 'three/webgpu'

export interface StudySceneBundle {
  scene: THREE.Scene
  clearColor: THREE.ColorRepresentation
  dispose: () => void
}

export function createEmptyStudyScene(
  clearColor: THREE.ColorRepresentation,
): StudySceneBundle {
  const scene = new THREE.Scene()

  return {
    scene,
    clearColor,
    dispose: () => scene.clear(),
  }
}
