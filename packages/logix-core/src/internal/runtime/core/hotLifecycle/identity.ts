export const makeHotLifecycleEventId = (ownerId: string, eventSeq: number): string =>
  `${ownerId}::hmr:${eventSeq}`

export const makeHotLifecycleCleanupId = (ownerId: string, cleanupSeq: number): string =>
  `${ownerId}::cleanup:${cleanupSeq}`

export const makeRuntimeResourceId = (ownerId: string, category: string, resourceSeq: number): string =>
  `${ownerId}::${category}:${resourceSeq}`
