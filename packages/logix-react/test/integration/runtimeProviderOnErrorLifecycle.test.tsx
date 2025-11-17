// @vitest-environment happy-dom

import React, { useEffect } from 'react'
import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { Cause, Effect, Layer, Schema } from 'effect'
import * as Logix from '@logix/core'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule, useRuntime } from '../../src/Hooks.js'

describe('RuntimeProvider.onError (lifecycle/diagnostic bridge)', () => {
  it('should report lifecycle:error via onError with moduleId + instanceId', async () => {
    const Broken = Logix.Module.make('BrokenForProviderOnErrorLifecycle', {
      state: Schema.Void,
      actions: {},
    })
    const brokenLogic = Broken.logic(() => Effect.die(new Error('boom')))
    const BrokenImpl = Broken.implement({
      initial: undefined,
      logics: [brokenLogic],
    })

    const Root = Logix.Module.make('RootProviderOnErrorLifecycle', {
      state: Schema.Void,
      actions: {},
    })
    const RootImpl = Root.implement({
      initial: undefined,
      imports: [BrokenImpl.impl],
    })

    const runtime = Logix.Runtime.make(RootImpl, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    const calls: Array<{ readonly cause: Cause.Cause<unknown>; readonly context: any }> = []

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider
        runtime={runtime}
        onError={(cause, context) =>
          Effect.sync(() => {
            calls.push({ cause, context })
          })
        }
      >
        {children}
      </RuntimeProvider>
    )

    renderHook(() => useModule(BrokenImpl), { wrapper })

    await waitFor(() => {
      expect(
        calls.some(
          (call) =>
            call.context?.phase === 'debug.lifecycle_error' &&
            call.context?.moduleId === 'BrokenForProviderOnErrorLifecycle' &&
            typeof call.context?.instanceId === 'string' &&
            call.context.instanceId.length > 0,
        ),
      ).toBe(true)
    })

    const hit = calls.find(
      (call) =>
        call.context?.phase === 'debug.lifecycle_error' &&
        call.context?.moduleId === 'BrokenForProviderOnErrorLifecycle',
    )!

    expect(hit.context.source).toBe('provider')
    expect(Cause.pretty(hit.cause)).toContain('boom')
  })

  it('should report error severity diagnostic via onError with moduleId + instanceId', async () => {
    const Root = Logix.Module.make('RootProviderOnErrorDiagnostic', {
      state: Schema.Void,
      actions: {},
    })
    const runtime = Logix.Runtime.make(Root.implement({ initial: undefined }), {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    const calls: Array<{ readonly cause: Cause.Cause<unknown>; readonly context: any }> = []

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider
        runtime={runtime}
        onError={(cause, context) =>
          Effect.sync(() => {
            calls.push({ cause, context })
          })
        }
      >
        {children}
      </RuntimeProvider>
    )

    const useEmitDiagnostic = () => {
      const rt = useRuntime()
      useEffect(() => {
        rt.runFork(
          Logix.Debug.record({
            type: 'diagnostic',
            moduleId: 'DiagnosticModule',
            instanceId: 'instance-1',
            runtimeLabel: 'runtime-label',
            code: 'diagnostic::test',
            severity: 'error',
            message: 'boom',
            hint: 'fix',
          }) as Effect.Effect<void, never, any>,
        )
      }, [rt])
    }

    renderHook(() => useEmitDiagnostic(), { wrapper })

    await waitFor(() => {
      expect(
        calls.some(
          (call) =>
            call.context?.phase === 'debug.diagnostic_error' &&
            call.context?.code === 'diagnostic::test' &&
            call.context?.moduleId === 'DiagnosticModule' &&
            call.context?.instanceId === 'instance-1',
        ),
      ).toBe(true)
    })
  })
})
