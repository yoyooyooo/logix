import { describe, expect, it } from 'vitest'
import * as I18n from '../../src/index.js'
import type { I18nMessageToken, I18nTokenParams, I18nTokenParamsInput } from '../../src/index.js'

type TokenContractSmoke = {
  readonly token: I18nMessageToken
  readonly params: I18nTokenParams
  readonly input: I18nTokenParamsInput
}

const tokenContractSmoke: TokenContractSmoke | null = null

describe('I18n root surface boundary', () => {
  it('should keep only service-first entries on package root', () => {
    const root = I18n as Record<string, unknown>
    expect(Object.keys(root).sort()).toEqual(['I18n', 'I18nTag', 'token'])

    expect(root.I18n).toBeDefined()
    expect(root.I18nTag).toBeDefined()
    expect(typeof root.token).toBe('function')
    expect(tokenContractSmoke).toBeNull()

    expect('i18nSurface' in root).toBe(false)
    expect('projection' in root).toBe(false)
    expect('module' in root).toBe(false)
    expect(`canonicalizeToken${'Options'}` in root).toBe(false)
  })
})
