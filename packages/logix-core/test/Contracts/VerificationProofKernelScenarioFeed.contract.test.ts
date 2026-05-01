import { describe, expect, it } from '@effect/vitest'
import { Effect, Exit } from 'effect'
import { withProofKernelContext } from '../../src/internal/verification/proofKernel.js'
import {
  makeScenarioCarrierEvidenceFeed,
  makeScenarioCarrierReasonLinkRow,
  scenarioCarrierEvidenceFeedEventType,
} from '../../src/internal/verification/scenarioCarrierFeed.js'

describe('VerificationProofKernel scenario carrier feed contract', () => {
  it.effect('can record one reason-link feed through proof kernel context', () =>
    Effect.gen(function* () {
      const result = yield* withProofKernelContext(
        {
          runId: 'run:test:proof-kernel:scenario-feed',
          diagnosticsLevel: 'off',
        },
        ({ collector }) =>
          Effect.sync(() => {
            collector.recordScenarioCarrierEvidenceFeed(
              makeScenarioCarrierEvidenceFeed([
                makeScenarioCarrierReasonLinkRow({
                  reasonSlotId: 'submit:1',
                  bundlePatchRef: 'bundlePatch:row-2:warehouseId:1',
                  ownerRef: 'items[row-2].warehouseId',
                  retention: 'live',
                  canonicalRowIdChainDigest: 'rowChain:items:row-2',
                }),
              ]),
            )

            return 'ok'
          }),
      )

      expect(Exit.isSuccess(result.exit)).toBe(true)
      const feedEvents = result.evidence.events.filter((event) => event.type === scenarioCarrierEvidenceFeedEventType)
      expect(feedEvents).toHaveLength(1)
    }),
  )
})
