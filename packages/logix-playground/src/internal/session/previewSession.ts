import type { ProjectSnapshot } from '../snapshot/projectSnapshot.js'
import type { BoundedLogEntry } from './logs.js'
import type { ClassifiedPlaygroundFailure } from './errors.js'

export type PreviewSessionStatus = 'idle' | 'loading' | 'ready' | 'failed' | 'disposed'

export interface PreviewSession {
  readonly sessionId: string
  readonly projectId: string
  readonly revision: number
  readonly status: PreviewSessionStatus
  readonly adapter: 'sandpack'
  readonly resetCount: number
  readonly viewport: 'responsive'
  readonly theme: 'light'
  readonly strictMode: boolean
  readonly logs: ReadonlyArray<BoundedLogEntry>
  readonly errors: ReadonlyArray<ClassifiedPlaygroundFailure>
}

export interface PreviewSessionOptions {
  readonly resetCount?: number
  readonly status?: PreviewSessionStatus
  readonly strictMode?: boolean
  readonly logs?: ReadonlyArray<BoundedLogEntry>
  readonly errors?: ReadonlyArray<ClassifiedPlaygroundFailure>
}

export const makePreviewSessionId = (
  projectId: string,
  revision: number,
  resetCount: number,
): string => `${projectId}:preview:r${revision}:reset${resetCount}`

export const createPreviewSession = (
  snapshot: ProjectSnapshot,
  options: PreviewSessionOptions = {},
): PreviewSession => {
  const resetCount = options.resetCount ?? 0

  return {
    sessionId: makePreviewSessionId(snapshot.projectId, snapshot.revision, resetCount),
    projectId: snapshot.projectId,
    revision: snapshot.revision,
    status: options.status ?? (snapshot.previewEntry ? 'ready' : 'idle'),
    adapter: 'sandpack',
    resetCount,
    viewport: 'responsive',
    theme: 'light',
    strictMode: options.strictMode ?? true,
    logs: options.logs ?? [],
    errors: options.errors ?? [],
  }
}

export const disposePreviewSession = (session: PreviewSession): PreviewSession => ({
  ...session,
  status: 'disposed',
  logs: [],
  errors: [],
})
