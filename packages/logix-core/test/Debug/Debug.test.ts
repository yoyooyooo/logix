import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, FiberRef, Logger, HashSet } from 'effect'
import * as Logix from '../../src/index.js'

describe('Debug (public API)', () => {
  it.effect('record should be a no-op when no DebugSink is provided', () =>
    Logix.Debug.record({
      type: 'module:init',
      moduleId: 'test-module',
    }),
  )

  it.effect('record should delegate to provided DebugSink implementation', () =>
    Effect.gen(function* () {
      const events: Logix.Debug.Event[] = []

      const sink: Logix.Debug.Sink = {
        record: (event: Logix.Debug.Event) =>
          Effect.sync(() => {
            events.push(event)
          }),
      }

      // 直接通过 FiberRef 在当前 Fiber 上挂载 DebugSink，避免误用 Layer / Context。
      yield* Effect.locally(
        Logix.Debug.internal.currentDiagnosticsLevel as any,
        'full',
      )(
        Effect.locally(Logix.Debug.internal.currentDebugSinks as any, [sink])(
          Logix.Debug.record({
            type: 'module:init',
            moduleId: 'test-module',
          }),
        ),
      )

      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject({
        type: 'module:init',
        moduleId: 'test-module',
      })
      expect(typeof events[0]?.timestamp).toBe('number')
    }),
  )

  it.effect('Debug.layer (dev) should be buildable as a Layer', () =>
    Effect.gen(function* () {
      const layer = Logix.Debug.layer({ mode: 'dev' })
      expect(layer).toBeDefined()
      expect(Layer.LayerTypeId in (layer as any)).toBe(true)
    }),
  )

  it.effect('Debug.layer should accept diagnosticsLevel option', () =>
    Effect.gen(function* () {
      const level = yield* FiberRef.get(Logix.Debug.internal.currentDiagnosticsLevel as any).pipe(
        Effect.provide(Logix.Debug.layer({ mode: 'dev', diagnosticsLevel: 'full' })),
      )
      expect(level).toBe('full')
    }),
  )

  it.effect('withPrettyLogger should replace default logger', () =>
    Effect.gen(function* () {
      const before = yield* FiberRef.get(FiberRef.currentLoggers)
      const sizeBefore = HashSet.size(before)

      const after = yield* FiberRef.get(FiberRef.currentLoggers).pipe(
        Effect.provide(
          Logix.Debug.withPrettyLogger(Layer.empty as unknown as Layer.Layer<any, any, any>) as Layer.Layer<
            any,
            never,
            never
          >,
        ),
      )
      const hasDefaultAfter = HashSet.some(after, (logger) => logger === Logger.defaultLogger)
      const sizeAfter = HashSet.size(after)

      // 提供后不应再包含默认 logger，且 logger 集合非空（被有效替换）。
      expect(hasDefaultAfter).toBe(false)
      expect(sizeAfter).toBeGreaterThanOrEqual(sizeBefore === 0 ? 1 : sizeBefore)
    }),
  )

  it.effect('makeModuleRuntimeCounterSink should track instance counts per runtimeLabel::moduleId', () =>
    Effect.gen(function* () {
      const { sink, getSnapshot } = Logix.Debug.makeModuleRuntimeCounterSink()

      // 模拟两个模块及多次 init/destroy
      yield* sink.record({ type: 'module:init', moduleId: 'A' })
      yield* sink.record({ type: 'module:init', moduleId: 'A' })
      yield* sink.record({ type: 'module:init', moduleId: 'B' })
      yield* sink.record({ type: 'module:destroy', moduleId: 'A' })

      const snapshot = getSnapshot()
      // 未显式提供 runtimeLabel 时，默认归为 "unknown" 作用域。
      expect(snapshot.get('unknown::A')).toBe(1)
      expect(snapshot.get('unknown::B')).toBe(1)

      // destroy 到 0 后应从快照中删除
      yield* sink.record({ type: 'module:destroy', moduleId: 'A' })
      const snapshotAfter = getSnapshot()
      expect(snapshotAfter.has('unknown::A')).toBe(false)
      expect(snapshotAfter.get('unknown::B')).toBe(1)
    }),
  )

  it.effect('makeRingBufferSink should keep a bounded, ordered window of events', () =>
    Effect.gen(function* () {
      const { sink, getSnapshot, clear } = Logix.Debug.makeRingBufferSink(2)

      // 初始为空
      expect(getSnapshot()).toHaveLength(0)

      // 推入三条事件，capacity=2，只保留后两条
      yield* sink.record({ type: 'module:init', moduleId: 'A' })
      yield* sink.record({ type: 'module:init', moduleId: 'B' })
      yield* sink.record({ type: 'module:init', moduleId: 'C' })

      const snapshot = getSnapshot()
      expect(snapshot).toHaveLength(2)
      expect(snapshot[0]).toEqual({ type: 'module:init', moduleId: 'B' })
      expect(snapshot[1]).toEqual({ type: 'module:init', moduleId: 'C' })

      clear()
      expect(getSnapshot()).toHaveLength(0)
    }),
  )

  it.effect('toRuntimeDebugEventRef should normalize action/state events', () =>
    Effect.gen(function* () {
      const actionEvent: Logix.Debug.Event = {
        type: 'action:dispatch',
        moduleId: 'M1',
        instanceId: 'i-1',
        action: { _tag: 'inc', payload: 1 },
      }

      const stateEvent: Logix.Debug.Event = {
        type: 'state:update',
        moduleId: 'M1',
        instanceId: 'i-1',
        state: { count: 1 },
      }

      const actionRef = Logix.Debug.internal.toRuntimeDebugEventRef(actionEvent)
      const stateRef = Logix.Debug.internal.toRuntimeDebugEventRef(stateEvent)

      expect(actionRef).toBeDefined()
      expect(actionRef?.kind).toBe('action')
      expect(actionRef?.label).toBe('inc')
      expect(actionRef?.moduleId).toBe('M1')
      expect(actionRef?.instanceId).toBe('i-1')

      expect(stateRef).toBeDefined()
      expect(stateRef?.kind).toBe('state')
      expect(stateRef?.label).toBe('state:update')
      expect(stateRef?.moduleId).toBe('M1')
      expect(stateRef?.instanceId).toBe('i-1')
    }),
  )

  it.effect('toRuntimeDebugEventRef should normalize trace:effectop into service/runtime events', () =>
    Effect.gen(function* () {
      const effectOp = {
        id: 'op-1',
        kind: 'service',
        name: 'UserApi.loadProfile',
        meta: {
          moduleId: 'ServiceModule',
          resourceId: 'UserApi',
          key: 'loadProfile',
        },
        // effect 字段在本测试中不会真正执行，因此用 Effect.void 即可。
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        effect: Effect.void as any,
      }

      const traceEvent: Logix.Debug.Event = {
        type: 'trace:effectop',
        moduleId: 'FallbackModule',
        instanceId: 'i-service',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: effectOp as any,
      }

      const ref = Logix.Debug.internal.toRuntimeDebugEventRef(traceEvent)

      expect(ref).toBeDefined()
      expect(ref?.kind).toBe('service')
      expect(ref?.label).toBe('UserApi.loadProfile')
      // 优先使用 EffectOp.meta.moduleId，而不是事件上的 moduleId。
      expect(ref?.moduleId).toBe('ServiceModule')
      expect((ref?.meta as any)?.meta?.resourceId).toBe('UserApi')
    }),
  )

  it.effect('toRuntimeDebugEventRef should enforce SlimOp budgets (full vs light) and remain JSON.stringify-safe', () =>
    Effect.gen(function* () {
      const bigString = 'x'.repeat(10_000)
      const bigArray = Array.from({ length: 100 }, (_, i) => `v${i}`)
      const bigObject: Record<string, unknown> = {}
      for (let i = 0; i < 100; i++) {
        bigObject[`k${String(i).padStart(3, '0')}`] = i
      }

      const effectOp = {
        id: 'op-big',
        kind: 'service',
        name: 'BigMeta.op',
        payload: {
          bigString,
          bigArray,
          bigObject,
        },
        meta: {
          moduleId: 'BigMetaModule',
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          fn: () => {},
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        effect: Effect.void as any,
      }

      const traceEvent: Logix.Debug.Event = {
        type: 'trace:effectop',
        moduleId: 'FallbackModule',
        instanceId: 'i-service',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: effectOp as any,
      }

      const full: any = Logix.Debug.internal.toRuntimeDebugEventRef(traceEvent, {
        diagnosticsLevel: 'full',
      })
      expect(full?.moduleId).toBe('BigMetaModule')
      expect(full?.kind).toBe('service')

      const fullJson = JSON.stringify(full?.meta)
      expect(fullJson.length).toBeLessThanOrEqual(4 * 1024)
      expect(full?.meta?.payload?.bigString?.length).toBe(256)
      expect(full?.meta?.payload?.bigArray).toHaveLength(33)
      expect(full?.meta?.payload?.bigArray?.[32]).toBe('[...68 more]')
      expect(full?.meta?.payload?.bigObject?.__truncatedKeys).toBe(68)
      expect(full?.meta?.meta?.fn).toBe('[Function]')

      const light: any = Logix.Debug.internal.toRuntimeDebugEventRef(traceEvent, {
        diagnosticsLevel: 'light',
      })
      expect(light?.moduleId).toBe('BigMetaModule')
      expect(light?.kind).toBe('service')

      const lightJson = JSON.stringify(light?.meta)
      expect(lightJson.length).toBeLessThanOrEqual(4 * 1024)
      expect(light?.meta?.payload).toBeUndefined()
      expect(light?.meta?.meta?.fn).toBe('[Function]')
    }),
  )
})
