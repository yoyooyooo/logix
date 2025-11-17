import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import * as Form from '../../src/index.js'

describe('Form.Rule.field/fields', () => {
  it('fails on duplicate valuePath', () => {
    const a = Form.Rule.field('profile.name', { required: 'x' })
    const b = Form.Rule.field('profile.name', { required: 'y' })

    expect(() => Form.Rule.fields(a, b)).toThrow(/Duplicate valuePath/)
    expect(() => Form.Rule.fields([a], b)).toThrow(/Duplicate valuePath/)
  })
})
