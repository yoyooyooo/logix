import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const forbiddenHookFamily = ['useFormField', 'useCompanion', 'useFormSelector'] as const

describe('Form read route boundary', () => {
  it('keeps React root and hook barrels on the core useSelector route', () => {
    const reactIndex = readFileSync(new URL('../../../logix-react/src/index.ts', import.meta.url), 'utf8')
    const hooksBarrel = readFileSync(new URL('../../../logix-react/src/Hooks.ts', import.meta.url), 'utf8')
    const rootAllowlist = readFileSync(
      new URL('../../../logix-react/test/Contracts/ReactRootBarrel.allowlist.test.ts', import.meta.url),
      'utf8',
    )

    expect(reactIndex).toMatch(/Hooks\.js/)
    expect(hooksBarrel).toMatch(/useSelector\.js/)

    for (const hookName of forbiddenHookFamily) {
      expect(rootAllowlist).toMatch(new RegExp(`['"]${hookName}['"]`))
      expect(reactIndex).not.toMatch(new RegExp(`\\b${hookName}\\b`))
      expect(hooksBarrel).not.toMatch(new RegExp(`\\b${hookName}\\b`))
    }
  })

  it('keeps Form companion/error reads in examples on useSelector descriptors', () => {
    const hostGate = readFileSync(
      new URL('../../../../examples/logix-react/test/form-companion-host-gate.integration.test.tsx', import.meta.url),
      'utf8',
    )
    const selectorDescriptor = readFileSync(
      new URL('../../../logix-react/test/Hooks/useSelector.formCompanionDescriptor.test.tsx', import.meta.url),
      'utf8',
    )
    const combined = `${hostGate}\n${selectorDescriptor}`

    expect(combined).toMatch(/useSelector\(form,\s*Form\.Companion\.field/)
    expect(combined).toMatch(/useSelector\(form,\s*Form\.Companion\.byRowId/)

    for (const hookName of forbiddenHookFamily) {
      expect(combined).not.toMatch(new RegExp(`\\b${hookName}\\b`))
    }
  })
})
