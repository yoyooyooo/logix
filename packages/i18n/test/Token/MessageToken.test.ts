import { describe, it, expect } from 'vitest'
import { InvalidI18nMessageTokenError, token, type InvalidI18nMessageTokenReason } from '../../src/index.js'

const expectInvalid = (f: () => unknown, reason: InvalidI18nMessageTokenReason): void => {
  try {
    f()
    throw new Error('Expected InvalidI18nMessageTokenError but got success')
  } catch (e) {
    expect(e).toBeInstanceOf(InvalidI18nMessageTokenError)
    const err = e as InvalidI18nMessageTokenError
    expect(err.name).toBe('InvalidI18nMessageTokenError')
    expect(err.reason).toBe(reason)
    expect(err.details).toBeTruthy()
    expect(Array.isArray(err.fix)).toBe(true)
    expect(err.fix.length).toBeGreaterThanOrEqual(2)
  }
}

describe('I18n message token', () => {
  it('canonicalizes options (sort keys, drop undefined)', () => {
    const t = token('form.required', {
      z: 1,
      a: 'name',
      field: 'name',
      defaultValue: 'Required',
      undef: undefined,
    })

    expect(Object.keys(t.options ?? {})).toEqual(['a', 'defaultValue', 'field', 'z'])
    expect(t).toEqual({
      _tag: 'i18n',
      key: 'form.required',
      options: {
        a: 'name',
        defaultValue: 'Required',
        field: 'name',
        z: 1,
      },
    })
  })

  it('rejects non JsonPrimitive option values', () => {
    expectInvalid(() => token('bad.value', { bad: { nested: true } as any }), 'optionValueInvalid')
  })

  it('rejects NaN/Infinity option values', () => {
    expectInvalid(() => token('bad.nan', { n: Number.NaN } as any), 'numberNotJsonSafe')
    expectInvalid(() => token('bad.inf', { n: Number.POSITIVE_INFINITY } as any), 'numberNotJsonSafe')
  })

  it('rejects language frozen fields (lng/lngs)', () => {
    expectInvalid(() => token('bad.lng', { lng: 'en' }), 'languageFrozen')
    expectInvalid(() => token('bad.lngs', { lngs: 'en' }), 'languageFrozen')
  })

  it('rejects oversize key/options budgets', () => {
    expectInvalid(() => token('x'.repeat(97)), 'keyTooLong')
    expectInvalid(
      () =>
        token('too.many', {
          a: 1,
          b: 1,
          c: 1,
          d: 1,
          e: 1,
          f: 1,
          g: 1,
          h: 1,
          i: 1,
        }),
      'tooManyOptions',
    )
    expectInvalid(() => token('value.too.long', { msg: 'x'.repeat(97) }), 'optionValueTooLong')
  })
})
