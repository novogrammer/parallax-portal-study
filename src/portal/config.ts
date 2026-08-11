import type { PortalConfiguration, ProjectionProfile, SceneVariant } from './types.ts'

const degreesToRadians = (degrees: number): number => degrees * Math.PI / 180

export const projectionProfiles: readonly ProjectionProfile[] = [
  {
    profileId: 'wide',
    referenceFovY: degreesToRadians(42),
    referenceProjectionHeightMeters: 3,
    cameraTopY: 3,
    cameraBottomY: 0,
  },
  {
    profileId: 'narrow',
    referenceFovY: degreesToRadians(50),
    referenceProjectionHeightMeters: 4,
    cameraTopY: 3.5,
    cameraBottomY: -0.5,
  },
]

export const sceneVariants: readonly SceneVariant[] = [
  {
    sceneVariantId: 'warm-wide',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
  },
  {
    sceneVariantId: 'warm-narrow',
    position: [0.2, 0.1, -0.3],
    rotation: [0, 0.08, 0],
  },
  {
    sceneVariantId: 'cool-wide',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
  },
  {
    sceneVariantId: 'cool-narrow',
    position: [-0.2, 0.1, -0.4],
    rotation: [0, -0.08, 0],
  },
]

export const portalConfigurations: readonly PortalConfiguration[] = [
  {
    portalId: 'warm-depth',
    sceneId: 'warm-boxes',
    responsiveVariants: {
      rules: [
        {
          query: '(min-width: 768px)',
          variant: { projectionProfileId: 'wide', sceneVariantId: 'warm-wide' },
        },
      ],
      otherwise: { projectionProfileId: 'narrow', sceneVariantId: 'warm-narrow' },
    },
  },
  {
    portalId: 'cool-depth',
    sceneId: 'cool-orbits',
    responsiveVariants: {
      rules: [
        {
          query: '(min-width: 768px)',
          variant: { projectionProfileId: 'wide', sceneVariantId: 'cool-wide' },
        },
      ],
      otherwise: { projectionProfileId: 'narrow', sceneVariantId: 'cool-narrow' },
    },
  },
]
