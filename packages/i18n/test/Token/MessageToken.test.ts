import { describe, it, expect } from '@effect/vitest'
import { token } from '../../src/index.js'
import { InvalidI18nMessageTokenError, type InvalidI18nMessageTokenReason } from '../../src/internal/token/token.js'

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
  const legacyFallbackKey = `default${'Value'}`

  it('keeps only semantic params', () => {
    const t = token('form.required', {
      field: 'name',
      count: 1,
      undef: undefined,
    })

    expect(t).toEqual({
      _tag: 'i18n',
      key: 'form.required',
      params: {
        count: 1,
        field: 'name',
      },
    })
  })

  it('rejects render fallback fields', () => {
    expectInvalid(() => token('form.required', { [legacyFallbackKey]: 'Required' as any }), 'renderFallbackReserved')
  })

  it('rejects non JsonPrimitive param values', () => {
    expectInvalid(() => token('bad.value', { bad: { nested: true } as any }), 'paramValueInvalid')
  })

  it('rejects NaN/Infinity param values', () => {
    expectInvalid(() => token('bad.nan', { n: Number.NaN } as any), 'numberNotJsonSafe')
    expectInvalid(() => token('bad.inf', { n: Number.POSITIVE_INFINITY } as any), 'numberNotJsonSafe')
  })

  it('rejects language frozen fields (lng/lngs)', () => {
    expectInvalid(() => token('bad.lng', { lng: 'en' }), 'languageFrozen')
    expectInvalid(() => token('bad.lngs', { lngs: 'en' }), 'languageFrozen')
  })

  it('rejects oversize key/params budgets', () => {
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
      'tooManyParams',
    )
    expectInvalid(() => token('value.too.long', { msg: 'x'.repeat(97) }), 'paramValueTooLong')
  })
})
