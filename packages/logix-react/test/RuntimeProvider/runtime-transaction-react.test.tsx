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

          // Give internal Effects a chance to run.
          yield* Effect.sleep('10 millis')

          const after = countTxnStateUpdates()
          // This interaction should append exactly one state event with a txnId.
          expect(after - before).toBe(1)
        }),
      )
    })

    await waitFor(() => {
      expect(result.current.count).toBe(1)
    })
  })
})
