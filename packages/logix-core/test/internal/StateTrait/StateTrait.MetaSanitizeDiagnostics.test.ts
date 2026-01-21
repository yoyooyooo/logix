import { describe, it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import * as ModuleRuntimeImpl from '../../../src/internal/runtime/ModuleRuntime.js'
import * as BoundApiRuntime from '../../../src/internal/runtime/BoundApiRuntime.js'

describe('StateTrait meta diagnostics (dev-mode)', () => {
  it.scoped('TraitMeta sanitize emits diagnostic when dropping/ignoring values', () =>
    Effect.gen(function* () {
      const ring = Logix.Debug.makeRingBufferSink(64)

      const StateSchema = Schema.Struct({
        a: Schema.Number,
        out: Schema.Unknown,
      })

      type State = Schema.Schema.Type<typeof StateSchema>

      const badNodeMeta: any = {
        label: 'root',
        formatter: (x: unknown) => x, // unknown key (ignored)
        annotations: {
          'x-ok': 1,
          bad: 'should-use-x-prefix', // ignored (non x-*)
        },
      }

      const badSourceMeta: any = {
        label: 'out',
        annotations: {
          'x-formatter': (x: unknown) => x, // non-serializable (dropped)
        },
      }

      const traits = Logix.StateTrait.from(StateSchema)({
        $root: Logix.StateTrait.node({
          meta: badNodeMeta,
        }),
        out: Logix.StateTrait.source({
          resource: 'Resource:MetaSanitize',
          deps: ['a'],
          key: (a) => a,
          meta: badSourceMeta,
        }),
      })

      const program = Logix.StateTrait.build(StateSchema, traits)

      const initial: State = {
        a: 1,
        out: undefined,
      }

      yield* Effect.locally(Logix.Debug.internal.currentDebugSinks, [ring.sink])(
        Effect.locally(
          Logix.Debug.internal.currentDiagnosticsLevel,
          'light',
        )(
          Effect.gen(function* () {
            type Shape = Logix.Module.Shape<typeof StateSchema, { noop: typeof Schema.Void }>
            type Action = Logix.Module.ActionOf<Shape>

            const runtime = yield* ModuleRuntimeImpl.make<State, Action>(initial, {
              moduleId: 'StateTraitMetaSanitizeDiagnostics',
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
                moduleId: 'StateTraitMetaSanitizeDiagnostics',
              },
            )

            yield* Logix.StateTrait.install(bound as any, program)
          }),
        ),
      )

      const diags = ring
        .getSnapshot()
        .filter((e) => e.type === 'diagnostic' && (e as any).code === 'state_trait::meta_sanitized') as any[]

      expect(diags.length).toBeGreaterThan(0)
      expect(diags[0].message).toContain('node:$root')
      expect(diags[0].message).toContain('source:out')
      expect(diags[0].message).toContain('x-formatter')
    }),
  )
})

