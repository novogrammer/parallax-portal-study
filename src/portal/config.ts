import type { PortalConfiguration, ProjectionProfile } from './types.ts'

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
    referenceProjectionHeightMeters: 3,
    cameraTopY: 3,
    cameraBottomY: 0,
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
          variant: { projectionProfileId: 'wide' },
        },
      ],
      otherwise: { projectionProfileId: 'narrow' },
    },
  },
  {
    portalId: 'cool-depth',
    sceneId: 'cool-orbits',
    responsiveVariants: {
      rules: [
        {
          query: '(min-width: 768px)',
          variant: { projectionProfileId: 'wide' },
        },
      ],
      otherwise: { projectionProfileId: 'narrow' },
    },
  },
]
