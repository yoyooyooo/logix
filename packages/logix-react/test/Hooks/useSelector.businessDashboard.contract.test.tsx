import { describe, expect, it } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { act, render, waitFor } from '@testing-library/react'
import * as Logix from '@logixjs/core'
import { Schema } from 'effect'
import { RuntimeProvider, fieldValue, useModule, useSelector } from '../../src/index.js'

const Dashboard = Logix.Module.make('useSelectorBusinessDashboard.Cards', {
  state: Schema.Struct({
    cards: Schema.Struct({
      revenue: Schema.Struct({ value: Schema.Number }),
      churn: Schema.Struct({ value: Schema.Number }),
      latency: Schema.Struct({ value: Schema.Number }),
    }),
  }),
  actions: {
    setRevenue: Schema.Number,
    setChurn: Schema.Number,
  },
  reducers: {
    setRevenue: Logix.Module.Reducer.mutate((draft, payload: number) => {
      draft.cards.revenue.value = payload
    }),
    setChurn: Logix.Module.Reducer.mutate((draft, payload: number) => {
      draft.cards.churn.value = payload
    }),
  },
})

describe('useSelector business witness: dashboard independent cards', () => {
  it('publishes only the updated card projection for exact card selectors', async () => {
    const runtime = Logix.Runtime.make(
      Logix.Program.make(Dashboard, {
        initial: {
          cards: {
            revenue: { value: 120 },
            churn: { value: 3 },
            latency: { value: 80 },
          },
        },
      }),
    )

    const renders = {
      revenue: 0,
      churn: 0,
      latency: 0,
    }
    let dashboardRef: any

    const RevenueCard = () => {
      renders.revenue += 1
      const dashboard = useModule(Dashboard.tag)
      dashboardRef = dashboard
      const value = useSelector(dashboard, fieldValue('cards.revenue.value'))
      return <span data-testid="revenue">{String(value)}</span>
    }

    const ChurnCard = () => {
      renders.churn += 1
      const dashboard = useModule(Dashboard.tag)
      const value = useSelector(dashboard, fieldValue('cards.churn.value'))
      return <span data-testid="churn">{String(value)}</span>
    }

    const LatencyCard = () => {
      renders.latency += 1
      const dashboard = useModule(Dashboard.tag)
      const value = useSelector(dashboard, fieldValue('cards.latency.value'))
      return <span data-testid="latency">{String(value)}</span>
    }

    const view = render(
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <RevenueCard />
        <ChurnCard />
        <LatencyCard />
      </RuntimeProvider>,
    )

    await waitFor(() => {
      expect(view.getByTestId('revenue').textContent).toBe('120')
      expect(view.getByTestId('churn').textContent).toBe('3')
      expect(view.getByTestId('latency').textContent).toBe('80')
    })

    const baselineChurn = renders.churn
    const baselineLatency = renders.latency

    await act(async () => {
      dashboardRef!.dispatchers.setRevenue(140)
    })

    await waitFor(() => {
      expect(view.getByTestId('revenue').textContent).toBe('140')
    })

    expect(renders.churn).toBe(baselineChurn)
    expect(renders.latency).toBe(baselineLatency)
  })
})
