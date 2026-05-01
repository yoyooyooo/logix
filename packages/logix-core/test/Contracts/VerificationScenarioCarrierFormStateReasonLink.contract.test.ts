import { describe, expect, it } from '@effect/vitest'
import { Effect, Exit } from 'effect'
import { withProofKernelContext } from '../../src/internal/verification/proofKernel.js'
import { scenarioCarrierEvidenceFeedEventType } from '../../src/internal/verification/scenarioCarrierFeed.js'
import { emitScenarioFormStateReasonLinkFixture } from '../internal/verification/fixtures/scenarioCarrierReasonLinkFixture.js'

describe('Verification scenario carrier Form-state reason-link contract', () => {
  it.effect('derives reasonSlotId from Form-shaped state and keeps only bundlePatchRef synthetic', () =>
    Effect.gen(function* () {
      const result = yield* withProofKernelContext(
        {
          runId: 'run:test:verification:scenario-carrier:form-state-reason-link',
          diagnosticsLevel: 'off',
        },
        () =>
          emitScenarioFormStateReasonLinkFixture({
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
            bundlePatchRef: 'bundlePatch:row-2:warehouseId:1',
          }),
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
            bundlePatchRef: 'bundlePatch:row-2:warehouseId:1',
            ownerRef: 'items[row-2].warehouseId',
            transition: 'reason-link',
            retention: 'live',
            canonicalRowIdChainDigest: 'rowChain:items:row-2',
          },
        ],
      })
    }),
  )

  it.effect('rejects missing Form submit reasonSlotId instead of emitting a dangling reason link', () =>
    Effect.gen(function* () {
      const result = yield* withProofKernelContext(
        {
          runId: 'run:test:verification:scenario-carrier:form-state-reason-link-empty-slot',
          diagnosticsLevel: 'off',
        },
        () =>
          emitScenarioFormStateReasonLinkFixture({
            state: {
              $form: {
                submitAttempt: {},
              },
            },
            listPath: 'items',
            rowId: 'row-2',
            fieldPath: 'warehouseId',
            bundlePatchRef: 'bundlePatch:row-2:warehouseId:1',
          }),
      )

      expect(Exit.isFailure(result.exit)).toBe(true)
      expect(result.evidence.events).toEqual([])
      expect(result.evidence.summary).toBeUndefined()
    }),
  )
})
