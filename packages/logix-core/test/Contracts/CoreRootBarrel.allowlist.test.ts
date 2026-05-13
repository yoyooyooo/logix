import { describe, expect, it } from 'vitest'
import * as Logix from '../../src/index.js'

const allowedRootExports = [
  'ControlPlane',
  'Module',
  'Program',
  'Runtime',
] as const

describe('core root barrel allowlist', () => {
  it('should only expose explicitly allowlisted root exports', () => {
    const actual = Object.keys(Logix).sort()
    const expected = Array.from(allowedRootExports).sort()
    expect(actual).toEqual(expected)
  })
})
