import { describe, expect, it } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('verification selector-quality layering', () => {
  it.effect('runtime.check may report static selector-quality artifacts without host evidence', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('VerificationSelectorQuality.Check', {
        state: Schema.Struct({ count: Schema.Number }),
        actions: {},
      })

      const program = Logix.Program.make(Root, {
        initial: { count: 0 },
        logics: [],
      })

      const report = yield* Logix.Runtime.check(program, {
        runId: 'run:test:selector-quality-check',
      })

      expect(report.stage).toBe('check')
      expect(report.mode).toBe('static')
      expect(report.artifacts).toContainEqual(
        expect.objectContaining({
          outputKey: 'selector-quality:static',
          kind: 'SelectorQualityArtifact',
        }),
      )
      expect(JSON.stringify(report)).not.toContain('host-harness')
      expect(JSON.stringify(report)).not.toContain('React commit')
      expect(JSON.stringify(report)).not.toContain('subscription fanout')
    }),
  )

  it.effect('runtime.trial may report startup selector policy without host-harness evidence', () =>
    Effect.gen(function* () {
      const Root = Logix.Module.make('VerificationSelectorQuality.Trial', {
        state: Schema.Struct({ count: Schema.Number }),
        actions: {},
      })

      const program = Logix.Program.make(Root, {
        initial: { count: 0 },
        logics: [],
      })

      const report = yield* Logix.Runtime.trial(program, {
        runId: 'run:test:selector-quality-trial',
      })

      expect(report.stage).toBe('trial')
      expect(report.mode).toBe('startup')
      expect(report.artifacts).toContainEqual(
        expect.objectContaining({
          outputKey: 'selector-quality:startup',
          kind: 'SelectorQualityArtifact',
        }),
      )
      expect(JSON.stringify(report)).not.toContain('host-harness')
      expect(JSON.stringify(report)).not.toContain('render isolation')
      expect(JSON.stringify(report)).not.toContain('subscription fanout')
    }),
  )
})
