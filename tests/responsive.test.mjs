import assert from 'node:assert/strict'
import test from 'node:test'
import { selectResponsiveVariant } from '../src/portal/responsive.ts'

const rules = [
  {
    query: '(min-width: 1200px)',
    variant: { projectionProfileId: 'large', sceneVariantId: 'large' },
  },
  {
    query: '(min-width: 768px)',
    variant: { projectionProfileId: 'medium', sceneVariantId: 'medium' },
  },
]

const otherwise = { projectionProfileId: 'small', sceneVariantId: 'small' }

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
