import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'

describe('/ir: no artifacts', () => {
  it.effect('keeps artifacts minimal for non-kit modules', () =>
    Effect.gen(function* () {
      const M = Logix.Module.make('IrTest.NoArtifacts', {
        state: Schema.Struct({ ok: Schema.Boolean }),
        actions: { noop: Schema.Void },
        reducers: { noop: (s) => s },
      })

      const AppRoot = M.implement({ initial: { ok: true }, logics: [] })

      const report = yield* Logix.Observability.trialRunModule(AppRoot, {
        diagnosticsLevel: 'off',
        maxEvents: 0,
        trialRunTimeoutMs: 1000,
        closeScopeTimeout: 500,
      })

      const artifacts = report.artifacts
      expect(artifacts).toBeDefined()
      expect(Object.keys(artifacts ?? {}).sort()).toContain('@logixjs/module.portSpec@v1')
      expect(Object.keys(artifacts ?? {}).sort()).toContain('@logixjs/module.typeIr@v1')
      expect(Object.keys(artifacts ?? {}).sort()).not.toContain('@logixjs/form.rulesManifest@v1')
      expect(() => JSON.stringify(report)).not.toThrow()
    }),
  )
})
