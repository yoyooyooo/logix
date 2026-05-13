// lifecycle: demoted-test-fixture for VOB-01 / PF-08.
// covers: PF-08, VOB-01. This fixture helper must stay outside production internals.
import { Effect } from 'effect'
import { EvidenceCollectorTag } from '../../../../src/internal/verification/evidenceCollector.js'
import {
  type ScenarioCarrierRetention,
  makeScenarioBundlePatchRef,
  makeScenarioCarrierEvidenceFeed,
  makeScenarioCarrierReasonLinkRow,
} from '../../../../src/internal/verification/scenarioCarrierFeed.js'

export interface ScenarioCarrierReasonLinkFixtureInput {
  readonly reasonSlotId: string
  readonly bundlePatchRef: string
  readonly ownerRef: string
  readonly retention: ScenarioCarrierRetention
  readonly canonicalRowIdChainDigest?: string
}

export interface ScenarioRowScopedReasonLinkFixtureInput {
  readonly reasonSlotId: string
  readonly listPath: string
  readonly rowId: string
  readonly fieldPath: string
  readonly bundlePatchRef: string
}

export interface ScenarioFormStateReasonLinkFixtureInput {
  readonly state: {
    readonly $form?: {
      readonly submitAttempt?: {
        readonly reasonSlotId?: string
      }
    }
  }
  readonly listPath: string
  readonly rowId: string
  readonly fieldPath: string
  readonly bundlePatchRef: string
}

export interface ScenarioFormEvidenceSourceSeed {
  readonly fieldPath: string
  readonly bundlePatchPath: string
  readonly sourceReceiptRef?: string
  readonly sourceRef?: string
  readonly sourceSnapshotPath?: string
  readonly keyHashRef?: string
  readonly reasonSourceRef?: string
}

export interface ScenarioFormArtifactReasonLinkFixtureInput {
  readonly state: {
    readonly $form?: {
      readonly submitAttempt?: {
        readonly reasonSlotId?: string
      }
    }
  }
  readonly listPath: string
  readonly rowId: string
  readonly fieldPath: string
  readonly formEvidenceContract: {
    readonly sources?: ReadonlyArray<ScenarioFormEvidenceSourceSeed>
  }
}

export interface ScenarioFormSubmitLinkFixtureInput extends ScenarioFormArtifactReasonLinkFixtureInput {
  readonly evidenceFieldPath?: string
}

export interface ScenarioFormSubmitLinkFixtureTarget {
  readonly listPath: string
  readonly rowId: string
  readonly fieldPath: string
  readonly evidenceFieldPath?: string
}

