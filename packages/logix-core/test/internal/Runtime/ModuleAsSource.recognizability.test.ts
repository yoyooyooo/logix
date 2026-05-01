import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import * as RuntimeContracts from '../../../src/internal/runtime-contracts.js'
import { RuntimeStoreTag, TickSchedulerTag } from '../../../src/internal/runtime/core/env.js'

describe('Module-as-Source (recognizability gate)', () => {
  it('fails fast when moduleId is not resolvable (ModuleHandle is forbidden)', () => {
    const fakeHandle = {
      read: () => Effect.void,
      changes: () => ({} as any),
      dispatch: () => Effect.void,
      actions$: {} as any,
      actions: {},
    }

    try {
      RuntimeContracts.ExternalInput.fromModule(fakeHandle as any, (s: any) => s)
      throw new Error('Expected ExternalStore.fromModule to throw')
    } catch (err) {
      expect((err as any)?.code).toBe('external_store::unresolvable_module_id')
    }
  })

  it('fails fast when selectorId is unstable (fallbackReason=unstableSelectorId)', () => {
    const Mod = Logix.Module.make('ModuleAsSourceUnstableSelector', {
      state: Schema.Struct({ value: Schema.Number }),
      actions: {},
    })

    try {
      RuntimeContracts.ExternalInput.fromModule(Mod, function (s: any) {
        return (s as any).value + 1
      })
      throw new Error('Expected ExternalStore.fromModule to throw')
    } catch (err) {
      expect((err as any)?.code).toBe('external_store::unstable_selector_id')
    }
  })

  it.effect('dynamic selector (no readsDigest): should degrade to module-topic edge and emit a diagnostic', () =>
    Effect.gen(function* () {
      CoreDebug.clearDevtoolsEvents()

      const Source = Logix.Module.make('ModuleAsSourceDynamicSource', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: { set: Schema.Number },
        reducers: {
          set: Logix.Module.Reducer.mutate<{ value: number }, { payload: number }>((draft, payload) => {
            draft.value = payload
          }),
        },
      })

      const dynamicSelector = (s: { readonly value: number }) => s.value + 0

      const TargetState = Schema.Struct({
        fromSource: Schema.Number,
        keyHash: Schema.String,
      })

      const Target = FieldContracts.withModuleFieldDeclarations(Logix.Module.make('ModuleAsSourceDynamicTarget', {
  state: TargetState,
  actions: {}
}), FieldContracts.fieldFrom(TargetState)({
          fromSource: FieldContracts.fieldExternalStore({
            store: RuntimeContracts.ExternalInput.fromModule(Source, dynamicSelector),
          }),
          keyHash: FieldContracts.fieldComputed({
            deps: ['fromSource'],
            get: (v) => `h:${v}`,
          }),
        }))

      const targetProgram = Logix.Program.make(Target, {
        initial: { fromSource: 0, keyHash: 'h:0' },
        capabilities: {
          imports: [Logix.Program.make(Source, { initial: { value: 0 } })],
        },
      })

      const Root = Logix.Module.make('ModuleAsSourceDynamicRoot', { state: Schema.Void, actions: {} })
      const rootProgram = Logix.Program.make(Root, {
        initial: undefined,
        capabilities: {
          imports: [targetProgram],
        },
      })

      const runtime = Logix.Runtime.make(rootProgram, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
        devtools: { diagnosticsLevel: 'light', bufferSize: 256 },
      })

      try {
        yield* Effect.promise(() =>
          runtime.runPromise(
            Effect.gen(function* () {
              const store = yield* Effect.service(RuntimeStoreTag).pipe(Effect.orDie)
              const scheduler = yield* Effect.service(TickSchedulerTag).pipe(Effect.orDie)

              const sourceRt: any = yield* Effect.service(Source.tag).pipe(Effect.orDie)
              const targetRt: any = yield* Effect.service(Target.tag).pipe(Effect.orDie)

              yield* sourceRt.dispatch({ _tag: 'set', payload: 2 })
              yield* scheduler.flushNow

              expect(store.getTickSeq()).toBe(1)
              expect(yield* targetRt.getState).toEqual({ fromSource: 2, keyHash: 'h:2' })
            }) as any,
          ),
        )
      } finally {
        yield* Effect.promise(() => runtime.dispose())
      }

      const degraded = CoreDebug.getDevtoolsSnapshot().events.filter(
        (e) => (e.meta as any)?.code === 'external_store::module_source_degraded',
      )
      expect(degraded.length).toBeGreaterThanOrEqual(1)
    }),
  )
})
