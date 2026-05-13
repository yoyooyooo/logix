import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { describe, it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import * as ModuleRuntimeImpl from '../../../src/internal/runtime/core/ModuleRuntime.js'
import * as BoundApiRuntime from '../../../src/internal/runtime/core/BoundApiRuntime.js'

describe('FieldKernel deps diagnostics (dev-mode)', () => {
  it.effect('computed deps mismatch emits diagnostic', () =>
    Effect.gen(function* () {
      const ring = CoreDebug.makeRingBufferSink(64)

      const StateSchema = Schema.Struct({
        a: Schema.Number,
        b: Schema.Number,
        sum: Schema.Number,
      })

      type State = Schema.Schema.Type<typeof StateSchema>

      const fieldSpec = FieldContracts.fieldFrom(StateSchema)({
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

      const program = FieldContracts.buildFieldProgram(StateSchema, fieldSpec)

      const initial: State = { a: 1, b: 2, sum: 0 }

      yield* Effect.provideService(Effect.provideService(Effect.gen(function* () {
        type Shape = Logix.Module.Shape<typeof StateSchema, { noop: typeof Schema.Void }>
        type Action = Logix.Module.ActionOf<Shape>
            
        const runtime = yield* ModuleRuntimeImpl.make<State, Action>(initial, {
          moduleId: 'FieldKernelDepsDiagnostics-Computed',
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
            moduleId: 'FieldKernelDepsDiagnostics-Computed',
          },
        )
            
        yield* FieldContracts.installFieldProgram(bound as any, program)
            
        // Trigger a transaction window (even if reducer is a no-op) to enter converge and run deps tracing.
        yield* runtime.setState({ ...initial })
      }), CoreDebug.internal.currentDiagnosticsLevel, 'light'), CoreDebug.internal.currentDebugSinks, [ring.sink])

      const diags = ring
        .getSnapshot()
        .filter((e) => e.type === 'diagnostic' && (e as any).code === 'field_kernel::deps_mismatch') as any[]

      expect(diags.some((e) => (e as any).kind === 'deps_mismatch:computed')).toBe(true)
    }),
  )

  // NOTE: `FieldKernel.source({ key })` is deps-as-args (no `key(state)`), so "key reads outside deps" is structurally prevented.
})
