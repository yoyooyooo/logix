import { describe, expect, it } from '@effect/vitest'
import { makeEvidenceCollector } from '../../../src/internal/verification/evidenceCollector.js'
import { makeRunSession } from '../../../src/internal/verification/runSession.js'
import {
  makeScenarioCarrierEvidenceFeed,
  makeScenarioCarrierReasonLinkRow,
  scenarioCarrierEvidenceFeedEventType,
} from '../../../src/internal/verification/scenarioCarrierFeed.js'

describe('ScenarioCarrierEvidenceFeed', () => {
  it('exports one reason-link row through EvidenceCollector without creating summary truth', () => {
    const session = makeRunSession({
      runId: 'run:test:scenario-carrier-feed',
      source: { host: 'vitest', label: 'ScenarioCarrierEvidenceFeed.contract' },
    })
    const collector = makeEvidenceCollector(session)

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

    const evidence = collector.exportEvidencePackage()
    const feedEvents = evidence.events.filter((event) => event.type === scenarioCarrierEvidenceFeedEventType)

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
    expect(evidence.summary).toBeUndefined()
  })
})
