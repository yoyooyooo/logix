import { describe, expect, it } from 'vitest'
import * as Form from '../../src/index.js'

const allowedRootExports = ['Companion', 'Error', 'Rule', 'make'] as const

describe('form root barrel allowlist', () => {
  it('only exposes frozen root exports', () => {
    expect(Object.keys(Form).sort()).toEqual(Array.from(allowedRootExports).sort())
  })
})
