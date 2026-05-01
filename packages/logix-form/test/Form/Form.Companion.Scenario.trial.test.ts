import { describe, expect, it } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '../../src/index.js'
import { formEvidenceContractArtifactKey } from '../../src/internal/form/artifacts.js'

describe('Form companion control-plane trial contract', () => {
  it.effect('exports companion evidence contract through Runtime.trial startup report', () =>
    Effect.gen(function* () {
      const ValuesSchema = Schema.Struct({
        profileId: Schema.String,
      })

      const form = Form.make(
        'Form.Companion.Trial',
        {
          values: ValuesSchema,
          initialValues: { profileId: 'p1' },
        },
        (define) => {
          define.field('profileId').companion({
            deps: ['profileId'],
            lower: (ctx) => ({
              availability: { kind: ctx.value ? 'interactive' : 'hidden' },
              candidates: { items: [ctx.deps.profileId] },
            }),
          })
        },
      )

      const report = yield* Logix.Runtime.trial(form, {
        runId: 'run:test:form-companion-trial',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'off',
        maxEvents: 20,
      })

      expect(report.kind).toBe('VerificationControlPlaneReport')
      expect(report.verdict).toBe('PASS')
      expect(report.artifacts.some((artifact) => artifact.outputKey === formEvidenceContractArtifactKey)).toBe(true)
    }),
  )
})
