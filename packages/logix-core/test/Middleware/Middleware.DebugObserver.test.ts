import { describe, it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import * as Logix from '../../src/index.js'
import * as EffectOp from '../../src/EffectOp.js'
import * as Middleware from '../../src/Middleware.js'

describe('Middleware.DebugObserver', () => {
  it('should emit trace:effectop Debug events with slim EffectOp data (no effect closure) for all core kinds', async () => {
    const events: Array<Logix.Debug.Event> = []

    const sink: Logix.Debug.Sink = {
      record: (event: Logix.Debug.Event) =>
        Effect.sync(() => {
          events.push(event)
        }),
    }

    const stack: Middleware.MiddlewareStack = [Middleware.makeDebugObserver()]

    const kinds: Array<EffectOp.EffectOp['kind']> = ['action', 'flow', 'state', 'service', 'lifecycle']

    const ops = kinds.map((kind) =>
      EffectOp.make<number, never, never>({
        kind,
        name: `debug-observer-${kind}`,
        effect: Effect.succeed(42),
        meta: {
          moduleId: 'DebugObserverModule',
        },
      }),
    )

    const program = Effect.locally(Logix.Debug.internal.currentDebugSinks as any, [sink])(
      Effect.forEach(ops, (op) => EffectOp.run(op, stack) as Effect.Effect<number, never, never>, { discard: true }),
    )

    await Effect.runPromise(program)

    const traceEvents = events.filter((e) => typeof e.type === 'string' && e.type.startsWith('trace:effectop'))

    expect(traceEvents.length).toBeGreaterThanOrEqual(kinds.length)
    const last = traceEvents[traceEvents.length - 1] as any
    expect(last.moduleId).toBe('DebugObserverModule')
    expect(last.data).toBeDefined()
    expect(last.data.kind).toBeDefined()
    expect(last.data.effect).toBeUndefined()
    // Ensure all core kinds are observed and forwarded into Debug events by DebugObserver.
    const seenKinds = traceEvents
      .map((e) => (e as any).data?.kind)
      .filter((k: unknown): k is string => typeof k === 'string')
    kinds.forEach((k) => {
      expect(seenKinds).toContain(k)
    })
  })

  it('should project trace:effectop payload/meta into JsonValue (full) and enforce truncation budgets', async () => {
    const events: Array<Logix.Debug.Event> = []

    const sink: Logix.Debug.Sink = {
      record: (event: Logix.Debug.Event) =>
        Effect.sync(() => {
          events.push(event)
        }),
    }

    const stack: Middleware.MiddlewareStack = [Middleware.makeDebugObserver()]

    const bigString = 'x'.repeat(10_000)
    const bigArray = Array.from({ length: 100 }, (_, i) => `v${i}`)
    const bigObject: Record<string, unknown> = {}
    for (let i = 0; i < 100; i++) {
      bigObject[`k${String(i).padStart(3, '0')}`] = i
    }

    const op = EffectOp.make<number, never, never>({
      kind: 'service',
      name: 'DebugObserver.big-payload',
      effect: Effect.succeed(1),
      payload: {
        bigString,
        bigArray,
        bigObject,
      },
      meta: {
        moduleId: 'DebugObserverModule',
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        fn: () => {},
      },
    })

    const program = Effect.locally(Logix.Debug.internal.currentDebugSinks as any, [sink])(
      EffectOp.run(op, stack) as Effect.Effect<number, never, never>,
    )

    await Effect.runPromise(program)

    const traceEvent = events.find((e) => e.type === 'trace:effectop') as Logix.Debug.Event | undefined

    expect(traceEvent).toBeDefined()
    if (!traceEvent) return

    const ref: any = Logix.Debug.internal.toRuntimeDebugEventRef(traceEvent, {
      diagnosticsLevel: 'full',
    })

    expect(ref).toBeDefined()
    expect(ref.kind).toBe('service')

    // JsonValue hard gate: must not throw and must respect truncation budgets.
    const json = JSON.stringify(ref.meta)
    expect(json.length).toBeLessThanOrEqual(4 * 1024)

    // The "full" level should include payload/meta, but truncated.
    expect(ref.meta?.payload?.bigString?.length).toBe(256)
    expect(ref.meta?.payload?.bigArray).toHaveLength(33)
    expect(ref.meta?.payload?.bigArray?.[32]).toBe('[...68 more]')
    expect(ref.meta?.payload?.bigObject?.__truncatedKeys).toBe(68)
    expect(ref.meta?.meta?.fn).toBe('[Function]')
    expect(ref.downgrade?.reason).toBe('non_serializable')
  })

  it('should propagate txnId from EffectOp meta into RuntimeDebugEventRef', async () => {
    const events: Array<Logix.Debug.Event> = []

    const sink: Logix.Debug.Sink = {
      record: (event: Logix.Debug.Event) =>
        Effect.sync(() => {
          events.push(event)
        }),
    }

    const stack: Middleware.MiddlewareStack = [Middleware.makeDebugObserver()]

    const op = EffectOp.make<number, never, never>({
      kind: 'service',
      name: 'DebugObserver.txn',
      effect: Effect.succeed(1),
      meta: {
        moduleId: 'DebugObserverModule',
        txnId: 'txn-123',
      },
    })

    const program = Effect.locally(Logix.Debug.internal.currentDebugSinks as any, [sink])(
      EffectOp.run(op, stack) as Effect.Effect<number, never, never>,
    )

    await Effect.runPromise(program)

    const traceEvents = events.filter((e) => typeof e.type === 'string' && e.type === 'trace:effectop')
    expect(traceEvents.length).toBeGreaterThan(0)

    const runtimeRefs = traceEvents
      .map((event) => Logix.Debug.internal.toRuntimeDebugEventRef(event))
      .filter((ref): ref is Logix.Debug.RuntimeDebugEventRef => ref != null)

    expect(runtimeRefs.length).toBeGreaterThan(0)
    const last = runtimeRefs[runtimeRefs.length - 1]

    expect(last.txnId).toBe('txn-123')
    expect(last.moduleId).toBe('DebugObserverModule')
  })

  it('should allow disabling observer behavior via op.meta.policy.disableObservers', async () => {
    const events: Array<Logix.Debug.Event> = []

    const sink: Logix.Debug.Sink = {
      record: (event: Logix.Debug.Event) =>
        Effect.sync(() => {
          events.push(event)
        }),
    }

    const stack: Middleware.MiddlewareStack = [Middleware.makeDebugObserver()]

    const op = EffectOp.make<number, never, never>({
      kind: 'service',
      name: 'DebugObserver.disabled',
      effect: Effect.succeed(1),
      meta: {
        moduleId: 'DebugObserverModule',
        policy: { disableObservers: true },
      },
    })

    const program = Effect.locally(Logix.Debug.internal.currentDebugSinks as any, [sink])(
      EffectOp.run(op, stack) as Effect.Effect<number, never, never>,
    )

    await Effect.runPromise(program)

    expect(events.some((e) => (e as any)?.type === 'trace:effectop')).toBe(false)
  })

  it('should align trace:react-render events to the last state:update txnId for the same instanceId', () => {
    const instanceId = 'i-1'
    const moduleId = 'ReactRenderModule'

    const stateEvent: Logix.Debug.Event = {
      type: 'state:update',
      moduleId,
      state: { count: 1 },
      instanceId,
      txnId: 'txn-render-001',
      runtimeLabel: 'TestRuntime',
    }

    const renderEvent: Logix.Debug.Event = {
      type: 'trace:react-render',
      moduleId,
      instanceId,
      runtimeLabel: 'TestRuntime',
      data: {
        componentLabel: 'TestComponent',
        selectorKey: 'countSelector',
        fieldPaths: ['count'],
      },
    }

    const stateRef = Logix.Debug.internal.toRuntimeDebugEventRef(stateEvent)!
    const renderRef = Logix.Debug.internal.toRuntimeDebugEventRef(renderEvent)!

    expect(stateRef.kind).toBe('state')
    expect(stateRef.txnId).toBe('txn-render-001')

    expect(renderRef.kind).toBe('react-render')
    expect(renderRef.txnId).toBe('txn-render-001')
    expect(renderRef.moduleId).toBe(moduleId)

    const meta = renderRef.meta as any
    expect(meta).toBeDefined()
    expect(meta.componentLabel).toBe('TestComponent')
    expect(meta.selectorKey).toBe('countSelector')
    expect(meta.fieldPaths).toEqual(['count'])
  })

  it('should align trace:react-selector events to the last state:update txn and keep lane evidence fields slim/serializable', () => {
    const instanceId = 'i-selector-1'
    const moduleId = 'ReactSelectorModule'

    const stateEvent: Logix.Debug.Event = {
      type: 'state:update',
      moduleId,
      state: { count: 1 },
      instanceId,
      txnId: 'txn-selector-001',
      txnSeq: 9,
      runtimeLabel: 'TestRuntime',
    }

    const selectorEvent: Logix.Debug.Event = {
      type: 'trace:react-selector',
      moduleId,
      instanceId,
      runtimeLabel: 'TestRuntime',
      data: {
        componentLabel: 'TestComponent',
        selectorKey: 'countSelector',
        fieldPaths: ['count'],
        selectorId: 'selector-1',
        lane: 'static',
        producer: 'jit',
        readsDigest: { count: 1, hash: 123 },
        strictModePhase: 'commit',
      },
    }

    const stateRef = Logix.Debug.internal.toRuntimeDebugEventRef(stateEvent)!
    const selectorRef = Logix.Debug.internal.toRuntimeDebugEventRef(selectorEvent)!

    expect(stateRef.kind).toBe('state')
    expect(stateRef.txnId).toBe('txn-selector-001')
    expect(stateRef.txnSeq).toBe(9)

    expect(selectorRef.kind).toBe('react-selector')
    expect(selectorRef.txnId).toBe('txn-selector-001')
    expect(selectorRef.txnSeq).toBe(9)
    expect(selectorRef.moduleId).toBe(moduleId)

    const meta = selectorRef.meta as any
    expect(meta).toBeDefined()
    expect(meta.componentLabel).toBe('TestComponent')
    expect(meta.selectorKey).toBe('countSelector')
    expect(meta.fieldPaths).toEqual(['count'])
    expect(meta.selectorId).toBe('selector-1')
    expect(meta.lane).toBe('static')
    expect(meta.producer).toBe('jit')
    expect(meta.readsDigest).toEqual({ count: 1, hash: 123 })

    expect(() => JSON.stringify(selectorRef.meta)).not.toThrow()
  })

  it('should normalize trace:txn-lane evidence in light mode and keep it serializable', () => {
    const instanceId = 'i-txn-lane-1'
    const moduleId = 'TxnLaneModule'
    const txnSeq = 7

    const laneEvent: Logix.Debug.Event = {
      type: 'trace:txn-lane',
      moduleId,
      instanceId,
      txnSeq,
      txnId: `${instanceId}::t${txnSeq}`,
      runtimeLabel: 'TestRuntime',
      data: {
        evidence: {
          anchor: { moduleId, instanceId, txnSeq, opSeq: 12 },
          lane: 'nonUrgent',
          kind: 'trait:deferred_flush',
          policy: {
            enabled: true,
            configScope: 'builtin',
            budgetMs: 8,
            debounceMs: 16,
            maxLagMs: 200,
            allowCoalesce: true,
            queueMode: 'lanes',
          },
          backlog: { pendingCount: 10, ageMs: 5, coalescedCount: 1, canceledCount: 0 },
          budget: { budgetMs: 8, sliceDurationMs: 1, yieldCount: 0 },
          starvation: { triggered: false },
          reasons: ['queued_non_urgent'],
        },
      },
    }

    const ref = Logix.Debug.internal.toRuntimeDebugEventRef(laneEvent, { diagnosticsLevel: 'light' })!
    expect(ref.kind).toBe('txn-lane')
    expect(ref.label).toBe('trait:deferred_flush')
    expect(ref.txnSeq).toBe(txnSeq)

    const meta = ref.meta as any
    expect(meta?.anchor?.txnSeq).toBe(txnSeq)
    expect(meta?.lane).toBe('nonUrgent')
    expect(meta?.backlog?.pendingCount).toBe(10)

    expect(() => JSON.stringify(ref.meta)).not.toThrow()
  })
})
