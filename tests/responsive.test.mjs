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

const configuration = {
  referenceFovY: 0.9,
  rules,
}

test('projection configuration works without responsive rules', () => {
  assert.deepEqual(
    selectResponsiveProjection({ referenceFovY: 0.75 }, []),
    { referenceFovY: 0.75 },
  )
})

test('responsive projection uses the first matching rule', () => {
  assert.deepEqual(
    selectResponsiveProjection(configuration, [true, true]),
    { referenceFovY: 0.7 },
  )
  assert.deepEqual(
    selectResponsiveProjection(configuration, [false, true]),
    { referenceFovY: 0.8 },
  )
})

test('responsive projection falls back to the base profile', () => {
  assert.deepEqual(
    selectResponsiveProjection(configuration, [false, false]),
    { referenceFovY: configuration.referenceFovY },
  )
})

test('responsive projection rejects a mismatched match list', () => {
  assert.throws(() => selectResponsiveProjection(configuration, [true]), RangeError)
})
