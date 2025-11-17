// @vitest-environment happy-dom

import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import * as Logix from '@logix/core'
import { Deferred, Effect, Schema } from 'effect'
import { RuntimeProvider, useModule, useRuntime } from '../../src/index.js'

describe('TaskRunner integration (React): runLatestTask', () => {
  const StateSchema = Schema.Struct({
    loading: Schema.Boolean,
    data: Schema.Number,
    logs: Schema.Array(Schema.String),
  })

  const Actions = {
    refresh: Schema.Number,
  }

  const TaskModule = Logix.Module.make('TaskRunnerReactModule', {
    state: StateSchema,
    actions: Actions,
  })

  it('should show loading for each trigger but only write back latest result', async () => {
    const io1 = await Effect.runPromise(Deferred.make<number>())
    const io2 = await Effect.runPromise(Deferred.make<number>())

    const logic = TaskModule.logic(($) =>
      Effect.gen(function* () {
        yield* $.onAction('refresh').runLatestTask({
          pending: (a: any) =>
            $.state.update((s) => ({
              ...s,
              loading: true,
              logs: [...s.logs, `pending:${a.payload}`],
            })),
          effect: (a: any) => (a.payload === 1 ? Deferred.await(io1) : Deferred.await(io2)),
          success: (result, a: any) =>
            $.state.update((s) => ({
              ...s,
              loading: false,
              data: result,
              logs: [...s.logs, `success:${a.payload}:${result}`],
            })),
        })
      }),
    )

    const impl = TaskModule.implement({
      initial: {
        loading: false,
        data: 0,
        logs: [],
      },
      logics: [logic],
    })

    const appRuntime = Logix.Runtime.make(impl)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={appRuntime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        {children}
      </RuntimeProvider>
    )

    const { result } = renderHook(
      () => {
        const runtime = useRuntime()
        const moduleRuntime = useModule(impl).runtime as Logix.ModuleRuntime<
          { loading: boolean; data: number; logs: ReadonlyArray<string> },
          { _tag: 'refresh'; payload: number }
        >

        const state = useModule(
          moduleRuntime,
          (s) =>
            s as {
              loading: boolean
              data: number
              logs: ReadonlyArray<string>
            },
        )

        const dispatchRefresh = (n: number) =>
          runtime.runPromise(moduleRuntime.dispatch({ _tag: 'refresh', payload: n } as any) as any)

        return { state, dispatchRefresh }
      },
      { wrapper },
    )

    await act(async () => {
      await result.current.dispatchRefresh(1)
    })

    await waitFor(() => {
      expect(result.current.state.loading).toBe(true)
      expect(result.current.state.logs.join('|')).toContain('pending:1')
    })

    await act(async () => {
      await result.current.dispatchRefresh(2)
    })

    await waitFor(() => {
      expect(result.current.state.loading).toBe(true)
      expect(result.current.state.logs.join('|')).toContain('pending:2')
    })

    // Complete old task first: should NOT write back.
    await Effect.runPromise(Deferred.succeed(io1, 100))

    // Complete latest: should write back.
    await Effect.runPromise(Deferred.succeed(io2, 200))

    await waitFor(() => {
      expect(result.current.state.loading).toBe(false)
      expect(result.current.state.data).toBe(200)
      expect(result.current.state.logs.join('|')).toContain('success:2:200')
    })

    expect(result.current.state.logs.join('|')).not.toContain('success:1:100')
  })
})
