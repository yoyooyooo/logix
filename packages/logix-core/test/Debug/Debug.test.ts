import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Logger } from 'effect'
import * as Logix from '../../src/index.js'

describe('Debug (public API)', () => {
  it.effect('record should be a no-op when no DebugSink is provided', () =>
    CoreDebug.record({
      type: 'module:init',
      moduleId: 'test-module',
    }),
  )

  it.effect('record should delegate to provided DebugSink implementation', () =>
    Effect.gen(function* () {
      const events: CoreDebug.Event[] = []

      const sink: CoreDebug.Sink = {
        record: (event: CoreDebug.Event) =>
          Effect.sync(() => {
            events.push(event)
          }),
      }

      yield* Effect.provideService(
        Effect.provideService(
          CoreDebug.record({
            type: 'module:init',
            moduleId: 'test-module',
          }),
          CoreDebug.internal.currentDebugSinks,
          [sink],
        ),
        CoreDebug.internal.currentDiagnosticsLevel,
        'full',
      )

      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject({
        type: 'module:init',
        moduleId: 'test-module',
      })
      expect(typeof events[0]?.timestamp).toBe('number')
    }),
  )

  it.effect('record should preserve sink failure propagation in multi-sink dispatch', () =>
    Effect.gen(function* () {
      const events: CoreDebug.Event[] = []

      const brokenSink: CoreDebug.Sink = {
        record: () =>
          Effect.sync(() => {
            throw new Error('sink failure')
          }),
      }

      const healthySink: CoreDebug.Sink = {
        record: (event: CoreDebug.Event) =>
          Effect.sync(() => {
            events.push(event)
          }),
      }

      const exit = yield* Effect.exit(
        Effect.provideService(
          Effect.provideService(
            CoreDebug.record({
              type: 'module:init',
              moduleId: 'test-module',
            }),
            CoreDebug.internal.currentDebugSinks,
            [brokenSink, healthySink],
          ),
          CoreDebug.internal.currentDiagnosticsLevel,
          'full',
        ),
      )

      expect(exit._tag).toBe('Failure')
      expect(events).toHaveLength(0)
    }),
  )

  it.effect('Debug.layer (dev) should be buildable as a Layer', () =>
    Effect.gen(function* () {
      const layer = CoreDebug.layer({ mode: 'dev' })
      expect(layer).toBeDefined()
      expect(Layer.isLayer(layer)).toBe(true)
    }),
  )

  it.effect('Debug.layer should accept diagnosticsLevel option', () =>
    Effect.gen(function* () {
      const level = yield* Effect.service(CoreDebug.internal.currentDiagnosticsLevel).pipe(
        Effect.provide(CoreDebug.layer({ mode: 'dev', diagnosticsLevel: 'full' })),
      )
      expect(level).toBe('full')
    }),
  )

  it.effect('withPrettyLogger should replace default logger', () =>
    Effect.gen(function* () {
      const before = yield* Effect.service(Logger.CurrentLoggers)
      const sizeBefore = before.size

      const after = yield* Effect.service(Logger.CurrentLoggers).pipe(
        Effect.provide(
          CoreDebug.withPrettyLogger(Layer.empty as unknown as Layer.Layer<any, any, any>) as Layer.Layer<
            any,
            never,
            never
          >,
        ),
      )
      const hasDefaultAfter = [...after].some((logger) => logger === Logger.defaultLogger)
      const sizeAfter = after.size

      // After providing, default logger should be removed and the logger set should be non-empty (effectively replaced).
      expect(hasDefaultAfter).toBe(false)
      expect(sizeAfter).toBeGreaterThanOrEqual(sizeBefore === 0 ? 1 : sizeBefore)
    }),
  )

  it.effect('makeModuleRuntimeCounterSink should track instance counts per runtimeLabel::moduleId', () =>
    Effect.gen(function* () {
      const { sink, getSnapshot } = CoreDebug.makeModuleRuntimeCounterSink()

      // Simulate two modules and multiple init/destroy events.
      yield* sink.record({ type: 'module:init', moduleId: 'A' })
      yield* sink.record({ type: 'module:init', moduleId: 'A' })
      yield* sink.record({ type: 'module:init', moduleId: 'B' })
      yield* sink.record({ type: 'module:destroy', moduleId: 'A' })

      const snapshot = getSnapshot()
      // When runtimeLabel is not provided, default to the "unknown" scope.
      expect(snapshot.get('unknown::A')).toBe(1)
      expect(snapshot.get('unknown::B')).toBe(1)

      // Once destroyed down to 0, it should be removed from the snapshot.
      yield* sink.record({ type: 'module:destroy', moduleId: 'A' })
      const snapshotAfter = getSnapshot()
      expect(snapshotAfter.has('unknown::A')).toBe(false)
      expect(snapshotAfter.get('unknown::B')).toBe(1)
    }),
  )

  it.effect('makeRingBufferSink should keep a bounded, ordered window of events after repeated overflow and clear', () =>
    Effect.gen(function* () {
      const { sink, getSnapshot, clear } = CoreDebug.makeRingBufferSink(3)

      // Initially empty
      expect(getSnapshot()).toHaveLength(0)

      // Push 5 events with capacity=3; keep only the last 3 in chronological order.
      yield* sink.record({ type: 'module:init', moduleId: 'A' })
      yield* sink.record({ type: 'module:init', moduleId: 'B' })
      yield* sink.record({ type: 'module:init', moduleId: 'C' })
      yield* sink.record({ type: 'module:init', moduleId: 'D' })
      yield* sink.record({ type: 'module:init', moduleId: 'E' })

      const snapshot = getSnapshot()
      expect(snapshot).toHaveLength(3)
      expect(snapshot[0]).toEqual({ type: 'module:init', moduleId: 'C' })
      expect(snapshot[1]).toEqual({ type: 'module:init', moduleId: 'D' })
      expect(snapshot[2]).toEqual({ type: 'module:init', moduleId: 'E' })

      clear()
      expect(getSnapshot()).toHaveLength(0)

      // After clear, window should restart from scratch.
      yield* sink.record({ type: 'module:init', moduleId: 'X' })
      yield* sink.record({ type: 'module:init', moduleId: 'Y' })
      yield* sink.record({ type: 'module:init', moduleId: 'Z' })
      yield* sink.record({ type: 'module:init', moduleId: 'W' })

      const snapshotAfterClear = getSnapshot()
      expect(snapshotAfterClear).toHaveLength(3)
      expect(snapshotAfterClear[0]).toEqual({ type: 'module:init', moduleId: 'Y' })
      expect(snapshotAfterClear[1]).toEqual({ type: 'module:init', moduleId: 'Z' })
      expect(snapshotAfterClear[2]).toEqual({ type: 'module:init', moduleId: 'W' })
    }),
  )

  it.effect('makeRingBufferSink should ignore writes when capacity <= 0', () =>
    Effect.gen(function* () {
      const { sink, getSnapshot, clear } = CoreDebug.makeRingBufferSink(0)

      yield* sink.record({ type: 'module:init', moduleId: 'A' })
      yield* sink.record({ type: 'module:init', moduleId: 'B' })
      expect(getSnapshot()).toHaveLength(0)

      clear()
      expect(getSnapshot()).toHaveLength(0)
    }),
  )

  it.effect('toRuntimeDebugEventRef should normalize action/state events', () =>
    Effect.gen(function* () {
      const actionEvent: CoreDebug.Event = {
        type: 'action:dispatch',
        moduleId: 'M1',
        instanceId: 'i-1',
        action: { _tag: 'inc', payload: 1 },
      }

      const stateEvent: CoreDebug.Event = {
        type: 'state:update',
        moduleId: 'M1',
        instanceId: 'i-1',
        state: { count: 1 },
      }

      const actionRef = CoreDebug.internal.toRuntimeDebugEventRef(actionEvent)
      const stateRef = CoreDebug.internal.toRuntimeDebugEventRef(stateEvent)

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
        // The effect field won't actually run in this test; Effect.void is sufficient.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        effect: Effect.void as any,
      }

      const traceEvent: CoreDebug.Event = {
        type: 'trace:effectop',
        moduleId: 'FallbackModule',
        instanceId: 'i-service',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: effectOp as any,
      }

      const ref = CoreDebug.internal.toRuntimeDebugEventRef(traceEvent)

      expect(ref).toBeDefined()
      expect(ref?.kind).toBe('service')
      expect(ref?.label).toBe('UserApi.loadProfile')
      // Prefer EffectOp.meta.moduleId over the event's moduleId.
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

      const traceEvent: CoreDebug.Event = {
        type: 'trace:effectop',
        moduleId: 'FallbackModule',
        instanceId: 'i-service',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: effectOp as any,
      }

      const full: any = CoreDebug.internal.toRuntimeDebugEventRef(traceEvent, {
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

      const light: any = CoreDebug.internal.toRuntimeDebugEventRef(traceEvent, {
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
