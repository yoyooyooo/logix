// @vitest-environment happy-dom

import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import * as Logix from '@logixjs/core'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
import { Effect, Layer, Schema, ServiceMap } from 'effect'
import { RuntimeProvider, fieldValue, useRuntime, useSelector } from '../../src/index.js'
import { useProgramRuntimeBlueprint } from '../../src/internal/hooks/useProgramRuntimeBlueprint.js'

describe('Logix Runtime → ModuleRuntime → RuntimeProvider → useModule chain', () => {
  const EnvTag = ServiceMap.Service<{
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

  const TestLogic = TestModule.logic<{ readonly label: string }>('test-logic', ($) =>
    Effect.gen(function* () {
      // Read EnvTag in the run phase to ensure subtree layer overrides take effect.
      yield* $.onAction('init').run(
        Effect.gen(function* () {
          const env = yield* Effect.service(EnvTag).pipe(Effect.orDie)
          yield* $.state.update((s) => ({
            ...s,
            initialized: true,
            label: env.label,
          }))
        }),
      )
    }),
  )

  const TestProgram = Logix.Program.make(TestModule, {
    initial: { initialized: false, label: 'unset' },
    logics: [TestLogic],
  })
  const TestBlueprint = RuntimeContracts.getProgramRuntimeBlueprint(TestProgram)

  it('should preserve Env across Runtime → Provider → useModule/ModuleCache', async () => {
    const appRuntime = Logix.Runtime.make(TestProgram, {
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
        const mod = useProgramRuntimeBlueprint(TestBlueprint)
        const initialized = useSelector(mod, fieldValue('initialized'))
        const label = useSelector(mod, fieldValue('label'))

        React.useEffect(() => {
          void runtime.runPromise(mod.runtime.dispatch({ _tag: 'init', payload: undefined }) as any)
        }, [runtime, mod.runtime])

        return { initialized, label }
      },
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.initialized).toBe(true)
      expect(result.current.label).toBe('ENV_FROM_ROOT')
    })
  })

  it('should allow React Provider.layer to override Env for logic executed via useRuntime', async () => {
    const appRuntime = Logix.Runtime.make(TestProgram, {
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
        const mod = useProgramRuntimeBlueprint(TestBlueprint)
        const initialized = useSelector(mod, fieldValue('initialized'))
        const label = useSelector(mod, fieldValue('label'))

        React.useEffect(() => {
          void runtime.runPromise(mod.runtime.dispatch({ _tag: 'init', payload: undefined }) as any)
        }, [runtime, mod.runtime])

        return { initialized, label }
      },
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.initialized).toBe(true)
      expect(result.current.label).toBe('ENV_FROM_PROVIDER')
    })
  })
})
