import type { ReadQueryCompiled } from './ReadQuery.js'
import { computeSelectorFingerprint } from './selectorRoute.fingerprint.js'
import { DEFAULT_PATH_AUTHORITY_EPOCH, normalizeSelectorReadPaths } from './selectorRoute.pathAuthority.js'
import type {
  SelectorPrecisionRecord,
  SelectorRouteDecision,
  SelectorRouteFailureCode,
  SelectorRouteInput,
  SelectorPrecisionQuality,
} from './selectorRoute.types.js'

const repairHintFor = (quality: SelectorPrecisionQuality): string => {
  switch (quality) {
    case 'exact':
      return 'Selector is exact.'
    case 'broad-root':
      return 'Use a selector input that names concrete field paths instead of the root state.'
    case 'broad-state':
      return 'Split the broad state read into exact selector inputs for the fields the component renders.'
    case 'dynamic':
      return 'Use an exact selector input with stable declared reads or a statically compilable field selector.'
    case 'debug':
      return 'Debug selector routes require an internal-only resilience marker.'
    case 'unknown':
      return 'Use a selector input with stable reads and supported equality semantics.'
  }
}

const failureCodeFor = (quality: SelectorPrecisionQuality): SelectorRouteFailureCode | undefined => {
  switch (quality) {
    case 'broad-root':
      return 'selector.broad_root'
    case 'broad-state':
      return 'selector.broad_state'
    case 'dynamic':
      return 'selector.dynamic_fallback'
    case 'debug':
      return 'selector.debug_marker'
    case 'unknown':
      return 'selector.unknown'
    case 'exact':
      return undefined
  }
}

export const classifySelectorPrecision = (
  readQuery: ReadQueryCompiled<any, any>,
): SelectorPrecisionRecord => {
  if (readQuery.lane !== 'static' || readQuery.fallbackReason != null) {
    return {
      selectorIdLabel: readQuery.selectorId,
      precisionQuality: 'dynamic',
      fallbackReason: readQuery.fallbackReason,
      repairHint: repairHintFor('dynamic'),
    }
  }

  if (readQuery.reads.length === 0 || readQuery.readsDigest == null) {
    return {
      selectorIdLabel: readQuery.selectorId,
      precisionQuality: 'unknown',
      repairHint: repairHintFor('unknown'),
    }
  }

  if (readQuery.reads.some((read) => read === '')) {
    return {
      selectorIdLabel: readQuery.selectorId,
      precisionQuality: 'broad-root',
      repairHint: repairHintFor('broad-root'),
    }
  }

  const normalizedReads = normalizeSelectorReadPaths(readQuery.reads)
  if (normalizedReads.length !== readQuery.reads.length) {
    return {
      selectorIdLabel: readQuery.selectorId,
      precisionQuality: 'unknown',
      repairHint: repairHintFor('unknown'),
    }
  }

  if (normalizedReads.some((read) => read.length === 0)) {
    return {
      selectorIdLabel: readQuery.selectorId,
      precisionQuality: 'broad-root',
      repairHint: repairHintFor('broad-root'),
    }
  }

  if (normalizedReads.length === 1 && normalizedReads[0]!.length === 1 && normalizedReads[0]![0] === '*') {
    return {
      selectorIdLabel: readQuery.selectorId,
      precisionQuality: 'broad-state',
      repairHint: repairHintFor('broad-state'),
    }
  }

  return {
    selectorIdLabel: readQuery.selectorId,
    precisionQuality: 'exact',
    repairHint: repairHintFor('exact'),
  }
}

export const routeReadQuery = <S, V>(input: SelectorRouteInput<S, V> | ReadQueryCompiled<S, V>): SelectorRouteDecision => {
  const readQuery = 'readQuery' in input ? input.readQuery : input
  const pathAuthorityEpoch = 'readQuery' in input ? input.pathAuthorityEpoch ?? DEFAULT_PATH_AUTHORITY_EPOCH : DEFAULT_PATH_AUTHORITY_EPOCH
  const allowInternalResilience = 'readQuery' in input ? input.allowInternalResilience === true : false
  const precision = classifySelectorPrecision(readQuery)
  const selectorFingerprint = computeSelectorFingerprint(readQuery, pathAuthorityEpoch)
  const failureCode = failureCodeFor(precision.precisionQuality)

  if (precision.precisionQuality === 'exact') {
    return {
      kind: 'exact',
      selectorFingerprint,
      selectorIdLabel: readQuery.selectorId,
      precisionQuality: precision.precisionQuality,
    }
  }

  if (allowInternalResilience && precision.precisionQuality === 'debug') {
    return {
      kind: 'internal-resilience',
      selectorFingerprint,
      selectorIdLabel: readQuery.selectorId,
      precisionQuality: precision.precisionQuality,
      fallbackReason: precision.fallbackReason,
      repairHint: precision.repairHint,
    }
  }

  return {
    kind: 'reject',
    selectorFingerprint,
    selectorIdLabel: readQuery.selectorId,
    precisionQuality: precision.precisionQuality,
    failureCode,
    fallbackReason: precision.fallbackReason,
    repairHint: precision.repairHint,
  }
}
