// @vitest-environment happy-dom

import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { Context, Layer, ManagedRuntime } from 'effect'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useRuntime } from '../../src/Hooks.js'

const TestTag = Context.GenericTag<string>('@tests/custom-service')

describe('RuntimeProvider layer propagation', () => {
  it('should make provided Layer services visible to descendants', async () => {
    const baseRuntime = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)
    const serviceLayer = Layer.succeed(TestTag, 'hello-runtime-provider')

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={baseRuntime} layer={serviceLayer}>
        {children}
      </RuntimeProvider>
    )

    const { result } = renderHook(
      () => {
        const runtime = useRuntime()
        const [value, setValue] = React.useState<string | null>(null)

        React.useEffect(() => {
          void runtime.runPromise(TestTag).then(setValue)
        }, [runtime])

        return value
      },
      { wrapper },
    )

    await waitFor(() => expect(result.current).toBe('hello-runtime-provider'))
  })

  it('useRuntime({ layer }) should override Provider.layer for the same Tag', async () => {
    const baseRuntime = ManagedRuntime.make(Layer.succeed(TestTag, 'base') as Layer.Layer<any, never, never>)
    const providerLayer = Layer.succeed(TestTag, 'provider')
    const hookLayer = Layer.succeed(TestTag, 'hook')

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={baseRuntime} layer={providerLayer}>
        {children}
      </RuntimeProvider>
    )

    const { result } = renderHook(
      () => {
        const runtime = useRuntime({ layer: hookLayer })
        const [value, setValue] = React.useState<string | null>(null)

        React.useEffect(() => {
          void runtime.runPromise(TestTag).then(setValue)
        }, [runtime])

        return value
      },
      { wrapper },
    )

    await waitFor(() => expect(result.current).toBe('hook'))
  })
})
