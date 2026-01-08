import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
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
      Logix.ExternalStore.fromModule(fakeHandle as any, (s: any) => s)
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
      Logix.ExternalStore.fromModule(Mod, function (s: any) {
        return (s as any).value + 1
      })
      throw new Error('Expected ExternalStore.fromModule to throw')
    } catch (err) {
      expect((err as any)?.code).toBe('external_store::unstable_selector_id')
    }
  })

  it.effect('dynamic selector (no readsDigest): should degrade to module-topic edge and emit a diagnostic', () =>
    Effect.gen(function* () {
      Logix.Debug.clearDevtoolsEvents()

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

      const Target = Logix.Module.make('ModuleAsSourceDynamicTarget', {
        state: TargetState,
        actions: {},
        traits: Logix.StateTrait.from(TargetState)({
          fromSource: Logix.StateTrait.externalStore({
            store: Logix.ExternalStore.fromModule(Source, dynamicSelector),
          }),
          keyHash: Logix.StateTrait.computed({
            deps: ['fromSource'],
            get: (v) => `h:${v}`,
          }),
        }),
      })

      const TargetImpl = Target.implement({
        initial: { fromSource: 0, keyHash: 'h:0' },
        imports: [Source.implement({ initial: { value: 0 } }).impl],
      })

      const Root = Logix.Module.make('ModuleAsSourceDynamicRoot', { state: Schema.Void, actions: {} })
      const RootImpl = Root.implement({
        initial: undefined,
        imports: [TargetImpl.impl],
      })

      const runtime = Logix.Runtime.make(RootImpl, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
        devtools: { diagnosticsLevel: 'light', bufferSize: 256 },
      })

      try {
        yield* Effect.promise(() =>
          runtime.runPromise(
            Effect.gen(function* () {
              const store = yield* RuntimeStoreTag
              const scheduler = yield* TickSchedulerTag

              const sourceRt: any = yield* Source.tag
              const targetRt: any = yield* Target.tag

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

      const degraded = Logix.Debug.getDevtoolsSnapshot().events.filter(
        (e) => (e.meta as any)?.code === 'external_store::module_source_degraded',
      )
      expect(degraded.length).toBeGreaterThanOrEqual(1)
    }),
  )
})
