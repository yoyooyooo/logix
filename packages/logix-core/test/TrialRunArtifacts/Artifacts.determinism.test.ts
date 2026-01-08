import { describe, it, expect } from 'vitest'
import { collectTrialRunArtifacts } from '../../src/internal/observability/artifacts/collect.js'
import type { TrialRunArtifactExporter } from '../../src/internal/observability/artifacts/exporter.js'

describe('TrialRunArtifacts.collect: determinism', () => {
  it('produces stable output for the same input', () => {
    const exporters: ReadonlyArray<TrialRunArtifactExporter> = [
      {
        exporterId: 'a',
        artifactKey: '@logixjs/demo.a@v1',
        export: () => ({ a: 1, b: 2 }) as const,
      },
      {
        exporterId: 'b',
        artifactKey: '@logixjs/demo.b@v1',
        export: () => ({ list: ['z', 'a'] }) as const,
      },
    ]

    const artifacts1 = collectTrialRunArtifacts({
      exporters,
      ctx: { moduleId: 'M' },
      budgets: { maxBytes: 1024 },
    })
    const artifacts2 = collectTrialRunArtifacts({
      exporters,
      ctx: { moduleId: 'M' },
      budgets: { maxBytes: 1024 },
    })

    expect(artifacts1).toBeDefined()
    expect(artifacts2).toBeDefined()
    expect(JSON.stringify(artifacts1)).toBe(JSON.stringify(artifacts2))

    const env: any = (artifacts1 as any)['@logixjs/demo.a@v1']
    expect(env.ok).toBe(true)
    expect(typeof env.digest).toBe('string')
    expect(String(env.digest)).toContain('artifact:031:')
  })
})
