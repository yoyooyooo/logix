// @vitest-environment happy-dom

import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider, useModule } from '../../src/index.js'

const Counter = Logix.Module.make('ReactTxnCounter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { inc: Schema.Void },
})

const logic = Counter.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('inc').mutate((draft) => {
      draft.count += 1
    })
  }),
)

const Impl = Counter.implement({
  initial: { count: 0 },
  logics: [logic],
})

describe('React Runtime transaction integration', () => {
  it('should produce a single state:update for a single user dispatch', async () => {
    const events: Logix.Debug.Event[] = []

    const debugLayer = Logix.Debug.replace([
      {
        record: (event: Logix.Debug.Event) =>
          Effect.sync(() => {
            events.push(event)
          }),
      },
    ]) as Layer.Layer<any, never, never>

    const appRuntime = Logix.Runtime.make(Impl, {
      layer: debugLayer,
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={appRuntime}>{children}</RuntimeProvider>
    )

    const { result } = renderHook(
      () => {
        const counter = useModule(Counter.tag)
        const count = useModule(counter, (s: any) => s.count) as number
        return { inc: counter.actions.inc, count }
      },
      { wrapper },
    )

    // Wait for the initial render to complete.
    await waitFor(() => {
      expect(result.current.count).toBe(0)
    })

    const countTxnStateUpdates = () =>
      events
        .map((event) => Logix.Debug.internal.toRuntimeDebugEventRef(event))
        .filter(
          (ref): ref is Logix.Debug.RuntimeDebugEventRef =>
            ref != null && ref.moduleId === 'ReactTxnCounter' && ref.kind === 'state' && ref.txnId != null,
        ).length

    await act(async () => {
      await appRuntime.runPromise(
        Effect.gen(function* () {
          const before = countTxnStateUpdates()

          result.current.inc()

          let after = before
          for (let i = 0; i < 100; i += 1) {
            yield* Effect.sleep('5 millis')
            after = countTxnStateUpdates()
            if (after - before > 0) break
          }

          // This interaction should append exactly one state event with a txnId.
          expect(after - before).toBe(1)
        }),
      )
    })

    await waitFor(() => {
      expect(result.current.count).toBe(1)
    })
  })

  it('should keep separate user dispatches as separate state:update events', async () => {
    const events: Logix.Debug.Event[] = []

    const debugLayer = Logix.Debug.replace([
      {
        record: (event: Logix.Debug.Event) =>
          Effect.sync(() => {
            events.push(event)
          }),
      },
    ]) as Layer.Layer<any, never, never>

    const appRuntime = Logix.Runtime.make(Impl, {
      layer: debugLayer,
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={appRuntime}>{children}</RuntimeProvider>
    )

    const { result } = renderHook(
      () => {
        const counter = useModule(Counter.tag)
        const count = useModule(counter, (s: any) => s.count) as number
        return { inc: counter.actions.inc, count }
      },
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.count).toBe(0)
    })

    const countTxnStateUpdates = () =>
      events
        .map((event) => Logix.Debug.internal.toRuntimeDebugEventRef(event))
        .filter(
          (ref): ref is Logix.Debug.RuntimeDebugEventRef =>
            ref != null && ref.moduleId === 'ReactTxnCounter' && ref.kind === 'state' && ref.txnId != null,
        ).length

    const waitForTxnDelta = (before: number, expected: number) =>
      Effect.gen(function* () {
        for (let i = 0; i < 100; i += 1) {
          const after = countTxnStateUpdates()
          if (after - before === expected) return after
          yield* Effect.sleep('5 millis')
        }
        return yield* Effect.fail(new Error(`timeout waiting for txn delta ${expected}`))
      })

    await act(async () => {
      await appRuntime.runPromise(
        Effect.gen(function* () {
          const before = countTxnStateUpdates()

          result.current.inc()
          yield* waitForTxnDelta(before, 1)

          result.current.inc()
          const after = yield* waitForTxnDelta(before, 2)

          expect(after - before).toBe(2)

          for (let i = 0; i < 10; i += 1) {
            yield* Effect.sleep('5 millis')
            expect(countTxnStateUpdates() - before).toBe(2)
          }
        }),
      )
    })

    await waitFor(() => {
      expect(result.current.count).toBe(2)
    })
  })
})
