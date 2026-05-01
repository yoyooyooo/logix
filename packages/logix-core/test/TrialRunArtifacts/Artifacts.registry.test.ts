import * as CoreEvidence from '@logixjs/core/repo-internal/evidence-api'
import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import { trialRunModule } from '../../src/internal/observability/trialRunModule.js'

describe('TrialRunArtifacts.registry', () => {
  it.effect('exports artifacts from module tag registry', () =>
    Effect.gen(function* () {
      const M = Logix.Module.make('Artifacts.Registry.Demo', {
        state: Schema.Struct({ ok: Schema.Boolean }),
        actions: { noop: Schema.Void },
        reducers: { noop: (s) => s },
      })

      CoreEvidence.registerTrialRunArtifactExporter(M.tag as any, {
        exporterId: 'dummy@v1',
        artifactKey: '@logixjs/demo.dummy@v1',
        export: () => ({ hello: 'world' }) as const,
      })

      const program = Logix.Program.make(M, { initial: { ok: true }, logics: [] })
      const report = yield* trialRunModule(program as any, {
        diagnosticsLevel: 'off',
        maxEvents: 0,
        trialRunTimeoutMs: 1000,
        closeScopeTimeout: 500,
      })

      expect(report.artifacts).toBeDefined()
      const env: any = (report.artifacts as any)['@logixjs/demo.dummy@v1']
      expect(env.ok).toBe(true)
      expect(env.value).toEqual({ hello: 'world' })
    }),
  )
})
