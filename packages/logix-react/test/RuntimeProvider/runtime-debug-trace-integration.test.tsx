// @vitest-environment happy-dom

import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logix/core'
import { RuntimeProvider, useModule } from '../../src/index.js'

const Counter = Logix.Module.make('ReactDebugTraceCounter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { inc: Schema.Void },
})

const logic = Counter.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('inc').run(() =>
      Logix.Debug.record({
        type: 'trace:inc',
        moduleId: Counter.id,
        data: { source: 'runtime-debug-trace-integration.test' },
      }),
    )
  }),
)

const Impl = Counter.implement({
  initial: { count: 0 },
  logics: [logic],
})

describe('Runtime + Debug trace integration (React happy-dom)', () => {
  it('should deliver trace:* events to a DebugSink provided via Runtime.make(layer)', async () => {
    const events: Logix.Debug.Event[] = []

    const debugLayer = Logix.Debug.replace([
      {
        record: (event: Logix.Debug.Event) =>
          Effect.sync(() => {
            events.push(event)
          }),
      },
    ]) as Layer.Layer<any, never, never>

    const baseRuntime = Logix.Runtime.make(Impl, {
      layer: debugLayer,
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={baseRuntime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        {children}
      </RuntimeProvider>
    )

    const { result } = renderHook(
      () => {
        const counter = useModule(Counter.tag)
        return { inc: counter.actions.inc }
      },
      { wrapper },
    )

    // 派发一次 inc，触发 trace:inc 事件，由 Runtime 层提供的 DebugSink 收集事件。
    await act(async () => {
      await baseRuntime.runPromise(
        Effect.gen(function* () {
          result.current.inc()
          yield* Effect.sleep(10)
        }),
      )
    })

    const traceEvents = events.filter((e) => typeof e.type === 'string' && e.type.startsWith('trace:'))
    expect(traceEvents.length).toBeGreaterThanOrEqual(1)
    expect(
      traceEvents.some(
        (e) =>
          e.type === 'trace:inc' &&
          (e as any).moduleId === Counter.id &&
          (e as any).data?.source === 'runtime-debug-trace-integration.test',
      ),
    ).toBe(true)
  })
})
