import { describe, it, expect, afterEach } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { cleanup, render, waitFor } from '@testing-library/react'
import { Layer, ManagedRuntime, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule, useSelector } from '../../src/Hooks.js'

const Shared = Logix.Module.make('ProgramBlueprintIdentityShared', {
  state: Schema.Struct({
    count: Schema.Number,
  }),
  actions: {},
})

const ProgramA = Logix.Program.make(Shared, {
  initial: { count: 0 },
})

const ProgramB = Logix.Program.make(Shared, {
  initial: { count: 10 },
})

describe('useModule(Program) blueprint identity', () => {
  afterEach(() => {
    cleanup()
  })

  it('does not reuse local instances across different programs from the same module when key is the same', async () => {
    const runtime = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>
        <React.Suspense fallback={null}>{children}</React.Suspense>
      </RuntimeProvider>
    )

    const View = () => {
      const a = useModule(ProgramA, { key: 'shared' })
      const b = useModule(ProgramB, { key: 'shared' })

      const aCount = useSelector(a, (s) => (s as { count: number }).count)
      const bCount = useSelector(b, (s) => (s as { count: number }).count)

      return (
        <>
          <span data-testid="a-count">{String(aCount)}</span>
          <span data-testid="b-count">{String(bCount)}</span>
          <span data-testid="a-id">{String(a.runtime.instanceId)}</span>
          <span data-testid="b-id">{String(b.runtime.instanceId)}</span>
        </>
      )
    }

    const { getByTestId, unmount } = render(<View />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(getByTestId('a-count').textContent).toBe('0')
      expect(getByTestId('b-count').textContent).toBe('10')
      expect(getByTestId('a-id').textContent).not.toBe(getByTestId('b-id').textContent)
    })

    unmount()
    await runtime.dispose()
  })
})
