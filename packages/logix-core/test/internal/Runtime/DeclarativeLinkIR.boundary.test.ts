import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Deferred, Effect, Layer, Schema, Stream } from 'effect'
import * as Logix from '../../../src/index.js'
import { RuntimeStoreTag, TickSchedulerTag } from '../../../src/internal/runtime/core/env.js'

describe('DeclarativeLinkIR boundary (declarative vs blackbox)', () => {
  it.effect('declarative link: should settle within the same tick', () =>
    Effect.gen(function* () {
      Logix.Debug.clearDevtoolsEvents()

      const Source = Logix.Module.make('DeclarativeLinkIRSource', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: { set: Schema.Number },
        reducers: {
          set: (state, action) => ({ ...state, value: action.payload }),
        },
      })

      const Target = Logix.Module.make('DeclarativeLinkIRTarget', {
        state: Schema.Struct({ mirror: Schema.Number }),
        actions: { setMirror: Schema.Number },
        reducers: {
          setMirror: (state, action) => ({ ...state, mirror: action.payload }),
        },
      })

      const ValueRead = Logix.ReadQuery.make({
        selectorId: 'rq_dlink_value',
        debugKey: 'DeclarativeLinkIRSource.value',
        reads: ['value'],
        select: (s: { readonly value: number }) => s.value,
        equalsKind: 'objectIs',
      })

      const DeclarativeLink = Logix.Process.linkDeclarative(
        { id: 'dlink', modules: [Source, Target] as const },
        ($) => [{ from: $[Source.id].read(ValueRead), to: $[Target.id].dispatch('setMirror') }],
      )

      const Root = Logix.Module.make('DeclarativeLinkIRRoot', { state: Schema.Void, actions: {} })
      const RootImpl = Root.implement({
        initial: undefined,
        imports: [
          Source.implement({ initial: { value: 0 } }).impl,
          Target.implement({ initial: { mirror: 0 } }).impl,
        ],
        processes: [DeclarativeLink],
      })

      const runtime = Logix.Runtime.make(RootImpl, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
        devtools: { diagnosticsLevel: 'light', bufferSize: 128 },
      })

      try {
        yield* Effect.promise(() =>
          runtime.runPromise(
            Effect.gen(function* () {
              const store = yield* RuntimeStoreTag
              const scheduler = yield* TickSchedulerTag

              const sourceRt: any = yield* Source.tag
              const targetRt: any = yield* Target.tag

              const sourceKey = `${sourceRt.moduleId}::${sourceRt.instanceId}` as `${string}::${string}`
              const targetKey = `${targetRt.moduleId}::${targetRt.instanceId}` as `${string}::${string}`
              expect(store.getModuleState(sourceKey)).toEqual({ value: 0 })
              expect(store.getModuleState(targetKey)).toEqual({ mirror: 0 })

              yield* sourceRt.dispatch({ _tag: 'set', payload: 1 })
              yield* scheduler.flushNow

              expect(store.getTickSeq()).toBe(1)
              expect(yield* sourceRt.getState).toEqual({ value: 1 })
              expect(yield* targetRt.getState).toEqual({ mirror: 1 })
            }) as any,
          ),
        )
      } finally {
        yield* Effect.promise(() => runtime.dispose())
      }
    }),
  )

  it.effect('blackbox link: best-effort (Next Tick) + emits diagnostic boundary', () =>
    Effect.gen(function* () {
      Logix.Debug.clearDevtoolsEvents()

      const Source = Logix.Module.make('BlackboxLinkIRSource', {
        state: Schema.Struct({ value: Schema.Number }),
        actions: { set: Schema.Number },
        reducers: {
          set: (state, action) => ({ ...state, value: action.payload }),
        },
      })

      const Target = Logix.Module.make('BlackboxLinkIRTarget', {
        state: Schema.Struct({ mirror: Schema.Number }),
        actions: { setMirror: Schema.Number },
        reducers: {
          setMirror: (state, action) => ({ ...state, mirror: action.payload }),
        },
      })

      const dispatched = yield* Deferred.make<void>()

      type SourceAction = Logix.ActionOf<typeof Source.shape>

      const BlackboxLink = Logix.Process.link(
        { id: 'blackbox', modules: [Source, Target] as const },
        ($) =>
          Effect.gen(function* () {
            const source = $[Source.id]
            const target = $[Target.id]

            yield* source.actions$.pipe(
              Stream.runForEach((action: SourceAction) => {
                if (action._tag !== 'set') return Effect.void
                return Effect.promise(() => new Promise<void>((r) => setTimeout(r, 0))).pipe(
                  Effect.zipRight(target.actions.setMirror(action.payload)),
                  Effect.tap(() => Deferred.succeed(dispatched, undefined)),
                  Effect.asVoid,
                )
              }),
            )
          }),
      )

      const Root = Logix.Module.make('BlackboxLinkIRRoot', { state: Schema.Void, actions: {} })
      const RootImpl = Root.implement({
        initial: undefined,
        imports: [
          Source.implement({ initial: { value: 0 } }).impl,
          Target.implement({ initial: { mirror: 0 } }).impl,
        ],
        processes: [BlackboxLink],
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

              yield* sourceRt.dispatch({ _tag: 'set', payload: 1 })
              yield* scheduler.flushNow

              expect(store.getTickSeq()).toBe(1)
              expect(yield* sourceRt.getState).toEqual({ value: 1 })
              expect(yield* targetRt.getState).toEqual({ mirror: 0 })

              yield* Deferred.await(dispatched).pipe(Effect.timeout('1 second'))
              yield* scheduler.flushNow

              expect(store.getTickSeq()).toBe(2)
              expect(yield* targetRt.getState).toEqual({ mirror: 1 })
            }) as any,
          ),
        )
      } finally {
        yield* Effect.promise(() => runtime.dispose())
      }

      const blackboxBoundary = Logix.Debug.getDevtoolsSnapshot().events.filter(
        (e) => (e.meta as any)?.code === 'process_link::blackbox_best_effort',
      )
      expect(blackboxBoundary.length).toBeGreaterThanOrEqual(1)
    }),
  )
})
