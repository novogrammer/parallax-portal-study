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

function isSameVariant(left: ResponsiveVariant, right: ResponsiveVariant): boolean {
  return left.projectionProfileId === right.projectionProfileId
}

export class ResponsiveVariantController {
  private readonly rules: readonly ResponsiveRule[]
  private readonly otherwise: ResponsiveVariant
  private readonly mediaQueries: readonly MediaQueryList[]
  private readonly onChange: (variant: ResponsiveVariant) => void
  private currentVariant: ResponsiveVariant

  constructor(
    rules: readonly ResponsiveRule[],
    otherwise: ResponsiveVariant,
    onChange: (variant: ResponsiveVariant) => void,
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

  getCurrentVariant(): ResponsiveVariant {
    return this.currentVariant
  }

  dispose(): void {
    for (const mediaQuery of this.mediaQueries) {
      mediaQuery.removeEventListener('change', this.handleMediaQueryChange)
    }
  }

  private selectCurrentVariant(): ResponsiveVariant {
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
