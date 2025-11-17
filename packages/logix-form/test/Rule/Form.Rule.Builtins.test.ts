import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import * as Form from '../../src/index.js'

describe('Form.Rule builtins + RHF-like shorthands', () => {
  it('exposes pure builtins (required/minLength/maxLength/min/max/pattern)', () => {
    const requiredTitle = Form.Rule.required({ message: '请输入标题', trim: true })
    expect(requiredTitle('')).toBe('请输入标题')
    expect(requiredTitle('  x  ')).toBeUndefined()

    const min2 = Form.Rule.minLength(2)
    expect(min2('a')).toBe('minLength')
    expect(min2('ab')).toBeUndefined()

    const max2 = Form.Rule.maxLength(2)
    expect(max2('abc')).toBe('maxLength')
    expect(max2('ab')).toBeUndefined()

    const min10 = Form.Rule.min(10)
    expect(min10(9)).toBe('min')
    expect(min10(10)).toBeUndefined()

    const max10 = Form.Rule.max(10)
    expect(max10(11)).toBe('max')
    expect(max10(10)).toBeUndefined()

    const onlyDigits = Form.Rule.pattern(/^[0-9]+$/)
    expect(onlyDigits('a1')).toBe('pattern')
    expect(onlyDigits('123')).toBeUndefined()
  })

  it('expands RHF-like shorthand in Form.Rule.make (without changing deps/validateOn)', () => {
    const rules = Form.Rule.make<string>({
      deps: ['name'],
      validateOn: ['onBlur'],
      required: { message: 'required!', trim: true },
      minLength: 2,
      validate: {
        custom: (value) => (value === 'ok' ? undefined : 'custom'),
      },
    })

    expect(Object.keys(rules)).toEqual(['custom', 'minLength', 'required'])
    expect(rules.required.deps).toEqual(['name'])
    expect(rules.required.validateOn).toEqual(['onBlur'])
    expect(rules.required.validate('', {} as any)).toBe('required!')
    expect(rules.required.validate('ok', {} as any)).toBeUndefined()
    expect(rules.minLength.validate('a', {} as any)).toBe('minLength')
    expect(rules.minLength.validate('ab', {} as any)).toBeUndefined()
    expect(rules.custom.validate('no', {} as any)).toBe('custom')
  })

  it('enforces ErrorValue JSON size ≤256B', () => {
    const big = 'x'.repeat(Form.Rule.ERROR_VALUE_MAX_BYTES + 16)
    expect(() => Form.Rule.required(big)).toThrow(/≤256B/)
    expect(() => Form.Rule.make({ required: big })).toThrow(/≤256B/)
  })
})
