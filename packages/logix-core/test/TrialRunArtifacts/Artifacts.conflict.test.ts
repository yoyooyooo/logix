import { describe, it, expect } from 'vitest'
import { collectTrialRunArtifacts } from '../../src/internal/observability/artifacts/collect.js'
import type { TrialRunArtifactExporter } from '../../src/internal/observability/artifacts/exporter.js'

describe('TrialRunArtifacts.collect: conflict', () => {
  it('marks key conflicts as actionable errors and still exports other artifacts', () => {
    const conflictKey = '@logixjs/form.rulesManifest@v1'

    const exporters: ReadonlyArray<TrialRunArtifactExporter> = [
      {
        exporterId: 'e1',
        artifactKey: conflictKey,
        export: () => {
          throw new Error('should not run (conflict)')
        },
      },
      {
        exporterId: 'e2',
        artifactKey: conflictKey,
        export: () => {
          throw new Error('should not run (conflict)')
        },
      },
      {
        exporterId: 'ok',
        artifactKey: '@logixjs/demo.ok@v1',
        export: () => ({ ok: true }) as const,
      },
    ]

    const artifacts = collectTrialRunArtifacts({
      exporters,
      ctx: { moduleId: 'M' },
      budgets: { maxBytes: 1024 },
    })

    expect(artifacts).toBeDefined()
    expect(Object.keys(artifacts!)).toEqual(['@logixjs/demo.ok@v1', conflictKey])

    const conflict = (artifacts as any)[conflictKey]
    expect(conflict.ok).toBe(false)
    expect(conflict.error?.code).toBe('ArtifactKeyConflict')
    expect(String(conflict.error?.hint ?? '')).toContain('e1')
    expect(String(conflict.error?.hint ?? '')).toContain('e2')

    const ok = (artifacts as any)['@logixjs/demo.ok@v1']
    expect(ok.ok).toBe(true)
    expect(ok.value).toEqual({ ok: true })
  })
})
