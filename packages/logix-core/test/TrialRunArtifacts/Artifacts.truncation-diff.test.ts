import { describe, it, expect } from 'vitest'
import { collectTrialRunArtifacts } from '../../src/internal/observability/artifacts/collect.js'
import type { TrialRunArtifactExporter } from '../../src/internal/observability/artifacts/exporter.js'

describe('TrialRunArtifacts.collect: truncation diff', () => {
  it('keeps envelope shape JSON-diff friendly after truncation', () => {
    const exporters: ReadonlyArray<TrialRunArtifactExporter> = [
      {
        exporterId: 'big',
        artifactKey: '@logix/demo.big@v1',
        export: () => ({ blob: 'x'.repeat(50_000) }),
      },
    ]

    const artifacts = collectTrialRunArtifacts({
      exporters,
      ctx: { moduleId: 'M' },
      budgets: { maxBytes: 200 },
    })

    expect(artifacts).toBeDefined()
    expect(() => JSON.stringify(artifacts)).not.toThrow()

    const env: any = (artifacts as any)['@logix/demo.big@v1']
    expect(env.ok).toBe(true)
    expect(env.truncated).toBe(true)
    expect(env.value?._tag).toBe('oversized')
    expect(typeof env.digest).toBe('string')
    expect(env.digest).toContain('artifact:031:')
  })
})
