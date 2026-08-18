import type {
  ProjectionProfile,
  ResponsiveProjectionRule,
} from './types.ts'

export function selectResponsiveProjection(
  rules: readonly ResponsiveProjectionRule[],
  matches: readonly boolean[],
  otherwise: ProjectionProfile,
): ProjectionProfile {
  if (rules.length !== matches.length) {
    throw new RangeError('rules and matches must have the same length.')
  }

  const matchedIndex = matches.findIndex(Boolean)
  const selected = matchedIndex === -1 ? otherwise : rules[matchedIndex]

  return { referenceFovY: selected.referenceFovY }
}
