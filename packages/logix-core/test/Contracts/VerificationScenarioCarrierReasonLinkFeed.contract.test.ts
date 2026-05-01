import { describe, expect, it } from '@effect/vitest'
import { Effect, Exit } from 'effect'
import { withProofKernelContext } from '../../src/internal/verification/proofKernel.js'
import { scenarioCarrierEvidenceFeedEventType } from '../../src/internal/verification/scenarioCarrierFeed.js'
import { emitScenarioCarrierReasonLinkFixture } from '../internal/verification/fixtures/scenarioCarrierReasonLinkFixture.js'

describe('Verification scenario carrier reason-link feed contract', () => {
  it.effect('emits one reason-link feed through a runtime-owned verification helper', () =>
    Effect.gen(function* () {
      const result = yield* withProofKernelContext(
        {
          runId: 'run:test:verification:scenario-carrier:reason-link-feed',
          diagnosticsLevel: 'off',
        },
        () =>
          emitScenarioCarrierReasonLinkFixture({
            reasonSlotId: 'submit:1',
            bundlePatchRef: 'bundlePatch:row-2:warehouseId:1',
            ownerRef: 'items[row-2].warehouseId',
            retention: 'live',
            canonicalRowIdChainDigest: 'rowChain:items:row-2',
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
})
