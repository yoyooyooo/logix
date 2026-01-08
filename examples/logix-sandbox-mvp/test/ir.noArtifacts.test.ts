import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'

describe('/ir: no artifacts', () => {
  it.effect('keeps artifacts undefined for non-kit modules', () =>
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

      expect(report.artifacts).toBeUndefined()
      expect(() => JSON.stringify(report)).not.toThrow()
    }),
  )
})
