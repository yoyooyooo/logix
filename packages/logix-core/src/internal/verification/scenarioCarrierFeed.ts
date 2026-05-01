// lifecycle: retained-harness for VOB-01 / PF-08.
// Do not treat this name as final scenario implementation vocabulary without authority writeback.
export const scenarioCarrierEvidenceFeedEventType = 'verification:scenario-carrier-feed' as const

export type ScenarioCarrierRetention = 'live' | 'terminal' | 'subordinate'

export interface ScenarioBundlePatchRefInput {
  readonly bundlePatchPath: string
  readonly domain?: string
}

export type ScenarioCarrierReasonLinkRow = Readonly<{
  readonly kind: 'reason-link'
  readonly reasonSlotId: string
  readonly bundlePatchRef: string
  readonly ownerRef: string
  readonly transition: 'reason-link'
  readonly retention: ScenarioCarrierRetention
  readonly canonicalRowIdChainDigest?: string
}>

export type ScenarioCarrierEvidenceRow = ScenarioCarrierReasonLinkRow

export type ScenarioCarrierEvidenceFeed = Readonly<{
  readonly kind: 'ScenarioCarrierEvidenceFeed'
  readonly rows: ReadonlyArray<ScenarioCarrierEvidenceRow>
}>

export const makeScenarioCarrierReasonLinkRow = (args: {
  readonly reasonSlotId: string
  readonly bundlePatchRef: string
  readonly ownerRef: string
  readonly retention: ScenarioCarrierRetention
  readonly canonicalRowIdChainDigest?: string
}): ScenarioCarrierReasonLinkRow => ({
  kind: 'reason-link',
  reasonSlotId: args.reasonSlotId,
  bundlePatchRef: args.bundlePatchRef,
  ownerRef: args.ownerRef,
  transition: 'reason-link',
  retention: args.retention,
  ...(typeof args.canonicalRowIdChainDigest === 'string'
    ? { canonicalRowIdChainDigest: args.canonicalRowIdChainDigest }
    : {}),
})

export const makeScenarioBundlePatchRef = (input: ScenarioBundlePatchRefInput): string => {
  const bundlePatchPath = input.bundlePatchPath.trim()
  if (bundlePatchPath.length === 0) {
    throw new TypeError('[Logix] bundlePatchPath must be non-empty')
  }

  const domain = input.domain?.trim()
  return domain && domain.length > 0
    ? `bundlePatch:${domain}:${bundlePatchPath}`
    : `bundlePatch:${bundlePatchPath}`
}

export const makeScenarioCarrierEvidenceFeed = (
  rows: ReadonlyArray<ScenarioCarrierEvidenceRow>,
): ScenarioCarrierEvidenceFeed => ({
  kind: 'ScenarioCarrierEvidenceFeed',
  rows: rows.slice(),
})
