import { describe, expect, it } from '@effect/vitest'
import { Effect, Exit } from 'effect'
import {
  makeScenarioRunSession,
  runScenarioCompiledPlan,
} from '../../src/internal/verification/scenarioCompiledPlanCarrier.js'
import { scenarioCarrierEvidenceFeedEventType } from '../../src/internal/verification/scenarioCarrierFeed.js'
import { compileScenarioFixtureToPlan, type ScenarioFixture } from '../internal/verification/fixtures/scenarioCompiledPlanFixtureAdapter.js'
import { withProofKernelContext } from '../../src/internal/verification/proofKernel.js'

describe('Verification scenario compiled-plan adapter contract', () => {
  it.effect('maps one structured scenario fixture into a compiled plan that emits a reason-link feed', () =>
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
            target: 'evidence.events[verification:scenario-carrier-feed]',
          },
        ],
      }

      const plan = compileScenarioFixtureToPlan(fixture)
      expect(plan.planId).toBe('fixture:w5')
      expect(plan.steps.map((step) => step.stepId)).toEqual(['step:reason-link'])

      const result = yield* withProofKernelContext(
        {
          runId: 'run:test:verification:scenario-compiled-plan-adapter',
          diagnosticsLevel: 'off',
        },
        ({ session }) => runScenarioCompiledPlan(plan, makeScenarioRunSession({ runId: session.runId })),
      )

      expect(Exit.isSuccess(result.exit)).toBe(true)

      const feedEvents = result.evidence.events.filter((event) => event.type === scenarioCarrierEvidenceFeedEventType)
      expect(feedEvents).toHaveLength(1)
      expect(feedEvents[0]?.payload).toEqual({
        kind: 'ScenarioCarrierEvidenceFeed',
        rows: [
          {
            kind: 'reason-link',
            reasonSlotId: 'submit:1',
            bundlePatchRef: 'bundlePatch:items.warehouseId',
            ownerRef: 'items[row-2].warehouseId',
            transition: 'reason-link',
            retention: 'live',
            canonicalRowIdChainDigest: 'rowChain:items:row-2',
          },
        ],
      })
      expect(result.evidence.summary).toBeUndefined()
    }),
  )
})
