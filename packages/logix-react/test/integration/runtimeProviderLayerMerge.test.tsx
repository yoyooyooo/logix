import React from 'react'
import { describe, it, expect } from 'vitest'
// @vitest-environment happy-dom
import { renderHook, waitFor } from '@testing-library/react'
import { Effect, Layer, ManagedRuntime, ServiceMap } from 'effect'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useRuntime } from '../../src/Hooks.js'

class ServiceA extends ServiceMap.Service<ServiceA, { readonly value: string }>()('ServiceA') {}
class ServiceB extends ServiceMap.Service<ServiceB, { readonly value: number }>()('ServiceB') {}

const baseRuntime = ManagedRuntime.make(Layer.succeed(ServiceA, { value: 'base' }) as Layer.Layer<any, never, never>)

describe('host adapter subtree layer merge & override', () => {
  it('should use runtime base env when no layer provided', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={baseRuntime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        {children}
      </RuntimeProvider>
    )

    const { result } = renderHook(
      () =>
        useRuntime().runSync(
          Effect.gen(function* () {
            const svc = yield* Effect.service(ServiceA).pipe(Effect.orDie)
            return svc.value
          }),
        ),
      { wrapper },
    )

    expect(result.current).toBe('base')
  })

  it('should override service via subtree layer', async () => {
    const overrideLayer = Layer.succeed(ServiceA, { value: 'override' }) as Layer.Layer<any, never, never>

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={baseRuntime} layer={overrideLayer}>
        {children}
      </RuntimeProvider>
    )

    const { result } = renderHook(
      () =>
        useRuntime().runSync(
          Effect.gen(function* () {
            const svc = yield* Effect.service(ServiceA).pipe(Effect.orDie)
            return svc.value
          }),
        ),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current).toBe('override')
    })
  })

  it('should allow nested providers to override parent env', async () => {
    const innerLayer = Layer.succeed(ServiceA, { value: 'inner' }) as Layer.Layer<any, never, never>

    const NestedWrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={baseRuntime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <RuntimeProvider layer={innerLayer}>{children}</RuntimeProvider>
      </RuntimeProvider>
    )

    const { result } = renderHook(
      () =>
        useRuntime().runSync(
          Effect.gen(function* () {
            const svc = yield* Effect.service(ServiceA).pipe(Effect.orDie)
            return svc.value
          }),
        ),
      { wrapper: NestedWrapper },
    )

    await waitFor(() => {
      expect(result.current).toBe('inner')
    })
  })

  it('should merge useRuntime({ layer }) with provider env', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={baseRuntime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        {children}
      </RuntimeProvider>
    )

    const { result } = renderHook(
      () => {
        const serviceBLayer = React.useMemo(
          () => Layer.succeed(ServiceB, { value: 42 }) as Layer.Layer<any, never, never>,
          [],
        )
        const runtime = useRuntime({
          layer: serviceBLayer,
        })

        try {
          return runtime.runSync(
            Effect.gen(function* () {
              const a = yield* Effect.service(ServiceA).pipe(Effect.orDie)
              const b = yield* Effect.service(ServiceB).pipe(Effect.orDie)
              return `${a.value}-${b.value}`
            }),
          )
        } catch {
          return null
        }
      },
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current).toBe('base-42')
    })
  })

  it('should let layers array override provider layer in order', async () => {
    const providerLayer = Layer.succeed(ServiceA, { value: 'provider' }) as Layer.Layer<any, never, never>
    const layer1 = Layer.succeed(ServiceA, { value: 'layer1' }) as Layer.Layer<any, never, never>
    const layer2 = Layer.succeed(ServiceA, { value: 'layer2' }) as Layer.Layer<any, never, never>

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={baseRuntime} layer={providerLayer}>
        {children}
      </RuntimeProvider>
    )

    const { result } = renderHook(
      () => {
        const layers = React.useMemo(() => [layer1, layer2], [])
        const runtime = useRuntime({
          layers,
        })

        return runtime.runSync(
          Effect.gen(function* () {
            const a = yield* Effect.service(ServiceA).pipe(Effect.orDie)
            return a.value
          }),
        )
      },
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current).toBe('layer2')
    })
  })
})
