import { describe, it, expect } from '@effect/vitest'
import { token } from '@logixjs/i18n'
import * as Form from '../../src/index.js'

describe('Form.Rule builtins + RHF-like shorthands', () => {
  it('exposes pure builtins (required/email/minLength/maxLength/min/max/pattern)', () => {
    const requiredTitle = Form.Rule.required(token('example.requiredTitle'))
    expect(requiredTitle('')).toEqual(token('example.requiredTitle'))
    expect(requiredTitle('  x  ')).toBeUndefined()

    const requiredLiteral = Form.Rule.required({ message: '请输入标题', trim: true })
    const requiredLiteralErr = requiredLiteral('')
    expect(requiredLiteralErr).toMatchObject({ _tag: 'i18n' })
    expect(requiredLiteralErr).not.toBe('请输入标题')

    const requiredDefault = Form.Rule.required()
    expect(requiredDefault('')).toEqual(token('logix.form.rule.required'))

    const emailDefault = Form.Rule.email()
    expect(emailDefault('abc')).toEqual(token('logix.form.rule.email'))
    expect(emailDefault('a@b')).toBeUndefined()

    const customEmail = Form.Rule.email(token('example.email'))
    expect(customEmail('abc')).toEqual(token('example.email'))
    expect(customEmail('a@b')).toBeUndefined()

    const min2 = Form.Rule.minLength(2)
    expect(min2('a')).toEqual(token('logix.form.rule.minLength', { min: 2 }))
    expect(min2('ab')).toBeUndefined()

    const min2Literal = Form.Rule.minLength({ min: 2, message: '至少 2 位' })
    const min2Err = min2Literal('a')
    expect(min2Err).toMatchObject({ _tag: 'i18n' })
    expect(min2Err).not.toBe('至少 2 位')
    expect(min2Literal('ab')).toBeUndefined()

    const max2 = Form.Rule.maxLength(2)
    expect(max2('abc')).toEqual(token('logix.form.rule.maxLength', { max: 2 }))
    expect(max2('ab')).toBeUndefined()

    const min10 = Form.Rule.min(10)
    expect(min10(9)).toEqual(token('logix.form.rule.min', { min: 10 }))
    expect(min10(10)).toBeUndefined()

    const max10 = Form.Rule.max(10)
    expect(max10(11)).toEqual(token('logix.form.rule.max', { max: 10 }))
    expect(max10(10)).toBeUndefined()

    const onlyDigits = Form.Rule.pattern(/^[0-9]+$/)
    expect(onlyDigits('a1')).toEqual(token('logix.form.rule.pattern'))
    expect(onlyDigits('123')).toBeUndefined()

    const customPattern = Form.Rule.pattern({
      re: /^[0-9]+$/,
      message: token('example.pattern'),
    })
    expect(customPattern('abc')).toEqual(token('example.pattern'))
  })

  it('expands RHF-like shorthand in Form.Rule.make (without changing deps/validateOn)', () => {
    const rules = Form.Rule.make<string>({
      deps: ['name'],
      validateOn: ['onBlur'],
      required: '请输入姓名',
      email: '邮箱格式错误',
      minLength: { min: 2, message: '至少 2 位' },
      validate: {
        custom: (value) => (value === 'ok' ? undefined : 'custom'),
      },
    })

    expect(Object.keys(rules)).toEqual(['custom', 'email', 'minLength', 'required'])
    expect(rules.required.deps).toEqual(['name'])
    expect(rules.required.validateOn).toEqual(['onBlur'])
    const requiredErr = rules.required.validate('', {} as any)
    const emailErr = rules.email.validate('bad', {} as any)
    const minLengthErr = rules.minLength.validate('a', {} as any)
    expect(requiredErr).toMatchObject({ _tag: 'i18n' })
    expect(emailErr).toMatchObject({ _tag: 'i18n' })
    expect(minLengthErr).toMatchObject({ _tag: 'i18n' })
    expect(requiredErr).not.toBe('请输入姓名')
    expect(emailErr).not.toBe('邮箱格式错误')
    expect(minLengthErr).not.toBe('至少 2 位')
    expect(rules.required.validate('ok', {} as any)).toBeUndefined()
    expect(rules.email.validate('a@b', {} as any)).toBeUndefined()
    expect(rules.minLength.validate('ab', {} as any)).toBeUndefined()
    expect(rules.custom.validate('no', {} as any)).toBe('custom')
  })

  it('rejects raw string outside the frozen allowlist and enforces ErrorValue JSON size ≤256B', () => {
    const big = 'x'.repeat(Form.Rule.ERROR_VALUE_MAX_BYTES + 16)
    const tooLongLiteral = 'x'.repeat(320)
    expect(() => Form.Rule.required('legacy raw string' as never)).toThrow(/I18nMessageToken/)
    expect(() => Form.Rule.email('legacy raw string' as never)).toThrow(/I18nMessageToken/)
    expect(() => Form.Rule.make({ minLength: 'legacy raw string' as never })).toThrow(/minLength/)
    expect(() => Form.Rule.make({ pattern: 'legacy raw string' as never })).toThrow(/pattern/)
    expect(() => Form.Rule.make({ required: tooLongLiteral })).toThrow(/raw string builtin message/)
    const oversizedToken = {
      _tag: 'i18n',
      key: 'logix.form.rule.required',
      params: {
        payload: big,
      },
    } as any
    expect(() => Form.Rule.required(oversizedToken)).toThrow(/≤256B/)
    expect(() => Form.Rule.make({ required: oversizedToken })).toThrow(/≤256B/)
  })
})
