import React from 'react'
import { describe, it, expect } from 'vitest'
// @vitest-environment happy-dom
import { renderHook, waitFor } from '@testing-library/react'
import { Context, Layer, ManagedRuntime, Effect } from 'effect'
import { RuntimeProvider } from '../../src/components/RuntimeProvider.js'
import { useRuntime } from '../../src/components/RuntimeProvider.js'

class ServiceA extends Context.Tag('ServiceA')<ServiceA, { readonly value: string }>() {}
class ServiceB extends Context.Tag('ServiceB')<ServiceB, { readonly value: number }>() {}

const baseRuntime = ManagedRuntime.make(Layer.succeed(ServiceA, { value: 'base' }) as Layer.Layer<any, never, never>)

describe('RuntimeProvider layer merge & override', () => {
  it('should use runtime base env when no layer provided', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={baseRuntime}>{children}</RuntimeProvider>
    )

    const { result } = renderHook(
      () =>
        useRuntime().runSync(
          Effect.gen(function* () {
            const svc = yield* ServiceA
            return svc.value
          }),
        ),
      { wrapper },
    )

    expect(result.current).toBe('base')
  })

  it('should override service via RuntimeProvider.layer', async () => {
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
            const svc = yield* ServiceA
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
      <RuntimeProvider runtime={baseRuntime}>
        <RuntimeProvider layer={innerLayer}>{children}</RuntimeProvider>
      </RuntimeProvider>
    )

    const { result } = renderHook(
      () =>
        useRuntime().runSync(
          Effect.gen(function* () {
            const svc = yield* ServiceA
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
      <RuntimeProvider runtime={baseRuntime}>{children}</RuntimeProvider>
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
              const a = yield* ServiceA
              const b = yield* ServiceB
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
            const a = yield* ServiceA
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
