import { describe, expect, it } from '@effect/vitest'
import { Effect, Exit } from 'effect'
import {
  makeScenarioRunSession,
  runScenarioCompiledPlan,
  type ScenarioCompiledPlan,
} from '../../src/internal/verification/scenarioCompiledPlanCarrier.js'
import { scenarioCarrierEvidenceFeedEventType } from '../../src/internal/verification/scenarioCarrierFeed.js'
import { emitScenarioFormArtifactReasonLinkFixture } from '../internal/verification/fixtures/scenarioCarrierReasonLinkFixture.js'
import { withProofKernelContext } from '../../src/internal/verification/proofKernel.js'

describe('VerificationProofKernel scenario compiled-plan carrier contract', () => {
  it.effect('runs one compiled step that emits a reason-link feed through proof-kernel services', () =>
    Effect.gen(function* () {
      const result = yield* withProofKernelContext(
        {
          runId: 'run:test:proof-kernel:scenario-compiled-plan-carrier',
          diagnosticsLevel: 'off',
        },
        ({ session }) => {
          const plan: ScenarioCompiledPlan = {
            planId: 'scenario:w5',
            steps: [
              {
                stepId: 'step:reason-link',
                run: (scenarioSession) => {
                  expect(scenarioSession.runId).toBe(session.runId)
                  return emitScenarioFormArtifactReasonLinkFixture({
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
                  })
                },
              },
            ],
          }

          return runScenarioCompiledPlan(plan, makeScenarioRunSession({ runId: session.runId }))
        },
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
