import { describe, it, expect } from 'vitest'
import { collectTrialRunArtifacts } from '../../src/internal/observability/artifacts/collect.js'
import type { TrialRunArtifactExporter } from '../../src/internal/observability/artifacts/exporter.js'

describe('TrialRunArtifacts.collect: partial failure', () => {
  it('does not block other artifacts when one exporter fails', () => {
    const exporters: ReadonlyArray<TrialRunArtifactExporter> = [
      {
        exporterId: 'ok',
        artifactKey: '@logixjs/demo.ok@v1',
        export: () => ({ ok: true }) as const,
      },
      {
        exporterId: 'boom',
        artifactKey: '@logixjs/demo.boom@v1',
        export: () => {
          throw Object.assign(new Error('boom'), { code: 'BOOM' })
        },
      },
    ]

    const artifacts = collectTrialRunArtifacts({
      exporters,
      ctx: { moduleId: 'M' },
      budgets: { maxBytes: 1024 },
    })

    expect(artifacts).toBeDefined()
    expect(Object.keys(artifacts!)).toEqual(['@logixjs/demo.boom@v1', '@logixjs/demo.ok@v1'])

    const ok = (artifacts as any)['@logixjs/demo.ok@v1']
    expect(ok.ok).toBe(true)
    expect(ok.value).toEqual({ ok: true })

    const boom = (artifacts as any)['@logixjs/demo.boom@v1']
    expect(boom.ok).toBe(false)
    expect(boom.error?.code).toBe('ArtifactExportFailed')
    expect(String(boom.error?.hint ?? '')).toContain('@logixjs/demo.boom@v1')
    expect(String(boom.error?.hint ?? '')).toContain('boom')
  })
})
