import { selectResponsiveVariant } from '../lib/parallax-portal/index.ts'
import type {
  ResponsiveRule,
  ResponsiveVariant,
} from '../lib/parallax-portal/index.ts'

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
