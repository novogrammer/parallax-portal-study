import { selectResponsiveProjection } from './responsive.ts'
import type {
  ProjectionProfile,
  ResponsiveProjectionConfiguration,
} from './types.ts'

function isSameProjection(left: ProjectionProfile, right: ProjectionProfile): boolean {
  return left.referenceFovY === right.referenceFovY
}

export class ResponsiveProjectionController {
  private readonly configuration: ResponsiveProjectionConfiguration
  private readonly mediaQueries: readonly MediaQueryList[]
  private readonly onChange: (projection: ProjectionProfile) => void
  private currentProjection: ProjectionProfile

  constructor(
    configuration: ResponsiveProjectionConfiguration,
    onChange: (projection: ProjectionProfile) => void,
  ) {
    this.configuration = configuration
    this.onChange = onChange
    this.mediaQueries = configuration.rules.map(({ query }) => window.matchMedia(query))
    this.currentProjection = this.selectCurrentProjection()

    for (const mediaQuery of this.mediaQueries) {
      mediaQuery.addEventListener('change', this.handleMediaQueryChange)
    }
  }

  getCurrentProjection(): ProjectionProfile {
    return this.currentProjection
  }

  dispose(): void {
    for (const mediaQuery of this.mediaQueries) {
      mediaQuery.removeEventListener('change', this.handleMediaQueryChange)
    }
  }

  private selectCurrentProjection(): ProjectionProfile {
    return selectResponsiveProjection(
      this.configuration.rules,
      this.mediaQueries.map(({ matches }) => matches),
      this.configuration.otherwise,
    )
  }

  private readonly handleMediaQueryChange = (): void => {
    const nextProjection = this.selectCurrentProjection()

    if (isSameProjection(this.currentProjection, nextProjection)) {
      return
    }

    this.currentProjection = nextProjection
    this.onChange(nextProjection)
  }
}
