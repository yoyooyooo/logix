import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('TrialRunArtifacts.registry', () => {
  it.effect('exports artifacts from module tag registry', () =>
    Effect.gen(function* () {
      const M = Logix.Module.make('Artifacts.Registry.Demo', {
        state: Schema.Struct({ ok: Schema.Boolean }),
        actions: { noop: Schema.Void },
        reducers: { noop: (s) => s },
      })

      Logix.Observability.registerTrialRunArtifactExporter(M.tag as any, {
        exporterId: 'dummy@v1',
        artifactKey: '@logix/demo.dummy@v1',
        export: () => ({ hello: 'world' }) as const,
      })

      const AppRoot = M.implement({ initial: { ok: true }, logics: [] })
      const report = yield* Logix.Observability.trialRunModule(AppRoot, {
        diagnosticsLevel: 'off',
        maxEvents: 0,
        trialRunTimeoutMs: 1000,
        closeScopeTimeout: 500,
      })

      expect(report.artifacts).toBeDefined()
      const env: any = (report.artifacts as any)['@logix/demo.dummy@v1']
      expect(env.ok).toBe(true)
      expect(env.value).toEqual({ hello: 'world' })
    }),
  )
})
