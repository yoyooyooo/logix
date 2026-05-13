import * as CoreReflection from '@logixjs/core/repo-internal/reflection-api'
import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import * as Debug from '../../../src/internal/debug-api.js'

describe('Runtime action unknown fallback (US1)', () => {
  it.effect('should mark undeclared actions as unknown/opaque', () =>
    Effect.gen(function* () {
      const State = Schema.Struct({ count: Schema.Number })

      const M = Logix.Module.make('Runtime.Action.UnknownFallback', {
        state: State,
        actions: { inc: Schema.Void } as const,
      })

      const programModule = Logix.Program.make(M, { initial: { count: 0 }, logics: [] })
      const manifest = CoreReflection.extractManifest(programModule)
      expect(manifest.actions.map((a) => a.actionTag)).toEqual(['inc'])

      const ring = Debug.makeRingBufferSink(64)
      const runtime = Logix.Runtime.make(programModule, {
        layer: Layer.mergeAll(
          Debug.replace([ring.sink]) as Layer.Layer<any, never, never>,
          Debug.diagnosticsLevel('light'),
        ) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(M.tag).pipe(Effect.orDie)
        yield* rt.dispatch({ _tag: 'inc', payload: undefined } as any)
        yield* rt.dispatch({ _tag: 'boom', payload: 1 } as any)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>)).pipe(
        Effect.ensuring(Effect.promise(() => runtime.dispose()).pipe(Effect.asVoid)),
      )

      const refs = ring
        .getSnapshot()
        .filter((e) => e.type === 'action:dispatch')
        .map((e) => Debug.toRuntimeDebugEventRef(e as any, { diagnosticsLevel: 'light' }))
        .filter((x): x is Debug.RuntimeDebugEventRef => Boolean(x))

      const byLabel = new Map(refs.map((r) => [r.label, r] as const))

      const inc = byLabel.get('inc')
      expect(inc?.kind).toBe('action')
      expect(manifest.actions.find((a) => a.actionTag === inc?.label)).toBeDefined()

      const boom = byLabel.get('boom')
      expect(boom?.kind).toBe('action')
      expect(boom?.downgrade?.reason).toBe('unknown')
      expect((boom as any)?.meta?.unknownAction).toBe(true)
      expect(manifest.actions.find((a) => a.actionTag === boom?.label)).toBeUndefined()
    }),
  )
})
