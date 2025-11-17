import { describe, it, expect } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { render, renderHook, waitFor, cleanup } from '@testing-library/react'
import { Effect, Schema } from 'effect'
import * as Logix from '@logix/core'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule, useProcesses } from '../../src/Hooks.js'

describe('useProcesses', () => {
  it('mount starts once; unmount stops (StrictMode safe)', async () => {
    const Counter = Logix.Module.make('UseProcessesCounter', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { inc: Schema.Void },
      reducers: {
        inc: Logix.Module.Reducer.mutate((draft) => {
          draft.count += 1
        }),
      },
    })

    const CounterImpl = Counter.implement({
      initial: { count: 0 },
      logics: [],
    })

    const stopped = { n: 0 }

    const proc = Logix.Process.link({ modules: [Counter] as const }, ($) =>
      Effect.gen(function* () {
        const counter = $[Counter.id]
        yield* counter.actions.inc()
        yield* Effect.never
      }).pipe(
        Effect.ensuring(
          Effect.sync(() => {
            stopped.n += 1
          }),
        ),
      ),
    )

    const runtime = Logix.Runtime.make(CounterImpl)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <React.StrictMode>
        <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
      </React.StrictMode>
    )

    const { result, unmount } = renderHook(
      () => {
        const processes = React.useMemo(() => [proc], [])
        useProcesses(processes, { subtreeId: 'test-subtree', gcTime: 50 })
        return useModule(Counter, (s) => s.count)
      },
      { wrapper },
    )

    await waitFor(() => {
      // Even under StrictMode double-invoke, the effect should run only once.
      expect(result.current).toBe(1)
      expect(stopped.n).toBe(0)
    })

    unmount()

    await waitFor(() => {
      expect(stopped.n).toBe(1)
    })

    await runtime.dispose()
  })

  it('does not install processes for a subtree that suspends before commit', async () => {
    const started = { n: 0 }

    const proc = Logix.Process.make(
      'UseProcessesSuspenseNoCommit',
      Effect.gen(function* () {
        started.n += 1
        yield* Effect.never
      }),
    )

    const Root = Logix.Module.make('UseProcessesSuspenseRoot', {
      state: Schema.Void,
      actions: {},
    })

    const runtime = Logix.Runtime.make(
      Root.implement({
        initial: undefined,
        logics: [],
      }),
    )

    const never = new Promise<never>(() => {})

    const Suspender: React.FC = () => {
      useProcesses([proc], { subtreeId: 'suspense-subtree', gcTime: 0 })
      throw never
    }

    render(
      <RuntimeProvider runtime={runtime}>
        <React.Suspense fallback={<div>loading</div>}>
          <Suspender />
        </React.Suspense>
      </RuntimeProvider>,
    )

    await new Promise((r) => setTimeout(r, 20))

    expect(started.n).toBe(0)

    cleanup()
    await runtime.dispose()
  })
})
