import { describe, expect, it } from '@effect/vitest'
import { assertNoCatalogConflicts } from '../../src/locales/index.js'

describe('Form.Rule builtin locales collision law', () => {
  it('treats cross-domain default locale collisions as authoring error', () => {
    expect(() =>
      assertNoCatalogConflicts(
        { 'logix.form.rule.required': 'Required' },
        { 'logix.form.rule.required': 'Other Required' },
      ),
    ).toThrow(/authoring error/i)
  })
})
