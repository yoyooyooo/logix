import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { describe, it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import * as ModuleRuntimeImpl from '../../../src/internal/runtime/core/ModuleRuntime.js'
import * as BoundApiRuntime from '../../../src/internal/runtime/core/BoundApiRuntime.js'

describe('FieldKernel meta diagnostics (dev-mode)', () => {
  it.effect('FieldMeta sanitize emits diagnostic when dropping/ignoring values', () =>
    Effect.gen(function* () {
      const ring = CoreDebug.makeRingBufferSink(64)

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

      const fieldSpec = FieldContracts.fieldFrom(StateSchema)({
        $root: FieldContracts.fieldNode({
          meta: badNodeMeta,
        }),
        out: FieldContracts.fieldSource({
          resource: 'Resource:MetaSanitize',
          deps: ['a'],
          key: (a) => a,
          meta: badSourceMeta,
        }),
      })

      const program = FieldContracts.buildFieldProgram(StateSchema, fieldSpec)

      const initial: State = {
        a: 1,
        out: undefined,
      }

      yield* Effect.provideService(Effect.provideService(Effect.gen(function* () {
        type Shape = Logix.Module.Shape<typeof StateSchema, { noop: typeof Schema.Void }>
        type Action = Logix.Module.ActionOf<Shape>
            
        const runtime = yield* ModuleRuntimeImpl.make<State, Action>(initial, {
          moduleId: 'FieldKernelMetaSanitizeDiagnostics',
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
            moduleId: 'FieldKernelMetaSanitizeDiagnostics',
          },
        )
            
        yield* FieldContracts.installFieldProgram(bound as any, program)
      }), CoreDebug.internal.currentDiagnosticsLevel, 'light'), CoreDebug.internal.currentDebugSinks, [ring.sink])

      const diags = ring
        .getSnapshot()
        .filter((e) => e.type === 'diagnostic' && (e as any).code === 'field_kernel::meta_sanitized') as any[]

      expect(diags.length).toBeGreaterThan(0)
      expect(diags[0].message).toContain('node:$root')
      expect(diags[0].message).toContain('source:out')
      expect(diags[0].message).toContain('x-formatter')
    }),
  )
})
