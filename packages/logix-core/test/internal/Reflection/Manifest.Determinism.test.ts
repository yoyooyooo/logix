import { describe, it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../../src/index.js'

const utf8Bytes = (value: unknown): Uint8Array => new TextEncoder().encode(JSON.stringify(value))

describe('Reflection.extractManifest determinism (US2)', () => {
  it('should be byte-identical for the same input (effects absent)', () => {
    const State = Schema.Struct({ value: Schema.Number })

    const Root = Logix.Module.make('Reflection.Manifest.Determinism.EmptyEffects', {
      state: State,
      actions: { ping: Schema.Number } as const,
    })

    const impl = Root.implement({ initial: { value: 0 }, logics: [] })

    const a = Logix.Reflection.extractManifest(impl)
    const b = Logix.Reflection.extractManifest(impl)

    expect(utf8Bytes(a)).toEqual(utf8Bytes(b))
    expect(a).toEqual(b)
    expect(a.digest).toBe(b.digest)
    expect(a.effects).toBeUndefined()
  })

  it('should include a stably sorted effects[] when declared', () => {
    const State = Schema.Struct({ value: Schema.Number })

    const h1 = (_$: unknown, _payload: number) => Effect.void
    const h2 = (_$: unknown, _payload: number) => Effect.void

    const Root = Logix.Module.make('Reflection.Manifest.Determinism.WithEffects', {
      state: State,
      actions: { b: Schema.Number, a: Schema.Number } as const,
      effects: {
        b: [h2],
        a: [h1, h1, h2],
      },
    })

    const impl = Root.implement({ initial: { value: 0 }, logics: [] })

    const a = Logix.Reflection.extractManifest(impl)
    const b = Logix.Reflection.extractManifest(impl)

    expect(utf8Bytes(a)).toEqual(utf8Bytes(b))
    expect(a).toEqual(b)
    expect(a.digest).toBe(b.digest)

    const effects = a.effects ?? []
    expect(effects.length).toBeGreaterThan(0)

    const seen = new Set<string>()
    for (const e of effects) {
      const key = `${e.actionTag}\u0000${e.sourceKey}`
      expect(seen.has(key)).toBe(false)
      seen.add(key)
    }

    for (let i = 1; i < effects.length; i++) {
      const prev = effects[i - 1]!
      const next = effects[i]!
      expect(
        prev.actionTag < next.actionTag ||
          (prev.actionTag === next.actionTag && prev.sourceKey.localeCompare(next.sourceKey) <= 0),
      ).toBe(true)
    }
  })
})

