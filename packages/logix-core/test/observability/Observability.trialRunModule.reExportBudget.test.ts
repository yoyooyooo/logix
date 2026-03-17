import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

const utf8Bytes = (value: unknown): number => {
  const json = JSON.stringify(value) ?? 'null'
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(json).length
  }
  return json.length
}

describe('Observability.trialRunModule (re-export budget)', () => {
  it.effect('should recover by slimming heavy re-export fields within maxBytes', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('TrialRunModule.ReExportBudget.Recovered', {
        state: Schema.Struct({ ok: Schema.Boolean }),
        actions: { noop: Schema.Void },
        reducers: { noop: (s) => s },
      })

      Logix.Observability.registerTrialRunArtifactExporter(Root.tag as any, {
        exporterId: 'trial-run-budget-heavy@v1',
        artifactKey: '@logixjs/test.trial-run-budget-heavy@v1',
        export: () => ({
          blob: 'x'.repeat(16_000),
        }),
      })

      const program = Root.implement({ initial: { ok: true }, logics: [] })

      const report = yield* Logix.Observability.trialRunModule(program, {
        runId: 'run:test:re-export-budget:recovered',
        diagnosticsLevel: 'off',
        maxEvents: 20,
        budgets: { maxBytes: 4_096 },
      })

      const reExport: any = (report.summary as any)?.__logix?.reExport
      const issueCodes = Array.isArray(reExport?.issues) ? reExport.issues.map((x: any) => x?.code) : []

      expect(report.ok).toBe(true)
      expect(report.error).toBeUndefined()
      expect(reExport?.status).toBe('recovered')
      expect(issueCodes).toContain('ReExportBudgetRecovered')
      expect(Array.isArray(reExport?.dropped)).toBe(true)
      expect(reExport?.dropped).toContain('artifacts')
      expect(report.artifacts).toBeUndefined()
      expect(utf8Bytes(report)).toBeLessThanOrEqual(4_096)
    }),
  )

  it.effect('should surface Oversized when slim fallback still cannot fit maxBytes', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('TrialRunModule.ReExportBudget.Oversized', {
        state: Schema.Void,
        actions: {},
      })

      const program = Root.implement({ initial: undefined, logics: [] })

      const report = yield* Logix.Observability.trialRunModule(program, {
        runId: 'run:test:re-export-budget:oversized',
        diagnosticsLevel: 'off',
        maxEvents: 1,
        budgets: { maxBytes: 8 },
      })

      const reExport: any = (report.summary as any)?.__logix?.reExport
      const issueCodes = Array.isArray(reExport?.issues) ? reExport.issues.map((x: any) => x?.code) : []

      expect(report.ok).toBe(false)
      expect(report.error?.code).toBe('Oversized')
      expect(reExport?.status).toBe('failed')
      expect(issueCodes).toContain('Oversized')
    }),
  )
})
