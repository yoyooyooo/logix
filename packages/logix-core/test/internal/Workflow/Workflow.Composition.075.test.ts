import { describe, it, expect } from '@effect/vitest'
import * as Logix from '../../../src/index.js'
import type { WorkflowComposeResult, WorkflowStep } from '../../../src/Workflow.js'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

describe('Workflow composition (075)', () => {
  it('FR-006: fragment → compose records sources.fragmentId (including nested call steps)', () => {
    const frag = Logix.Workflow.fragment('FragA', [
      Logix.Workflow.callById({
        key: 'call.outer',
        serviceId: 'svc',
        onSuccess: [Logix.Workflow.dispatch({ key: 'dispatch.inner', actionTag: 'ok' })],
        onFailure: [],
      }),
    ])

    const composed = Logix.Workflow.compose(frag)

    expect(composed.sources?.['call.outer']?.fragmentId).toBe('FragA')
    expect(composed.sources?.['dispatch.inner']?.fragmentId).toBe('FragA')
  })

  it('FR-006: compose fails fast on duplicate stepKey and includes owners.fragmentId', () => {
    const a = Logix.Workflow.fragment('A', [Logix.Workflow.dispatch({ key: 'dup', actionTag: 'ok' })])
    const b = Logix.Workflow.fragment('B', [Logix.Workflow.delay({ key: 'dup', ms: 1 })])

    try {
      Logix.Workflow.compose(a, b)
      throw new Error('Expected Workflow.compose to throw')
    } catch (e: unknown) {
      const err = isRecord(e) ? e : {}
      const source = isRecord(err.source) ? err.source : {}
      const detail = isRecord(err.detail) ? err.detail : {}

      expect(err._tag).toBe('WorkflowError')
      expect(err.code).toBe('WORKFLOW_DUPLICATE_STEP_KEY')
      expect(source.stepKey).toBe('dup')
      expect(detail.duplicateKey).toBe('dup')
      expect(detail.owners).toEqual([
        { stepKey: 'dup', fragmentId: 'A' },
        { stepKey: 'dup', fragmentId: 'B' },
      ])
    }
  })

  it('FR-006: withPolicy fills call defaults, but inner policy overrides outer (outer is weaker)', () => {
    const part: WorkflowComposeResult = {
      steps: [
        Logix.Workflow.callById({
          key: 'call.outer',
          serviceId: 'svc',
          onSuccess: [
            Logix.Workflow.callById({
              key: 'call.inner',
              serviceId: 'svc',
              timeoutMs: 50,
              onSuccess: [],
              onFailure: [],
            }),
          ],
          onFailure: [],
        }),
      ],
      policy: { concurrency: 'latest' as const },
    }

    const out = Logix.Workflow.withPolicy({ concurrency: 'exhaust', priority: 'urgent', timeoutMs: 100, retry: { times: 3 } }, part)

    // inner policy overrides outer concurrency; outer fills missing priority
    expect(out.policy).toEqual({ concurrency: 'latest', priority: 'urgent' })

    const outer: WorkflowStep | undefined = out.steps[0]
    if (!outer || outer.kind !== 'call') {
      throw new Error('Expected out.steps[0] to be a call step')
    }
    const inner: WorkflowStep | undefined = outer.onSuccess[0]
    if (!inner || inner.kind !== 'call') {
      throw new Error('Expected out.steps[0].onSuccess[0] to be a call step')
    }

    // fill defaults only when missing
    expect(outer.timeoutMs).toBe(100)
    expect(outer.retry).toEqual({ times: 3 })
    expect(inner.timeoutMs).toBe(50)
    expect(inner.retry).toEqual({ times: 3 })
  })
})
