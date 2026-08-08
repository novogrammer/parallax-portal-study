import type { PortalConfiguration, PortalVariant, ResponsiveRule } from './types.ts'

interface IdLookup {
  has: (id: string) => boolean
}

export function listConfiguredVariants(configuration: PortalConfiguration): readonly PortalVariant[] {
  return [
    ...configuration.responsiveVariants.rules.map(({ variant }) => variant),
    configuration.responsiveVariants.otherwise,
  ]
}

export function validatePortalVariantReferences(
  configuration: PortalConfiguration,
  profileIds: IdLookup,
  sceneVariantIds: IdLookup,
): void {
  for (const variant of listConfiguredVariants(configuration)) {
    if (!profileIds.has(variant.projectionProfileId)) {
      throw new Error(
        `Portal "${configuration.portalId}" references unknown profile "${variant.projectionProfileId}".`,
      )
    }

    if (!sceneVariantIds.has(variant.sceneVariantId)) {
      throw new Error(
        `Portal "${configuration.portalId}" references unknown scene variant "${variant.sceneVariantId}".`,
      )
    }
  }
}

export function selectResponsiveVariant(
  rules: readonly ResponsiveRule[],
  matches: readonly boolean[],
  otherwise: PortalVariant,
): PortalVariant {
  if (rules.length !== matches.length) {
    throw new RangeError('rules and matches must have the same length.')
  }

  const matchedIndex = matches.findIndex(Boolean)
  return matchedIndex === -1 ? otherwise : rules[matchedIndex].variant
}

function isSameVariant(left: PortalVariant, right: PortalVariant): boolean {
  return left.projectionProfileId === right.projectionProfileId
    && left.sceneVariantId === right.sceneVariantId
}

export class ResponsiveVariantController {
  private readonly rules: readonly ResponsiveRule[]
  private readonly otherwise: PortalVariant
  private readonly mediaQueries: readonly MediaQueryList[]
  private readonly onChange: (variant: PortalVariant) => void
  private currentVariant: PortalVariant

  constructor(
    rules: readonly ResponsiveRule[],
    otherwise: PortalVariant,
    onChange: (variant: PortalVariant) => void,
  ) {
    this.rules = rules
    this.otherwise = otherwise
    this.onChange = onChange
    this.mediaQueries = rules.map(({ query }) => window.matchMedia(query))
    this.currentVariant = this.selectCurrentVariant()

    for (const mediaQuery of this.mediaQueries) {
      mediaQuery.addEventListener('change', this.handleMediaQueryChange)
    }
  }

  getCurrentVariant(): PortalVariant {
    return this.currentVariant
  }

  dispose(): void {
    for (const mediaQuery of this.mediaQueries) {
      mediaQuery.removeEventListener('change', this.handleMediaQueryChange)
    }
  }

  private selectCurrentVariant(): PortalVariant {
    return selectResponsiveVariant(
      this.rules,
      this.mediaQueries.map(({ matches }) => matches),
      this.otherwise,
    )
  }

  private readonly handleMediaQueryChange = (): void => {
    const nextVariant = this.selectCurrentVariant()

    if (isSameVariant(this.currentVariant, nextVariant)) {
      return
    }

    this.currentVariant = nextVariant
    this.onChange(nextVariant)
  }
}
