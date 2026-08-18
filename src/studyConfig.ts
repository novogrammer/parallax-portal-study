import type {
  ProjectionConfiguration,
  SceneConfiguration,
} from 'parallax-portal'

const degreesToRadians = (degrees: number): number => degrees * Math.PI / 180

export const referenceProjectionHeightMeters = 3

export const projectionConfiguration: ProjectionConfiguration = {
  referenceFovY: degreesToRadians(50),
  rules: [
    {
      query: '(min-width: 768px)',
      referenceFovY: degreesToRadians(42),
    },
  ],
}

export const warmSceneConfiguration: SceneConfiguration = {
  cameraTopY: 7.5,
  cameraBottomY: 0,
}

export const coolSceneConfiguration: SceneConfiguration = {
  cameraTopY: 3,
  cameraBottomY: 0,
}
