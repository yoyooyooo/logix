import { describe, expect, it } from 'vitest'
import { computeConvergeAudits } from '../../src/internal/state/converge/audits.js'
import type { ConvergeTxnRow } from '../../src/internal/state/converge/model.js'

const makeRow = (overrides: Partial<ConvergeTxnRow> & { evidence: unknown }): ConvergeTxnRow => ({
  moduleId: 'DemoModule',
  instanceId: 'inst-1',
  txnId: 'txn-1',
  txnSeq: 1,
  eventSeq: 1,
  timestamp: Date.now(),
  orderKey: { kind: 'instance', seq: 1 },
  downgradeReason: undefined,
  ...overrides,
})

describe('015 · ConvergeAudits', () => {
  it('证据充足：能命中审计并输出可复制代码片段，且输出可序列化', () => {
    const rows: ConvergeTxnRow[] = [
      makeRow({
        txnSeq: 10,
        evidence: {
          requestedMode: 'auto',
          executedMode: 'full',
          outcome: 'Degraded',
          configScope: 'builtin',
          staticIrDigest: 'inst-1:0',
          executionBudgetMs: 200,
          executionDurationMs: 260,
          reasons: ['budget_cutoff'],
          stepStats: { totalSteps: 100, executedSteps: 40, skippedSteps: 60, changedSteps: 1 },
          dirty: { dirtyAll: true },
          cache: { capacity: 128, size: 1, hits: 0, misses: 1, evicts: 0, hit: false },
        },
      }),
    ]

    const audits = computeConvergeAudits(rows)
    expect(audits.length).toBeGreaterThan(0)

    const cnv001 = audits.find((a) => a.id === 'CNV-001')
    expect(cnv001).toBeDefined()
    expect(cnv001?.requires.status).toBe('ok')
    expect(cnv001?.snippets.length).toBeGreaterThanOrEqual(2)
    expect(cnv001?.snippets.map((s) => s.kind)).toEqual(['provider_override', 'module_override'])
    expect(cnv001?.snippets[0]?.expectedConfigScope).toBe('provider')
    expect(cnv001?.snippets[1]?.expectedConfigScope).toBe('runtime_module')
    expect(cnv001?.snippets[0]?.text).toContain('traitConvergeBudgetMs')

    expect(() => JSON.parse(JSON.stringify(audits))).not.toThrow()
  })

  it('证据不足：需要 dirty.rootCount 的审计会降级为 insufficient_evidence', () => {
    const rows: ConvergeTxnRow[] = [
      makeRow({
        txnSeq: 2,
        evidence: {
          requestedMode: 'dirty',
          executedMode: 'dirty',
          outcome: 'Converged',
          configScope: 'runtime_module',
          staticIrDigest: 'inst-1:0',
          executionBudgetMs: 200,
          executionDurationMs: 20,
          reasons: ['cache_hit'],
          stepStats: { totalSteps: 10, executedSteps: 9, skippedSteps: 1, changedSteps: 1 },
          dirty: { dirtyAll: false },
          cache: { capacity: 128, size: 1, hits: 1, misses: 0, evicts: 0, hit: true },
        },
      }),
    ]

    const audits = computeConvergeAudits(rows)
    const cnv007 = audits.find((a) => a.id === 'CNV-007')
    expect(cnv007).toBeDefined()
    expect(cnv007?.requires.status).toBe('insufficient_evidence')
    expect(cnv007?.requires.missingFields).toContain('dirty.rootCount')

    expect(() => JSON.parse(JSON.stringify(audits))).not.toThrow()
  })
})
