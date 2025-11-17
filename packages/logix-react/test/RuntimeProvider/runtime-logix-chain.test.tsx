// @vitest-environment happy-dom

import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import * as Logix from '@logix/core'
import { Context, Effect, Layer, Schema } from 'effect'
import { RuntimeProvider, useModule, useRuntime } from '../../src/index.js'

describe('Logix Runtime → ModuleRuntime → RuntimeProvider → useModule chain', () => {
  const EnvTag = Context.GenericTag<{
    readonly label: string
  }>('@tests/EnvService')

  const TestState = Schema.Struct({
    initialized: Schema.Boolean,
    label: Schema.String,
  })

  const TestModule = Logix.Module.make('EnvAwareModule', {
    state: TestState,
    actions: {
      init: Schema.Void,
    },
  })

  const TestLogic = TestModule.logic<{ readonly label: string }>(($) =>
    Effect.gen(function* () {
      // 在运行阶段读取 EnvTag，确保 React Provider.layer 的覆盖生效。
      yield* $.onAction('init').run(
        Effect.gen(function* () {
          const env = yield* EnvTag
          yield* $.state.update((s) => ({
            ...s,
            initialized: true,
            label: env.label,
          }))
        }),
      )
    }),
  )

  const TestImpl = TestModule.implement({
    initial: { initialized: false, label: 'unset' },
    logics: [TestLogic],
  })

  const TestImplWithProcess = TestModule.implement({
    initial: { initialized: false, label: 'unset' },
    logics: [TestLogic],
    processes: [
      Effect.gen(function* () {
        // 这里的 dispatch 会在 AppRuntime 层的 envLayer 下运行，
        // Logic 内部读取的 EnvTag 应该来自 Root Runtime 的 layer，而不是 React Provider 覆盖。
        const runtime = (yield* TestModule.tag) as Logix.ModuleRuntime<
          { initialized: boolean; label: string },
          { _tag: 'init'; payload: void }
        >

        yield* runtime.dispatch({ _tag: 'init', payload: undefined })
      }),
    ],
  })

  it('should preserve Env across Runtime → Provider → useModule/ModuleCache', async () => {
    const appRuntime = Logix.Runtime.make(TestImpl, {
      layer: Layer.succeed(EnvTag, { label: 'ENV_FROM_ROOT' }) as Layer.Layer<any, never, never>,
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={appRuntime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        {children}
      </RuntimeProvider>
    )

    const { result } = renderHook(
      () => {
        const runtime = useRuntime()
        const mod = useModule(TestImpl)
        const state = useModule(mod, (s) => s as { initialized: boolean; label: string })

        React.useEffect(() => {
          void runtime.runPromise(mod.runtime.dispatch({ _tag: 'init', payload: undefined }) as any)
        }, [runtime, mod.runtime])

        return state
      },
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.initialized).toBe(true)
      expect(result.current.label).toBe('ENV_FROM_ROOT')
    })
  })

  it('should allow React Provider.layer to override Env for logic executed via useRuntime', async () => {
    const appRuntime = Logix.Runtime.make(TestImpl, {
      layer: Layer.succeed(EnvTag, { label: 'ENV_FROM_ROOT' }) as Layer.Layer<any, never, never>,
    })

    const providerLayer = Layer.succeed(EnvTag, { label: 'ENV_FROM_PROVIDER' }) as Layer.Layer<any, never, never>

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={appRuntime} layer={providerLayer} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        {children}
      </RuntimeProvider>
    )

    const { result } = renderHook(
      () => {
        const runtime = useRuntime()
        const mod = useModule(TestImpl)
        const state = useModule(mod, (s) => s as { initialized: boolean; label: string })

        React.useEffect(() => {
          void runtime.runPromise(mod.runtime.dispatch({ _tag: 'init', payload: undefined }) as any)
        }, [runtime, mod.runtime])

        return state
      },
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.initialized).toBe(true)
      expect(result.current.label).toBe('ENV_FROM_PROVIDER')
    })
  })

  it('processes should see root Env even when React Provider overlays EnvTag', async () => {
    const appRuntime = Logix.Runtime.make(TestImplWithProcess, {
      layer: Layer.succeed(EnvTag, { label: 'ENV_FROM_ROOT' }) as Layer.Layer<any, never, never>,
    })

    const providerLayer = Layer.succeed(EnvTag, {
      label: 'ENV_FROM_PROVIDER',
    }) as Layer.Layer<any, never, never>

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={appRuntime} layer={providerLayer} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        {children}
      </RuntimeProvider>
    )

    const { result } = renderHook(
      () =>
        useModule(TestModule.tag).runtime as Logix.ModuleRuntime<
          { initialized: boolean; label: string },
          { _tag: 'init'; payload?: void }
        >,
      { wrapper },
    )

    await waitFor(async () => {
      const state = (await appRuntime.runPromise((result.current as any).getState)) as {
        initialized: boolean
        label: string
      }

      expect(state.initialized).toBe(true)
      expect(state.label).toBe('ENV_FROM_ROOT')
    })
  })
})
