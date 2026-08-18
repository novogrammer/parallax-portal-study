import type {
  ResponsiveProjectionConfiguration,
  SceneConfiguration,
} from './lib/parallax-portal/index.ts'

const degreesToRadians = (degrees: number): number => degrees * Math.PI / 180

export const referenceProjectionHeightMeters = 3

export const projectionConfiguration: ResponsiveProjectionConfiguration = {
  rules: [
    {
      query: '(min-width: 768px)',
      referenceFovY: degreesToRadians(42),
    },
  ],
  otherwise: {
    referenceFovY: degreesToRadians(50),
  },
}

export const warmSceneConfiguration: SceneConfiguration = {
  cameraTopY: 7.5,
  cameraBottomY: 0,
}

export const coolSceneConfiguration: SceneConfiguration = {
  cameraTopY: 3,
  cameraBottomY: 0,
}
