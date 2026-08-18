import type {
  ProjectionConfiguration,
  ProjectionProfile,
} from './types.ts'

export function selectResponsiveProjection(
  configuration: ProjectionConfiguration,
  matches: readonly boolean[],
): ProjectionProfile {
  const rules = configuration.rules ?? []

  if (rules.length !== matches.length) {
    throw new RangeError('rules and matches must have the same length.')
  }

  const matchedIndex = matches.findIndex(Boolean)
  const selected = matchedIndex === -1 ? configuration : rules[matchedIndex]

  return { referenceFovY: selected.referenceFovY }
}
