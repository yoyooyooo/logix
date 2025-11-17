import { describe, it, expect } from '@effect/vitest'
import { Schema } from 'effect'
import * as Logix from '../src/index.js'

describe('Reflection.extractManifest (budgets)', () => {
  it('should apply maxBytes and mark truncation (no silent failure)', () => {
    const Root = Logix.Module.make('Reflection.Manifest.Budgets', {
      state: Schema.Struct({ value: Schema.Number }),
      actions: { bump: Schema.Void },
      meta: {
        // Intentionally large to force trimming.
        big: 'x'.repeat(10_000),
      },
    })

    const program = Root.implement({ initial: { value: 0 }, logics: [] })

    const manifest = Logix.Reflection.extractManifest(program, {
      budgets: { maxBytes: 512 },
    })

    const json = JSON.stringify(manifest)
    const bytes = new TextEncoder().encode(json).length
    expect(bytes).toBeLessThanOrEqual(512)
    expect((manifest as any).meta?.__logix?.truncated).toBe(true)
  })
})
