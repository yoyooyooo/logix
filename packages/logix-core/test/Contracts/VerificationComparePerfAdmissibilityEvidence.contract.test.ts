import { describe, expect, it } from '@effect/vitest'
import { Effect, Exit } from 'effect'
import {
  makeScenarioRunSession,
  runScenarioCompiledPlan,
} from '../../src/internal/verification/scenarioCompiledPlanCarrier.js'
import { scenarioCarrierFeedExistsTarget } from '../internal/verification/fixtures/scenarioEvidenceExpectationFixture.js'
import { compileScenarioFixtureToPlan, type ScenarioFixture } from '../internal/verification/fixtures/scenarioCompiledPlanFixtureAdapter.js'
import { makeComparePerfAdmissibilityEvidence } from '../internal/verification/fixtures/comparePerfAdmissibilityFixture.js'
import { withProofKernelContext } from '../../src/internal/verification/proofKernel.js'

describe('Verification compare/perf admissibility evidence contract', () => {
  it.effect('derives stable admissibility digests without owning correctness verdict', () =>
    Effect.gen(function* () {
      const fixture: ScenarioFixture = {
        fixtureId: 'fixture:pf-09',
        fixtures: {
          env: {
            profile: 'benchmark-admissible-subset',
          },
        },
        steps: [
          {
            kind: 'emitReasonLink',
            stepId: 'step:reason-link',
            state: {
              $form: {
                submitAttempt: {
                  reasonSlotId: 'submit:1',
                },
              },
            },
            listPath: 'items',
            rowId: 'row-2',
            fieldPath: 'warehouseId',
            formEvidenceContract: {
              sources: [
                {
                  fieldPath: 'items.warehouseId',
                  bundlePatchPath: 'items.warehouseId',
                },
              ],
            },
          },
        ],
        expect: [
          {
            kind: 'exists',
            target: scenarioCarrierFeedExistsTarget,
          },
        ],
      }

      const plan = compileScenarioFixtureToPlan(fixture)
      const first = yield* withProofKernelContext(
        {
          runId: 'run:test:pf-09:first',
          diagnosticsLevel: 'off',
        },
        ({ session }) => runScenarioCompiledPlan(plan, makeScenarioRunSession({ runId: session.runId })),
      )
      const second = yield* withProofKernelContext(
        {
          runId: 'run:test:pf-09:first',
          diagnosticsLevel: 'off',
        },
        ({ session }) => runScenarioCompiledPlan(plan, makeScenarioRunSession({ runId: session.runId })),
      )

      expect(Exit.isSuccess(first.exit)).toBe(true)
      expect(Exit.isSuccess(second.exit)).toBe(true)

      const firstEvidence = makeComparePerfAdmissibilityEvidence({
        plan,
        fixture,
        evidence: first.evidence,
        environment: {
          host: 'node',
          profile: 'default',
        },
      })
      const secondEvidence = makeComparePerfAdmissibilityEvidence({
        plan,
        fixture,
        evidence: second.evidence,
        environment: {
          host: 'node',
          profile: 'default',
        },
      })

      expect(firstEvidence).toEqual(secondEvidence)
      expect(firstEvidence.correctnessVerdict).toBe('not-owned')
      expect(firstEvidence.compiledPlanDigest).toContain('compiledPlan:')
      expect(firstEvidence.fixtureIdentityDigest).toContain('fixtureIdentity:')
      expect(firstEvidence.environmentFingerprint).toContain('environment:')
    }),
  )
})
