import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('BoundApiRuntime decomposition guard', () => {
  it('keeps readiness registration in the readiness helper and assembles it from BoundApiRuntime', () => {
    const coordinator = readFileSync(
      new URL('../../../src/internal/runtime/core/BoundApiRuntime.ts', import.meta.url),
      'utf8',
    )
    const readiness = readFileSync(
      new URL('../../../src/internal/runtime/core/BoundApiRuntime.readiness.ts', import.meta.url),
      'utf8',
    )

    expect(coordinator).toContain("from './BoundApiRuntime.readiness.js'")
    expect(coordinator).toContain('Readiness.makeReadyAfter')
    expect(coordinator).not.toContain('registerInitRequired(eff as any')
    expect(readiness).toContain('makeReadyAfter')
    expect(readiness).toContain('registerInitRequired')
  })
})
