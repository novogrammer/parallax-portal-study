import assert from 'node:assert/strict'
import test from 'node:test'
import {
  listConfiguredVariants,
  selectResponsiveVariant,
  validateProjectionProfileReferences,
} from '../src/lib/parallax-portal/index.ts'

const rules = [
  {
    query: '(min-width: 1200px)',
    variant: { projectionProfileId: 'large' },
  },
  {
    query: '(min-width: 768px)',
    variant: { projectionProfileId: 'medium' },
  },
]

const otherwise = { projectionProfileId: 'small' }

test('responsive selection uses the first matching rule', () => {
  assert.deepEqual(selectResponsiveVariant(rules, [true, true], otherwise), rules[0].variant)
  assert.deepEqual(selectResponsiveVariant(rules, [false, true], otherwise), rules[1].variant)
})

test('responsive selection falls back to otherwise', () => {
  assert.deepEqual(selectResponsiveVariant(rules, [false, false], otherwise), otherwise)
})

test('responsive selection rejects a mismatched match list', () => {
  assert.throws(() => selectResponsiveVariant(rules, [true], otherwise), RangeError)
})

test('configuration validation checks inactive rules as well as otherwise', () => {
  const configuration = {
    portalId: 'test-portal',
    sceneId: 'test-scene',
    responsiveVariants: { rules, otherwise },
  }

  assert.deepEqual(listConfiguredVariants(configuration), [
    rules[0].variant,
    rules[1].variant,
    otherwise,
  ])

  assert.throws(
    () => validateProjectionProfileReferences(
      configuration,
      new Set(['medium', 'small']),
    ),
    /unknown profile "large"/,
  )
})
