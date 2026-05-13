import { fnv1a32, stableStringify } from '../../digest.js'
import type { ReadQueryCompiled } from './ReadQuery.js'
import type { SelectorFingerprint } from './selectorRoute.types.js'
import { DEFAULT_PATH_AUTHORITY_EPOCH } from './selectorRoute.pathAuthority.js'

const toHashNumber = (value: string): number => Number.parseInt(value, 16) >>> 0

export const computeSelectorFingerprint = (
  readQuery: ReadQueryCompiled<any, any>,
  pathAuthorityEpoch: number = DEFAULT_PATH_AUTHORITY_EPOCH,
): SelectorFingerprint => {
  const source = {
    selectorId: readQuery.selectorId,
    lane: readQuery.lane,
    producer: readQuery.producer,
    reads: readQuery.reads,
    readsDigest: readQuery.readsDigest,
    equalsKind: readQuery.equalsKind,
    fallbackReason: readQuery.fallbackReason,
    pathAuthorityEpoch,
  }
  const hash = fnv1a32(stableStringify(source))
  return {
    value: `sf_${hash}`,
    readsDigest: readQuery.readsDigest ? toHashNumber(String(readQuery.readsDigest.hash.toString(16))) : undefined,
    pathAuthorityEpoch,
  }
}
