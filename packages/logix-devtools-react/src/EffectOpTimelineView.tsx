import React from 'react'
import { useDevtoolsState, useDevtoolsDispatch } from './DevtoolsHooks.js'

/**
 * EffectOpTimelineView：
 * - 基于 DevtoolsState.timeline 渲染 EffectOp / Debug 事件时间线；
 * - 视图本身不直接耦合 DebugSink 实现，只消费派生状态。
 */
export const EffectOpTimelineView: React.FC = () => {
  const state = useDevtoolsState()
  const dispatch = useDevtoolsDispatch()

  const { timeline: events, selectedEventIndex } = state

  const ordered = React.useMemo(
    () => events.map((entry, index) => ({ entry, index })).reverse(),
    [events],
  )

  const handleSelectEvent = (index: number) => {
    dispatch({ _tag: 'selectEventIndex', payload: index })
  }

  const handleClear = () => {
    dispatch({ _tag: 'clearEvents', payload: undefined })
  }

  return (
    <div
      className="flex-1 flex flex-col h-full min-h-0 overflow-hidden"
      style={{ backgroundColor: 'var(--dt-bg-surface)' }}
    >
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{
          backgroundColor: 'var(--dt-bg-header)',
          borderColor: 'var(--dt-border)',
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: 'var(--dt-text-muted)' }}
          >
            Timeline
          </span>
          <span
            className="text-[9px] px-1.5 py-0.5 rounded border"
            style={{
              backgroundColor: 'var(--dt-bg-element)',
              color: 'var(--dt-text-secondary)',
              borderColor: 'var(--dt-border)',
            }}
          >
            {events.length} Events
          </span>
        </div>
        <button
          onClick={handleClear}
          className="text-[10px] px-2 py-1 rounded border transition-colors"
          style={{
            backgroundColor: 'var(--dt-bg-element)',
            color: 'var(--dt-text-secondary)',
            borderColor: 'var(--dt-border)',
          }}
        >
          Clear
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain sm:scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {ordered.length === 0 ? (
          <div
            className="h-full flex flex-col items-center justify-center gap-2"
            style={{ color: 'var(--dt-text-muted)' }}
          >
            <div
              className="w-8 h-8 rounded-full border border-dashed flex items-center justify-center"
              style={{ borderColor: 'var(--dt-border-light)' }}
            >
              <span
                className="block w-2 h-2 rounded-full"
                style={{ backgroundColor: 'var(--dt-text-dim)' }}
              ></span>
            </div>
            <span className="text-xs">Waiting for events...</span>
          </div>
        ) : (
          <div className="flex flex-col min-h-full">
            {ordered.map(({ entry, index: actualIndex }) => {
              const { event } = entry
              const selected = actualIndex === selectedEventIndex

              const isStateUpdate = event.type === 'state:update'
              const isAction = event.type === 'action:dispatch'

              return (
                <button
                  key={actualIndex}
                  onClick={() => handleSelectEvent(actualIndex)}
                  className="group relative w-full text-left flex items-start gap-3 px-4 py-1.5 border-b transition-colors focus:outline-none"
                  style={{
                    backgroundColor: selected
                      ? 'var(--dt-info-bg)'
                      : 'transparent',
                    borderColor: 'var(--dt-border)',
                  }}
                >
                  {selected && (
                    <div
                      className="absolute left-0 top-0 bottom-0 w-0.5 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                      style={{ backgroundColor: 'var(--dt-info)' }}
                    />
                  )}

                  <div className="flex-1 min-w-0 py-0.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="text-[11px] font-mono font-medium"
                        style={{
                          color: isStateUpdate
                            ? 'var(--dt-state-dim)'
                            : isAction
                              ? 'var(--dt-action-dim)'
                              : 'var(--dt-text-primary)',
                        }}
                      >
                        {event.type}
                      </span>
                      {isAction && (
                        <span
                          className="px-1.5 py-0.5 text-[9px] rounded-full border font-mono max-w-[140px] truncate"
                          style={{
                            backgroundColor: 'var(--dt-action-bg)',
                            color: 'var(--dt-action-dim)',
                            borderColor: 'var(--dt-action-dim)',
                          }}
                        >
                          {(event as any).action?._tag ||
                            (event as any).action?.type ||
                            'Unknown Action'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {'moduleId' in event && (
                        <span
                          className="px-1.5 py-0.5 text-[9px] rounded-full border font-mono max-w-[140px] truncate text-right"
                          style={{
                            backgroundColor: 'var(--dt-bg-element)',
                            color: 'var(--dt-text-secondary)',
                            borderColor: 'var(--dt-border)',
                          }}
                        >
                          {(event as any).moduleId}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