export interface ScenarioFormMultiSubmitLinkFixtureInput {
  readonly state: ScenarioFormSubmitLinkFixtureInput['state']
  readonly formEvidenceContract: ScenarioFormSubmitLinkFixtureInput['formEvidenceContract']
  readonly targets: ReadonlyArray<ScenarioFormSubmitLinkFixtureTarget>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const getAtPath = (value: unknown, path: string): unknown => {
  let current = value
  for (const segment of path.split('.').filter(Boolean)) {
    if (Array.isArray(current)) {
      const index = Number(segment)
      if (!Number.isInteger(index) || index < 0) return undefined
      current = current[index]
      continue
    }
    if (!isRecord(current)) return undefined
    current = current[segment]
  }
  return current
}

const resolveBundlePatchPath = (
  input: Pick<ScenarioFormArtifactReasonLinkFixtureInput, 'listPath' | 'fieldPath' | 'formEvidenceContract'> & {
    readonly evidenceFieldPath?: string
  },
): string => {
  const evidenceFieldPath = input.evidenceFieldPath ?? input.fieldPath
  const canonicalFieldPath = `${input.listPath}.${evidenceFieldPath}`
  const patternFieldPath = `${input.listPath}[].${evidenceFieldPath}`
  return (
    input.formEvidenceContract.sources?.find(
      (entry) => entry.fieldPath === canonicalFieldPath || entry.fieldPath === patternFieldPath,
    )?.bundlePatchPath ?? canonicalFieldPath
  )
}

const hasRowScopedRuleOutcome = (
  input: Pick<ScenarioFormArtifactReasonLinkFixtureInput, 'state' | 'listPath' | 'rowId' | 'fieldPath'>,
): boolean => {
  const rows = getAtPath(input.state, input.listPath)
  if (!Array.isArray(rows)) return false

  const rowIndex = rows.findIndex((row) => isRecord(row) && row.id === input.rowId)
  if (rowIndex < 0) return false

  return getAtPath(input.state, `errors.${input.listPath}.rows.${rowIndex}.${input.fieldPath}`) !== undefined
}

const assertNonEmptyReasonSlotId = (reasonSlotId: string): string => {
  if (reasonSlotId.trim().length === 0) {
    throw new TypeError('[Logix] scenario reason-link fixture requires a non-empty reasonSlotId')
  }
  return reasonSlotId
}

export const emitScenarioCarrierReasonLinkFixture = (
  input: ScenarioCarrierReasonLinkFixtureInput,
) =>
  Effect.gen(function* () {
    const reasonSlotId = assertNonEmptyReasonSlotId(input.reasonSlotId)
    const collector = yield* Effect.service(EvidenceCollectorTag).pipe(Effect.orDie)
    collector.recordScenarioCarrierEvidenceFeed(
      makeScenarioCarrierEvidenceFeed([
        makeScenarioCarrierReasonLinkRow({
          reasonSlotId,
          bundlePatchRef: input.bundlePatchRef,
          ownerRef: input.ownerRef,
          retention: input.retention,
          canonicalRowIdChainDigest: input.canonicalRowIdChainDigest,
        }),
      ]),
    )
  })

export const emitScenarioRowScopedReasonLinkFixture = (
  input: ScenarioRowScopedReasonLinkFixtureInput,
) =>
  emitScenarioCarrierReasonLinkFixture({
    reasonSlotId: input.reasonSlotId,
    bundlePatchRef: input.bundlePatchRef,
    ownerRef: `${input.listPath}[${input.rowId}].${input.fieldPath}`,
    retention: 'live',
    canonicalRowIdChainDigest: `rowChain:${input.listPath}:${input.rowId}`,
  })

export const emitScenarioFormStateReasonLinkFixture = (
  input: ScenarioFormStateReasonLinkFixtureInput,
) =>
  emitScenarioRowScopedReasonLinkFixture({
    reasonSlotId: String(input.state?.$form?.submitAttempt?.reasonSlotId ?? ''),
    listPath: input.listPath,
    rowId: input.rowId,
    fieldPath: input.fieldPath,
    bundlePatchRef: input.bundlePatchRef,
  })

export const emitScenarioFormArtifactReasonLinkFixture = (
  input: ScenarioFormArtifactReasonLinkFixtureInput,
) => {
  const bundlePatchPath = resolveBundlePatchPath(input)

  return emitScenarioFormStateReasonLinkFixture({
    state: input.state,
    listPath: input.listPath,
    rowId: input.rowId,
    fieldPath: input.fieldPath,
    bundlePatchRef: makeScenarioBundlePatchRef({ bundlePatchPath }),
  })
}

export const emitScenarioFormSubmitLinkFixture = (
  input: ScenarioFormSubmitLinkFixtureInput,
) => {
  if (!hasRowScopedRuleOutcome(input)) {
    throw new TypeError('[Logix] row-scoped rule outcome is required for submit link fixture')
  }

  const bundlePatchPath = resolveBundlePatchPath(input)
  return emitScenarioFormStateReasonLinkFixture({
    state: input.state,
    listPath: input.listPath,
    rowId: input.rowId,
    fieldPath: input.fieldPath,
    bundlePatchRef: makeScenarioBundlePatchRef({ bundlePatchPath }),
  })
}

export const emitScenarioFormMultiSubmitLinkFixture = (
  input: ScenarioFormMultiSubmitLinkFixtureInput,
) =>
  Effect.gen(function* () {
    const reasonSlotId = assertNonEmptyReasonSlotId(String(input.state?.$form?.submitAttempt?.reasonSlotId ?? ''))
    const collector = yield* Effect.service(EvidenceCollectorTag).pipe(Effect.orDie)
    const rows = input.targets.map((target) => {
      const targetInput = {
        state: input.state,
        formEvidenceContract: input.formEvidenceContract,
        listPath: target.listPath,
        rowId: target.rowId,
        fieldPath: target.fieldPath,
        evidenceFieldPath: target.evidenceFieldPath,
      }
      if (!hasRowScopedRuleOutcome(targetInput)) {
        throw new TypeError('[Logix] row-scoped rule outcome is required for submit link fixture')
      }
      const bundlePatchPath = resolveBundlePatchPath(targetInput)
      return makeScenarioCarrierReasonLinkRow({
        reasonSlotId,
        bundlePatchRef: makeScenarioBundlePatchRef({ bundlePatchPath }),
        ownerRef: `${target.listPath}[${target.rowId}].${target.fieldPath}`,
        retention: 'live',
        canonicalRowIdChainDigest: `rowChain:${target.listPath}:${target.rowId}`,
      })
    })
    collector.recordScenarioCarrierEvidenceFeed(makeScenarioCarrierEvidenceFeed(rows))
  })
