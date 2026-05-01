import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { describe, it, expect } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('LogicFields module-level expert warning', () => {
  it('should emit a warning when module-level fields are used', async () => {
    const events: CoreDebug.Event[] = []

    const sink: CoreDebug.Sink = {
      record: (event) =>
        Effect.sync(() => {
          events.push(event)
        }),
    }

    const State = Schema.Struct({
      value: Schema.Number,
      sum: Schema.Number,
    })

    const ModuleWithFields = FieldContracts.withModuleFieldDeclarations(
      Logix.Module.make('ModuleLevelFieldsWarning', {
        state: State,
        actions: { noop: Schema.Void },
      }),
      FieldContracts.fieldFrom(State)({
        sum: FieldContracts.fieldComputed({
          deps: ['value'],
          get: (value) => value,
        }),
      }),
    )

    const program = Logix.Program.make(ModuleWithFields, {
      initial: { value: 1, sum: 0 },
    })

    const runtime = Logix.Runtime.make(program, {
      layer: Layer.mergeAll(
        Layer.succeed(CoreDebug.internal.currentDebugSinks as any, [sink]),
        Layer.succeed(CoreDebug.internal.currentDiagnosticsLevel as any, 'light'),
      ) as Layer.Layer<any, never, never>,
    })

    try {
      await runtime.runPromise(
        Effect.gen(function* () {
          yield* Effect.service(ModuleWithFields.tag).pipe(Effect.orDie)
        }),
      )

      const warning = events.find(
        (event) =>
          event.type === 'diagnostic' &&
          event.code === 'module_fields::expert_path' &&
          event.kind === 'module_level_fields_legacy',
      )

      expect(warning).toBeDefined()
      expect(warning?.type === 'diagnostic' ? warning.severity : undefined).toBe('warning')
      expect(warning?.moduleId).toBe('ModuleLevelFieldsWarning')
    } finally {
      await runtime.dispose()
    }
  })
})
