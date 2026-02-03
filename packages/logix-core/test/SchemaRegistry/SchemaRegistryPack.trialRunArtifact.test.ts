import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('SchemaRegistryPack', () => {
  it.effect('exports @logixjs/schema.registry@v1 as a trial-run artifact', () =>
    Effect.gen(function* () {
      const M = Logix.Module.make('SchemaRegistryPack.Artifact.Demo', {
        state: Schema.Struct({ count: Schema.Number }),
        actions: {
          inc: Schema.Struct({ by: Schema.Number }),
          noop: Schema.Void,
        },
        reducers: {
          inc: (s, a) => ({ ...s, count: s.count + (a.payload.by ?? 0) }),
          noop: (s) => s,
        },
      })

      const AppRoot = M.implement({ initial: { count: 0 }, logics: [] })
      const report = yield* Logix.Observability.trialRunModule(AppRoot, {
        diagnosticsLevel: 'off',
        maxEvents: 0,
        trialRunTimeoutMs: 1000,
        closeScopeTimeout: 500,
      })

      expect(report.artifacts).toBeDefined()
      const env: any = (report.artifacts as any)['@logixjs/schema.registry@v1']
      expect(env).toBeDefined()
      expect(env.ok).toBe(true)
      expect(env.value.protocolVersion).toBe('v1')
      expect(typeof env.value.effectVersion).toBe('string')
      expect(Array.isArray(env.value.schemas)).toBe(true)
      expect(env.value.schemas.length).toBeGreaterThan(0)

      const sample: any = env.value.schemas[0]
      expect(typeof sample.schemaId).toBe('string')
      expect(sample.schemaId.length).toBeGreaterThan(0)
      expect(sample.ast).toBeDefined()
    }),
  )
})

