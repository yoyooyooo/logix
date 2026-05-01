import { describe, expect, it } from 'vitest'
import * as Form from '../src/index.js'

describe('@logixjs/form', () => {
  it('keeps only the exact root public surface', () => {
    expect(Object.keys(Form).sort()).toEqual(['Companion', 'Error', 'Rule', 'make'])
  })
})
