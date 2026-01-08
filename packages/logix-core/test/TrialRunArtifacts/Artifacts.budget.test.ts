import { describe, it, expect } from 'vitest'
import { collectTrialRunArtifacts } from '../../src/internal/observability/artifacts/collect.js'
import type { TrialRunArtifactExporter } from '../../src/internal/observability/artifacts/exporter.js'

describe('TrialRunArtifacts.collect: budget', () => {
  it('marks truncation and keeps the envelope JSON-safe and stable', () => {
    const exporters: ReadonlyArray<TrialRunArtifactExporter> = [
      {
        exporterId: 'big',
        artifactKey: '@logixjs/demo.big@v1',
        export: () => ({ text: 'x'.repeat(10_000) }),
      },
    ]

    const artifacts1 = collectTrialRunArtifacts({
      exporters,
      ctx: { moduleId: 'M' },
      budgets: { maxBytes: 200 },
    })
    const artifacts2 = collectTrialRunArtifacts({
      exporters,
      ctx: { moduleId: 'M' },
      budgets: { maxBytes: 200 },
    })

    expect(artifacts1).toBeDefined()
    expect(artifacts2).toBeDefined()
    expect(JSON.stringify(artifacts1)).toBe(JSON.stringify(artifacts2))

    const env = (artifacts1 as any)['@logixjs/demo.big@v1']
    expect(env.ok).toBe(true)
    expect(env.truncated).toBe(true)
    expect(env.budgetBytes).toBe(200)
    expect(typeof env.actualBytes).toBe('number')
    expect(env.actualBytes).toBeGreaterThan(200)
    expect(env.value?._tag).toBe('oversized')
  })
})
