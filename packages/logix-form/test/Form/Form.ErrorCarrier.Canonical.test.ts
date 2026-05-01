import { describe, expect, it } from '@effect/vitest'
import { token } from '@logixjs/i18n'

import * as Form from '../../src/index.js'
import { countErrorLeaves } from '../../src/internal/form/errors.js'

describe('Form error carrier canonical', () => {
  it('does not count legacy string or {message} leaves as canonical errors', () => {
    expect(countErrorLeaves('legacy')).toBe(0)
    expect(countErrorLeaves({ message: 'legacy' })).toBe(0)
  })

  it('counts only canonical FormErrorLeaf-like objects', () => {
    const required = token('form.required')
    expect(
      countErrorLeaves({
        origin: 'manual',
        severity: 'error',
        message: required,
      }),
    ).toBe(1)
  })

  it('treats warning leaves as advisory and non-blocking', () => {
    const warning = token('form.warning')
    expect(
      countErrorLeaves({
        origin: 'rule',
        severity: 'warning',
        message: warning,
      }),
    ).toBe(0)
  })

  it('Form.Error.leaf produces canonical manual error leaf by default', () => {
    const required = token('form.required')
    expect(Form.Error.leaf(required)).toEqual({
      origin: 'manual',
      severity: 'error',
      message: required,
    })
  })

  it('does not let schema residue participate in canonical error count', () => {
    const required = token('form.required')
    expect(
      countErrorLeaves({
        name: {
          origin: 'rule',
          severity: 'error',
          message: required,
        },
        $schema: {
          name: 'legacy-schema',
        },
      }),
    ).toBe(1)
  })
})
