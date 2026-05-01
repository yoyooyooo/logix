import React from 'react'
import { useDevtoolsState, useDevtoolsDispatch } from '../hooks/DevtoolsHooks.js'
import type { WorkbenchScope, WorkbenchSession } from '../../state/workbench/index.js'

export const Sidebar: React.FC = () => {
  const state = useDevtoolsState()
  const dispatch = useDevtoolsDispatch()
  const { workbench, selectedScopeId, selectedSessionId } = state

  const sessions: ReadonlyArray<WorkbenchSession> = selectedScopeId
    ? workbench.sessions.filter((session: WorkbenchSession) => session.scopeId === selectedScopeId)
    : workbench.sessions

  return (
    <div
      className="w-72 h-full min-h-0 flex flex-col border-r backdrop-blur-sm"
      style={{
        backgroundColor: 'var(--dt-bg-surface)',
        borderColor: 'var(--dt-border)',
      }}
      aria-label="WorkbenchSessionNavigator"
    >
      <div className="shrink-0 border-b" style={{ borderColor: 'var(--dt-border)' }}>
        <div
          className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--dt-text-muted)' }}
        >
          Scopes
        </div>
        <div className="flex flex-col px-2 pb-2 gap-1">
          {workbench.scopes.length === 0 ? (
            <div className="px-2 py-1 text-xs italic" style={{ color: 'var(--dt-text-dim)' }}>
              No active scopes
            </div>
          ) : (
            workbench.scopes.map((scope: WorkbenchScope) => {
              const active = scope.id === selectedScopeId
              return (
                <button
                  key={scope.id}
                  type="button"
                  onClick={() => dispatch({ _tag: 'selectScope', payload: scope.id })}
                  className="flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-medium transition-all border"
                  style={{
                    backgroundColor: active ? 'var(--dt-primary-bg)' : 'transparent',
                    color: active ? 'var(--dt-primary)' : 'var(--dt-text-secondary)',
                    borderColor: active ? 'var(--dt-primary-border)' : 'transparent',
                  }}
                >
                  <span className="truncate font-mono" title={scope.runtimeLabel}>
                    {scope.runtimeLabel}
                  </span>
                  <span className="text-[9px]" style={{ color: 'var(--dt-text-muted)' }}>
                    {scope.modules.length}
                  </span>
                </button>
              )
            })
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <div
          className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider flex justify-between items-center"
          style={{ color: 'var(--dt-text-muted)' }}
        >
          <span>Sessions</span>
          <span
            className="px-1.5 rounded text-[9px]"
            style={{ backgroundColor: 'var(--dt-bg-element)', color: 'var(--dt-text-secondary)' }}
          >
            {sessions.length}
          </span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-3 space-y-1 overscroll-contain scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {sessions.length === 0 ? (
            <div className="px-2 py-8 text-center text-xs" style={{ color: 'var(--dt-text-dim)' }}>
              No sessions
            </div>
          ) : (
            sessions.map((session: WorkbenchSession) => {
              const active = session.id === selectedSessionId
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => dispatch({ _tag: 'selectSession', payload: session.id })}
                  className="w-full text-left rounded-md border px-2 py-2"
                  style={{
                    backgroundColor: active ? 'var(--dt-info-bg)' : 'var(--dt-bg-root)',
                    color: active ? 'var(--dt-info)' : 'var(--dt-text-secondary)',
                    borderColor: active ? 'var(--dt-info-border)' : 'var(--dt-border)',
                  }}
                >
                  <div className="font-mono text-[10px] truncate" title={session.id}>
                    {session.coordinate.moduleId}
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[9px]">
                    <span className="truncate">{session.coordinate.instanceId}</span>
                    <span>
                      txn {session.coordinate.txnSeqRange?.start ?? 'n/a'} · {session.metrics.eventCount} events
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
