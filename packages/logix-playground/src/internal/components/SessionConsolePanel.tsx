import React from 'react'
import type { ProgramSessionState } from '../session/programSession.js'

export interface SessionConsolePanelProps {
  readonly session: ProgramSessionState | undefined
}

export function SessionConsolePanel({ session }: SessionConsolePanelProps): React.ReactElement {
  const logs = session?.logs ?? []

  return (
    <div aria-label="Console detail" className="h-full overflow-auto bg-white p-3 font-mono text-xs text-gray-800">
      {session ? (
        <div className="sr-only">
          <span className="rounded border border-gray-200 px-2 py-0.5">{session.sessionId}</span>
          <span className="rounded border border-gray-200 px-2 py-0.5">op{session.operationSeq}</span>
          <span className="rounded border border-green-200 bg-green-50 px-2 py-0.5 text-green-700">{session.status}</span>
        </div>
      ) : null}
      {logs.length ? (
        <div className="space-y-1">
          {logs.map((log, index) => (
            <div key={`${index}:${log.message}`} className="flex hover:bg-gray-50">
              <span className="w-24 shrink-0 select-none text-gray-400">10:21:{String(11 + index).padStart(2, '0')}.234</span>
              <span className="w-12 shrink-0 select-none font-semibold text-green-600">{log.level.toUpperCase()}</span>
              <span>
                [{log.level}] {log.source}
                {log.operationSeq !== undefined ? ` op${log.operationSeq}` : ''}: {log.message}
              </span>
              <span aria-hidden="true" className="select-none whitespace-pre text-transparent">{'\n'}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-500">No logs captured.</div>
      )}
    </div>
  )
}
