export type DirtyPrecisionQuality =
  | 'exact'
  | 'dirty-all'
  | 'missing-path-authority'
  | 'missing-dirty-path'
  | 'unsafe-coarse-root'
  | 'evaluate-all'

export interface DirtyPrecisionRecord {
  readonly quality: DirtyPrecisionQuality
  readonly fallbackKind?: string
  readonly reason?: string
  readonly repairHint?: string
}

export const classifyDirtyPrecision = (args: {
  readonly dirtyAll: boolean
  readonly dirtyAllReason?: string
  readonly hasPathAuthority: boolean
  readonly missingDirtyPath?: boolean
  readonly unsafeCoarseRoot?: boolean
  readonly evaluateAll?: boolean
}): DirtyPrecisionRecord => {
  if (args.dirtyAll) {
    return {
      quality: 'dirty-all',
      fallbackKind: args.dirtyAllReason,
      reason: 'Dirty evidence covers the whole state.',
      repairHint: 'Record exact dirty paths for writes that affect host selector projection.',
    }
  }
  if (!args.hasPathAuthority) {
    return {
      quality: 'missing-path-authority',
      reason: 'Dirty/read overlap cannot resolve path ids.',
      repairHint: 'Ensure field path authority is available before selector overlap routing.',
    }
  }
  if (args.missingDirtyPath) {
    return {
      quality: 'missing-dirty-path',
      reason: 'A dirty path id could not be resolved.',
      repairHint: 'Record writes through the shared field path registry.',
    }
  }
  if (args.unsafeCoarseRoot) {
    return {
      quality: 'unsafe-coarse-root',
      reason: 'Root-level dirty evidence is too coarse for precise selector overlap.',
      repairHint: 'Record nested dirty paths or split the write.',
    }
  }
  if (args.evaluateAll) {
    return {
      quality: 'evaluate-all',
      reason: 'Selector routing would evaluate all subscribed selectors.',
      repairHint: 'Replace fallback evidence with exact read and dirty paths.',
    }
  }
  return {
    quality: 'exact',
  }
}
