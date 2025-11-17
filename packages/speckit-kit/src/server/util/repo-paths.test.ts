import { describe, expect, it } from 'vitest'

import { PathEscapeError, UnsafePathSegmentError, assertSafePathSegment, resolveWithinRoot } from './repo-paths.js'

describe('repo-paths', () => {
  it('resolveWithinRoot rejects path escape', () => {
    expect(() => resolveWithinRoot('/tmp/repo/specs', '..')).toThrow(PathEscapeError)
  })

  it('assertSafePathSegment rejects separators', () => {
    expect(() => assertSafePathSegment('a/b')).toThrow(UnsafePathSegmentError)
  })
})

