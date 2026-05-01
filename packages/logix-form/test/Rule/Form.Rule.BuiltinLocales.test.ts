import { describe, expect, it } from '@effect/vitest'
import { enUS, zhCN } from '../../src/locales/index.js'

describe('Form.Rule builtin locales', () => {
  it('exports builtin locale catalogs through the locales subpath', () => {
    expect(enUS['logix.form.rule.required']).toBe('Required')
    expect(enUS['logix.form.rule.minLength']).toContain('{{min}}')
    expect(enUS['logix.form.rule.literal']).toContain('{{a}}')
    expect(zhCN['logix.form.rule.required']).toBe('此项为必填')
    expect(zhCN['logix.form.rule.max']).toContain('{{max}}')
    expect(zhCN['logix.form.rule.literal']).toContain('{{c}}')
  })

  it('keeps key sets aligned across builtin locale catalogs', () => {
    expect(Object.keys(enUS).sort()).toEqual(Object.keys(zhCN).sort())
  })
})
