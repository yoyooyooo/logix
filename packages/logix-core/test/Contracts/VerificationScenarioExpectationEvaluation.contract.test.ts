import { describe, expect, it } from '@effect/vitest'
import { Effect, Exit } from 'effect'
import {
  makeScenarioRunSession,
  runScenarioCompiledPlan,
} from '../../src/internal/verification/scenarioCompiledPlanCarrier.js'
import {
  evaluateScenarioFixtureExpectations,
  scenarioCarrierFeedExistsTarget,
} from '../internal/verification/fixtures/scenarioEvidenceExpectationFixture.js'
import { compileScenarioFixtureToPlan, type ScenarioFixture } from '../internal/verification/fixtures/scenarioCompiledPlanFixtureAdapter.js'
import { withProofKernelContext } from '../../src/internal/verification/proofKernel.js'

describe('Verification scenario expectation evaluation contract', () => {
  it.effect('evaluates scenario fixture expectations against emitted evidence without producing summary truth', () =>
    Effect.gen(function* () {
      const fixture: ScenarioFixture = {
        fixtureId: 'fixture:w5',
        fixtures: {
          env: {
            resource: 'demo/resource',
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
      const result = yield* withProofKernelContext(
        {
          runId: 'run:test:verification:scenario-expectation-evaluation',
          diagnosticsLevel: 'off',
        },
        ({ session }) => runScenarioCompiledPlan(plan, makeScenarioRunSession({ runId: session.runId })),
      )

      expect(Exit.isSuccess(result.exit)).toBe(true)

      const evaluation = evaluateScenarioFixtureExpectations(fixture, result.evidence)
      expect(evaluation).toEqual({
        kind: 'ScenarioExpectationEvaluation',
        passed: true,
        checks: [
          {
            kind: 'exists',
            target: scenarioCarrierFeedExistsTarget,
            passed: true,
          },
        ],
      })
      expect(result.evidence.summary).toBeUndefined()
    }),
  )
})
