import { describe, expect, test } from 'vitest'
import { toKey, type FieldPath } from '../../../src/internal/field-path.js'

describe('field-path toKey', () => {
  test('avoids delimiter ambiguity via length-prefixed encoding', () => {
    expect(toKey(['a', 'bc'])).not.toBe(toKey(['ab', 'c']))
    expect(toKey(['a|b', 'c'])).not.toBe(toKey(['a', 'b|c']))
    expect(toKey(['a:b', 'c'])).not.toBe(toKey(['a', 'b:c']))
  })

  test('keeps stable output for special characters and empty segments', () => {
    const path: FieldPath = ['', '|', ':', '"quote"', 'back\\slash', 'emoji😀']
    const key1 = toKey(path)
    const key2 = toKey([...path])

    expect(key1).toBe(key2)
    expect(key1.length).toBeGreaterThan(0)
  })

  test('produces unique keys for representative tricky paths', () => {
    const paths: Array<FieldPath> = [
      [''],
      ['|'],
      [':'],
      ['|:'],
      [':|'],
      ['a|b', 'c'],
      ['a', 'b|c'],
      ['a:b', 'c'],
      ['a', 'b:c'],
      ['emoji😀', 'x'],
      ['emoji', '😀x'],
      ['a', '', 'b'],
      ['', 'ab'],
      ['ab', ''],
    ]

    const keys = paths.map((path) => toKey(path))
    expect(new Set(keys).size).toBe(paths.length)
  })
})
