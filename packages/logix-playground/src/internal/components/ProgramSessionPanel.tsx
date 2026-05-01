import React from 'react'
import type { ProgramSessionState } from '../session/programSession.js'

export interface ProgramSessionPanelProps {
  readonly session: ProgramSessionState | undefined
  readonly onReset: () => void
}

export function ProgramSessionPanel({
  session,
  onReset,
}: ProgramSessionPanelProps): React.ReactElement {
  return (
    <section aria-label="Program session" className="rounded-md border border-gray-200 bg-white text-gray-800 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-3 py-2">
        <h2 className="text-xs font-medium">Session</h2>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onReset} className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">
            Reset session
          </button>
        </div>
      </div>
      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
          <span className="truncate">{session?.sessionId ?? 'Program session unavailable'}</span>
          <span className="rounded border border-green-200 bg-green-50 px-2 py-0.5 text-green-700">{session?.status ?? 'unavailable'}</span>
        </div>
        {session?.stale ? (
          <p role="status" className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
            {session.staleReason ?? 'Session stale'}
          </p>
        ) : null}
        {session?.error ? (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
            {session.error.kind}: {session.error.message}
          </p>
        ) : null}
        <pre
          aria-label="Program state"
          className="max-h-48 overflow-auto rounded-md bg-[#fafafa] p-3 font-mono text-xs leading-5 text-gray-800"
        >
          {JSON.stringify(session?.state ?? null, null, 2)}
        </pre>
        {session?.lastOperation?.actionTag ? (
          <p className="font-mono text-xs text-gray-500">
            last: {session.lastOperation.actionTag} / op{session.operationSeq}
          </p>
        ) : null}
      </div>
    </section>
  )
}
