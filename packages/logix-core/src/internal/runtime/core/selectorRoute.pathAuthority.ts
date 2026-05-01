import { fnv1a32, stableStringify } from '../../digest.js'
import { normalizeFieldPath, type FieldPath, type FieldPathIdRegistry } from '../../field-path.js'

export const DEFAULT_PATH_AUTHORITY_EPOCH = 1

export const normalizeSelectorReadPath = (path: string | number): FieldPath | undefined => {
  if (typeof path !== 'string') return undefined
  return normalizeFieldPath(path) ?? undefined
}

export const normalizeSelectorReadPaths = (
  reads: ReadonlyArray<string | number>,
): ReadonlyArray<FieldPath> => {
  const out: Array<FieldPath> = []
  for (const read of reads) {
    const normalized = normalizeSelectorReadPath(read)
    if (normalized) out.push(normalized)
  }
  return out
}

export const computePathAuthorityEpoch = (registry?: FieldPathIdRegistry): number => {
  if (!registry) return DEFAULT_PATH_AUTHORITY_EPOCH
  const paths = registry.fieldPaths.map((path) => path.join('.'))
  const hash = Number.parseInt(fnv1a32(stableStringify(paths)), 16)
  return hash >>> 0
}
