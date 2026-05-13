import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Host signal ownership', () => {
  it('keeps suspend, resume, and reset on Platform internals rather than public Logic authoring', () => {
    const boundApiSource = readFileSync(
      new URL('../../src/internal/runtime/core/BoundApiRuntime.ts', import.meta.url),
      'utf8',
    )
    const moduleTypeSource = readFileSync(new URL('../../src/internal/runtime/core/module.ts', import.meta.url), 'utf8')
    const platformSource = readFileSync(new URL('../../src/internal/runtime/core/Platform.ts', import.meta.url), 'utf8')

    expect(boundApiSource).not.toContain('lifecycle:')
    expect(boundApiSource).not.toContain('onSuspend')
    expect(boundApiSource).not.toContain('onResume')
    expect(boundApiSource).not.toContain('onReset')
    expect(moduleTypeSource).not.toContain('onSuspend')
    expect(moduleTypeSource).not.toContain('onResume')
    expect(moduleTypeSource).not.toContain('onReset')

    expect(platformSource).toContain('onSuspend')
    expect(platformSource).toContain('onResume')
    expect(platformSource).toContain('onReset')
  })
})
