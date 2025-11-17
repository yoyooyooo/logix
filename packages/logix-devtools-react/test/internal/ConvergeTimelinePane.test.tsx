// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Effect } from 'effect'
import { LogixDevtools } from '../../src/LogixDevtools.js'
import { devtoolsRuntime, devtoolsModuleRuntime, type DevtoolsState } from '../../src/internal/state/index.js'

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

const dispatchDevtools = async (action: any) => {
  await devtoolsRuntime.runPromise(devtoolsModuleRuntime.dispatch(action) as Effect.Effect<any, any, any>)
}

afterEach(async () => {
  await dispatchDevtools({ _tag: 'clearImportedEvidence', payload: undefined })
  await dispatchDevtools({ _tag: 'clearEvents', payload: undefined })
})

describe('015 · Converge Performance Pane', () => {
  it('light 降级不白屏；点击 audit 与 txn 高亮联动', async () => {
    render(<LogixDevtools position="bottom-left" initialOpen={true} />)

    const now = 1_700_000_000_000
    const moduleId = 'ConvergePaneTest'
    const instanceId = 'inst-1'
    const runtimeLabel = 'imported'

    const makeConvergeRef = (params: { eventSeq: number; txnSeq: number; meta: any }) => ({
      eventId: `${instanceId}::e${params.eventSeq}`,
      eventSeq: params.eventSeq,
      moduleId,
      instanceId,
      runtimeLabel,
      txnSeq: params.txnSeq,
      txnId: `txn-${params.txnSeq}`,
      timestamp: now + params.txnSeq,
      kind: 'trait:converge',
      label: 'trait:converge',
      meta: params.meta,
    })

    const evidencePackage = {
      protocolVersion: 'v1',
      runId: 'run-1',
      createdAt: now,
      source: { host: 'test' },
      events: [
        {
          protocolVersion: 'v1',
          runId: 'run-1',
          seq: 1,
          timestamp: now + 2,
          type: 'debug:event',
          payload: makeConvergeRef({
            eventSeq: 2,
            txnSeq: 2,
            meta: {
              requestedMode: 'dirty',
              executedMode: 'dirty',
              outcome: 'Converged',
              configScope: 'runtime_module',
              staticIrDigest: `${instanceId}:0`,
              executionBudgetMs: 200,
              executionDurationMs: 20,
              reasons: ['cache_hit'],
              stepStats: { totalSteps: 10, executedSteps: 9, skippedSteps: 1, changedSteps: 1 },
              dirty: { dirtyAll: false },
              cache: { capacity: 128, size: 1, hits: 1, misses: 0, evicts: 0, hit: true },
            },
          }),
        },
        {
          protocolVersion: 'v1',
          runId: 'run-1',
          seq: 2,
          timestamp: now + 10,
          type: 'debug:event',
          payload: makeConvergeRef({
            eventSeq: 10,
            txnSeq: 10,
            meta: {
              requestedMode: 'auto',
              executedMode: 'full',
              outcome: 'Degraded',
              configScope: 'builtin',
              staticIrDigest: `${instanceId}:0`,
              executionBudgetMs: 200,
              executionDurationMs: 260,
              reasons: ['budget_cutoff'],
              stepStats: { totalSteps: 100, executedSteps: 40, skippedSteps: 60, changedSteps: 0 },
              dirty: { dirtyAll: true },
              cache: { capacity: 128, size: 1, hits: 0, misses: 1, evicts: 0, hit: false },
            },
          }),
        },
      ],
    }

    await dispatchDevtools({
      _tag: 'importEvidenceJson',
      payload: JSON.stringify(evidencePackage),
    })

    await waitFor(() => {
      expect(screen.getByText(/Developer Tools/i)).not.toBeNull()
    })

    const convergeViewButton = screen.getAllByRole('button', { name: /^Converge$/i })[0]
    fireEvent.click(convergeViewButton)

    await waitFor(() => {
      expect(screen.getByText(/Converge Timeline/i)).not.toBeNull()
    })

    // Light clipping: when `dirty.rootCount` is missing, CNV-007 should appear as `insufficient_evidence` (no blank screen).
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'ConvergeAudit:CNV-007' })).not.toBeNull()
    })

    // Click CNV-001: highlight the matching txn (t10) without affecting the current default selection (t2).
    const cnv001 = screen.getByRole('button', { name: 'ConvergeAudit:CNV-001' })
    fireEvent.click(cnv001)

    const txn10 = screen.getByRole('button', { name: 'ConvergeTxn:10' })
    await waitFor(() => {
      expect((txn10 as HTMLButtonElement).style.borderColor).toContain('var(--dt-warning)')
    })

    // Click txn t10: highlight CNV-001 in reverse (txn -> audits linkage).
    fireEvent.click(txn10)

    await waitFor(() => {
      const cnv001Btn = screen.getByRole('button', { name: 'ConvergeAudit:CNV-001' }) as HTMLButtonElement
      expect(cnv001Btn.style.borderColor).toContain('var(--dt-danger)')
    })
  })
})
