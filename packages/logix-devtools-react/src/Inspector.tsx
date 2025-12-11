import React from 'react'
import * as Logix from '@logix/core'
import { useDevtoolsState, useDevtoolsDispatch } from './DevtoolsHooks.js'
import { StateTraitGraphView } from './StateTraitGraphView.js'

export interface InspectorProps {
  readonly getProgramForModule?: (
    moduleId: string,
  ) => Logix.StateTrait.StateTraitProgram<any> | undefined
}

export const Inspector: React.FC<InspectorProps> = ({ getProgramForModule }) => {
  const state = useDevtoolsState()
  const dispatch = useDevtoolsDispatch()

  const { selectedRuntime, selectedModule, selectedInstance, activeState, selectedEventIndex, timeline } = state

  const hasSelectedEvent =
    selectedEventIndex !== undefined &&
    selectedEventIndex >= 0 &&
    selectedEventIndex < timeline.length

  const selectedEvent = hasSelectedEvent
    ? timeline[selectedEventIndex]?.event
    : undefined

  // 当没有显式选中的事件时，默认使用时间线中最近一条事件作为详情视图的数据源，
  // 以便右侧面板在“未选中”状态下仍然展示最新事件的信息。
  const latestEvent =
    !hasSelectedEvent && timeline.length > 0
      ? timeline[timeline.length - 1]?.event
      : undefined

  const detailEvent = selectedEvent ?? latestEvent
  const detailEventLabel = selectedEvent ? 'Selected Event' : 'Latest Event'

  const selectedFieldPath = state.selectedFieldPath

  const program =
    getProgramForModule && selectedModule ? getProgramForModule(selectedModule) : undefined

  const handleSelectFieldPath = React.useCallback(
    (fieldPath: string) => {
      dispatch({ _tag: 'selectFieldPath', payload: fieldPath })
    },
    [dispatch],
  )

  if (!selectedRuntime || !selectedModule) {
    return (
      <div
        className="w-[400px] h-full border-l flex items-center justify-center text-xs"
        style={{
          backgroundColor: 'var(--dt-bg-surface)',
          borderColor: 'var(--dt-border)',
          color: 'var(--dt-text-secondary)',
        }}
      >
        Select a module to view state
      </div>
    )
  }

  return (
    <div
      className="w-[400px] h-full min-h-0 border-l backdrop-blur-sm"
      style={{
        backgroundColor: 'var(--dt-bg-surface)',
        borderColor: 'var(--dt-border)',
      }}
    >
      <div className="h-full overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        <div
          className="px-4 py-3 border-b sticky top-0 backdrop-blur-sm z-10"
          style={{
            backgroundColor: 'var(--dt-bg-header)',
            borderColor: 'var(--dt-border)',
          }}
        >
          <div
            className="text-[10px] font-bold uppercase tracking-wider mb-2"
            style={{ color: 'var(--dt-text-muted)' }}
          >
            Inspector
          </div>
          <div className="font-mono text-xs break-all leading-relaxed" style={{ color: 'var(--dt-text-primary)' }}>
            <span style={{ color: 'var(--dt-text-muted)' }}>{selectedRuntime}</span>
            <span className="mx-1" style={{ color: 'var(--dt-text-dim)' }}>
              /
            </span>
            <span style={{ color: 'var(--dt-primary)' }}>{selectedModule}</span>
          </div>
        </div>

        <div
          className="border-b"
          style={{ borderColor: 'var(--dt-border)', backgroundColor: 'var(--dt-bg-root)' }}
        >
          <div
            className="px-4 py-2 border-b flex justify-between items-center"
            style={{
              backgroundColor: 'var(--dt-bg-header)',
              borderColor: 'var(--dt-border)',
            }}
          >
            <span className="text-[10px] font-mono" style={{ color: 'var(--dt-text-secondary)' }}>
              Traits / StateTraitGraph
            </span>
            <span className="text-[9px]" style={{ color: 'var(--dt-text-muted)' }}>
              {program ? '点击字段节点以过滤时间线' : '当前模块未提供 StateTraitProgram'}
            </span>
          </div>
          <StateTraitGraphView
            program={program}
            selectedFieldPath={selectedFieldPath}
            onSelectNode={handleSelectFieldPath}
          />
        </div>

        {detailEvent && (
          <div className="border-b" style={{ borderColor: 'var(--dt-border)', backgroundColor: 'var(--dt-bg-root)' }}>
            <div
              className="px-4 py-2 border-b flex justify-between items-center"
              style={{
                backgroundColor: 'var(--dt-bg-header)',
                borderColor: 'var(--dt-border)',
              }}
            >
              <span className="text-[10px] font-mono" style={{ color: 'var(--dt-action)' }}>
                {detailEventLabel}
              </span>
              <span className="text-[9px] font-mono" style={{ color: 'var(--dt-text-muted)' }}>
                {detailEvent.type}
              </span>
            </div>
            <div className="p-4">
              {'action' in detailEvent ? (
                <div className="space-y-1">
                  <div className="text-[9px] uppercase" style={{ color: 'var(--dt-text-muted)' }}>
                    Action Payload
                  </div>
                  <pre
                    className="text-[10px] font-mono whitespace-pre-wrap break-all"
                    style={{ color: 'var(--dt-action-dim)' }}
                  >
                    {JSON.stringify((detailEvent as any).action, null, 2)}
                  </pre>
                </div>
              ) : (
                <pre
                  className="text-[10px] font-mono whitespace-pre-wrap break-all"
                  style={{ color: 'var(--dt-text-primary)' }}
                >
                  {JSON.stringify(detailEvent, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}

        <div className="border-t" style={{ borderColor: 'var(--dt-border)' }}>
          <div
            className="px-4 py-2 border-b flex justify-between items-center"
            style={{
              backgroundColor: 'var(--dt-bg-header)',
              borderColor: 'var(--dt-border)',
            }}
          >
            <span className="text-[10px] font-mono" style={{ color: 'var(--dt-text-secondary)' }}>
              {selectedEvent ? 'State After Event' : 'Current State'}
            </span>
            <span className="text-[9px]" style={{ color: 'var(--dt-text-muted)' }}>
              JSON
            </span>
          </div>
          <div className="p-4">
            {activeState === undefined ? (
              <span className="text-xs italic" style={{ color: 'var(--dt-text-muted)' }}>
                No state snapshot available.
              </span>
            ) : (
              <pre
                className="text-[10px] font-mono leading-relaxed whitespace-pre-wrap break-all"
                style={{ color: 'var(--dt-info)' }}
              >
                {JSON.stringify(activeState, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
