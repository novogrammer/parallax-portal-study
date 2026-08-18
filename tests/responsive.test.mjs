import assert from 'node:assert/strict'
import test from 'node:test'
import { selectResponsiveProjection } from '../src/lib/parallax-portal/index.ts'

const rules = [
  {
    query: '(min-width: 1200px)',
    referenceFovY: 0.7,
  },
  {
    query: '(min-width: 768px)',
    referenceFovY: 0.8,
  },
]

const otherwise = { referenceFovY: 0.9 }

test('responsive projection uses the first matching rule', () => {
  assert.deepEqual(
    selectResponsiveProjection(rules, [true, true], otherwise),
    { referenceFovY: 0.7 },
  )
  assert.deepEqual(
    selectResponsiveProjection(rules, [false, true], otherwise),
    { referenceFovY: 0.8 },
  )
})

test('responsive projection falls back to otherwise', () => {
  assert.deepEqual(
    selectResponsiveProjection(rules, [false, false], otherwise),
    otherwise,
  )
})

test('responsive projection rejects a mismatched match list', () => {
  assert.throws(() => selectResponsiveProjection(rules, [true], otherwise), RangeError)
})
