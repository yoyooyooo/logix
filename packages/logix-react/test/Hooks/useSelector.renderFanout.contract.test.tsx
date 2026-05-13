// @vitest-environment happy-dom
import React from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider, fieldValue, useModule, useSelector } from '../../src/index.js'

const FanoutModule = Logix.Module.make('UseSelectorRenderFanoutContract', {
  state: Schema.Struct({ count: Schema.Number, other: Schema.Number }),
  actions: { incOther: Schema.Void, incCount: Schema.Void },
  reducers: {
    incOther: Logix.Module.Reducer.mutate((draft) => {
      draft.other += 1
    }),
    incCount: Logix.Module.Reducer.mutate((draft) => {
      draft.count += 1
    }),
  },
})

describe('useSelector render fanout contract', () => {
  it('does not re-render an unrelated exact selector after a disjoint dirty write', async () => {
    const runtime = Logix.Runtime.make(
      Logix.Program.make(FanoutModule, {
        initial: { count: 0, other: 0 },
      }),
    )

    let countSelectorRenderCount = 0
    let actions: { incOther?: () => void; incCount?: () => void } = {}

    const CountView: React.FC<{ readonly handle: any }> = ({ handle }) => {
      countSelectorRenderCount += 1
      const count = useSelector(handle, fieldValue('count'))
      return <p>Count: {count}</p>
    }

    const OtherView: React.FC<{ readonly handle: any }> = ({ handle }) => {
      const other = useSelector(handle, fieldValue('other'))
      return <p>Other: {other}</p>
    }

    const App: React.FC = () => {
      const handle = useModule(FanoutModule.tag)
      React.useEffect(() => {
        actions = {
          incOther: handle.dispatchers.incOther,
          incCount: handle.dispatchers.incCount,
        }
      }, [handle])

      return (
        <>
          <CountView handle={handle} />
          <OtherView handle={handle} />
        </>
      )
    }

    const view = render(
      <RuntimeProvider runtime={runtime}>
        <App />
      </RuntimeProvider>,
    )

    try {
      await waitFor(() => {
        expect(screen.getByText('Count: 0')).toBeTruthy()
        expect(screen.getByText('Other: 0')).toBeTruthy()
        expect(actions.incOther).toBeDefined()
      })

      const countRendersBefore = countSelectorRenderCount

      await act(async () => {
        actions.incOther?.()
      })

      await waitFor(() => {
        expect(screen.getByText('Other: 1')).toBeTruthy()
      })

      expect(screen.getByText('Count: 0')).toBeTruthy()
      expect(countSelectorRenderCount).toBe(countRendersBefore)

      await act(async () => {
        actions.incCount?.()
      })

      await waitFor(() => {
        expect(screen.getByText('Count: 1')).toBeTruthy()
      })

      expect(countSelectorRenderCount).toBeGreaterThan(countRendersBefore)
    } finally {
      view.unmount()
      await runtime.dispose()
    }
  })
})
