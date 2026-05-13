import { describe, it, expect } from '@effect/vitest'
import { token } from '@logixjs/i18n'
import * as Form from '../../src/index.js'

describe('Form.Rule.field/fields', () => {
  it('fails on duplicate valuePath', () => {
    const a = Form.Rule.field('profile.name', { required: token('profile.name.required') })
    const b = Form.Rule.field('profile.name', { required: token('profile.name.requiredAgain') })

    expect(() => Form.Rule.fields(a, b)).toThrow(/Duplicate valuePath/)
    expect(() => Form.Rule.fields([a], b)).toThrow(/Duplicate valuePath/)
  })
})
