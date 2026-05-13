import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { trialRunModule } from '../../../packages/logix-core/src/internal/observability/trialRunModule.js'

describe('/ir: no artifacts', () => {
  it.effect('keeps artifacts undefined for non-kit modules', () =>
    Effect.gen(function* () {
      const M = Logix.Module.make('IrTest.NoArtifacts', {
        state: Schema.Struct({ ok: Schema.Boolean }),
        actions: { noop: Schema.Void },
        reducers: { noop: (s) => s },
      })

      const AppRoot = Logix.Program.make(M, { initial: { ok: true }, logics: [] })

      const report = yield* trialRunModule(AppRoot as any, {
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
