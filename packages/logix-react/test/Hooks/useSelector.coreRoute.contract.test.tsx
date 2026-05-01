import { describe, expect, it } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
import * as Logix from '@logixjs/core'
import { Schema } from 'effect'
import { RuntimeProvider, fieldValue, useModule, useSelector } from '../../src/index.js'

const Counter = Logix.Module.make('useSelectorCoreRouteCounter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {},
})

describe('useSelector core route contract', () => {
  it('uses the core exact route for selector inputs', async () => {
    const runtime = Logix.Runtime.make(
      Logix.Program.make(Counter, {
        initial: { count: 7 },
      }),
    )
    const route = RuntimeContracts.Selector.route(RuntimeContracts.Selector.compile(fieldValue('count') as any))

    expect(route.kind).toBe('exact')
    expect(route.precisionQuality).toBe('exact')

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    const { result } = renderHook(
      () => {
        const counter = useModule(Counter.tag)
        return useSelector(counter, fieldValue('count'))
      },
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current).toBe(7)
    })
  })

  it('rejects broad and dynamic route decisions through the core route', () => {
    const broad = RuntimeContracts.Selector.route(
      RuntimeContracts.Selector.compile({
        selectorId: 'broad-root',
        reads: [''],
        select: (state: unknown) => state,
        equalsKind: 'objectIs',
      }),
    )
    const dynamic = RuntimeContracts.Selector.route(
      {
        selectorId: 'dynamic',
        reads: [],
        select: (state: { readonly count: number }) => state.count,
        equalsKind: 'objectIs',
        lane: 'dynamic',
        producer: 'dynamic',
        fallbackReason: 'missingDeps',
        staticIr: {
          selectorId: 'dynamic',
          lane: 'dynamic',
          producer: 'dynamic',
          reads: [],
          fallbackReason: 'missingDeps',
          equalsKind: 'objectIs',
        },
      } satisfies RuntimeContracts.Selector.ReadQueryCompiled<{ readonly count: number }, number>,
    )

    expect(broad.kind).toBe('reject')
    expect(broad.failureCode).toBe('selector.broad_root')
    expect(dynamic.kind).toBe('reject')
    expect(dynamic.failureCode).toBe('selector.dynamic_fallback')
  })
})
