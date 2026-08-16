import type { PortalConfiguration, ResponsiveRule, ResponsiveVariant } from './types.ts'

interface IdLookup {
  has: (id: string) => boolean
}

export function listConfiguredVariants(configuration: PortalConfiguration): readonly ResponsiveVariant[] {
  return [
    ...configuration.responsiveVariants.rules.map(({ variant }) => variant),
    configuration.responsiveVariants.otherwise,
  ]
}

export function validateProjectionProfileReferences(
  configuration: PortalConfiguration,
  profileIds: IdLookup,
): void {
  for (const variant of listConfiguredVariants(configuration)) {
    if (!profileIds.has(variant.projectionProfileId)) {
      throw new Error(
        `Portal "${configuration.portalId}" references unknown profile "${variant.projectionProfileId}".`,
      )
    }
  }
}

export function selectResponsiveVariant(
  rules: readonly ResponsiveRule[],
  matches: readonly boolean[],
  otherwise: ResponsiveVariant,
): ResponsiveVariant {
  if (rules.length !== matches.length) {
    throw new RangeError('rules and matches must have the same length.')
  }

  const matchedIndex = matches.findIndex(Boolean)
  return matchedIndex === -1 ? otherwise : rules[matchedIndex].variant
}
