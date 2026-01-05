import { describe, it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import * as ModuleRuntimeImpl from '../../../src/internal/runtime/ModuleRuntime.js'
import * as BoundApiRuntime from '../../../src/internal/runtime/BoundApiRuntime.js'

describe('StateTrait deps diagnostics (dev-mode)', () => {
  it.scoped('computed deps mismatch emits diagnostic', () =>
    Effect.gen(function* () {
      const ring = Logix.Debug.makeRingBufferSink(64)

      const StateSchema = Schema.Struct({
        a: Schema.Number,
        b: Schema.Number,
        sum: Schema.Number,
      })

      type State = Schema.Schema.Type<typeof StateSchema>

      const traits = Logix.StateTrait.from(StateSchema)({
        // Create a deps mismatch via a "hand-written entry": derive reads b but deps declares only a.
        // The deps-as-args DSL enforces `deps` as the read-set; keep this test to cover the hand-written entry safety net.
        sum: {
          fieldPath: undefined as unknown as 'sum',
          kind: 'computed',
          meta: {
            deps: ['a'], // missing "b"
            derive: (s: any) => s.a + s.b,
          },
        } as any,
      })

      const program = Logix.StateTrait.build(StateSchema, traits)

      const initial: State = { a: 1, b: 2, sum: 0 }

      yield* Effect.locally(Logix.Debug.internal.currentDebugSinks, [ring.sink])(
        Effect.locally(
          Logix.Debug.internal.currentDiagnosticsLevel,
          'light',
        )(
          Effect.gen(function* () {
            type Shape = Logix.Module.Shape<typeof StateSchema, { noop: typeof Schema.Void }>
            type Action = Logix.Module.ActionOf<Shape>

            const runtime = yield* ModuleRuntimeImpl.make<State, Action>(initial, {
              moduleId: 'StateTraitDepsDiagnostics-Computed',
            })

            const bound = BoundApiRuntime.make<Shape, never>(
              {
                stateSchema: StateSchema,
                actionSchema: Schema.Never as any,
                actionMap: { noop: Schema.Void } as any,
              } as any,
              runtime as any,
              {
                getPhase: () => 'run',
                moduleId: 'StateTraitDepsDiagnostics-Computed',
              },
            )

            yield* Logix.StateTrait.install(bound as any, program)

            // Trigger a transaction window (even if reducer is a no-op) to enter converge and run deps tracing.
            yield* runtime.setState({ ...initial })
          }),
        ),
      )

      const diags = ring
        .getSnapshot()
        .filter((e) => e.type === 'diagnostic' && (e as any).code === 'state_trait::deps_mismatch') as any[]

      expect(diags.some((e) => (e as any).kind === 'deps_mismatch:computed')).toBe(true)
    }),
  )

  // NOTE: `StateTrait.source({ key })` is deps-as-args (no `key(state)`), so "key reads outside deps" is structurally prevented.
})
