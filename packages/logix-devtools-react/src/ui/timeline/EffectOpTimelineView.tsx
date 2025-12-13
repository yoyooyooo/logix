import React from 'react'
import * as Logix from '@logix/core'
import { useDevtoolsState, useDevtoolsDispatch } from '../../DevtoolsHooks.js'

type TimelineEventKind = Logix.Debug.RuntimeDebugEventRef['kind']

const classifyEventKind = (event: unknown): TimelineEventKind | undefined => {
  const ref = Logix.Debug.internal.toRuntimeDebugEventRef(
    event as Logix.Debug.Event,
  )
  return ref?.kind
}

type KindFilter =
  | 'all'
  | 'action'
  | 'trait'
  | 'state'
  | 'service'
  | 'view'
  | 'devtools'

const kindMatchesFilter = (
  filter: KindFilter,
  kind: TimelineEventKind | undefined,
): boolean => {
  if (filter === 'all' || !kind) return true
  switch (filter) {
    case 'action':
      return kind === 'action'
    case 'state':
      return kind === 'state'
    case 'trait':
      return (
        kind === 'trait-computed' ||
        kind === 'trait-link' ||
        kind === 'trait-source'
      )
    case 'service':
      return kind === 'service'
    case 'view':
      return kind === 'react-render'
    case 'devtools':
      return kind === 'devtools'
    default:
      return true
  }
}

const kindLabel = (kind: KindFilter): string => {
  switch (kind) {
    case 'all':
      return 'All'
    case 'action':
      return 'Action'
    case 'trait':
      return 'Trait'
    case 'state':
      return 'State'
    case 'service':
      return 'Service'
    case 'view':
      return 'View'
    case 'devtools':
      return 'Devtools'
  }
}

/**
 * EffectOpTimelineView：
 * - 基于 DevtoolsState.timeline 渲染 EffectOp / Debug 事件时间线；
 * - 视图本身不直接耦合 DebugSink 实现，只消费派生状态。
 */
export const EffectOpTimelineView: React.FC = () => {
  const state = useDevtoolsState()
  const dispatch = useDevtoolsDispatch()

  const { timeline: events, selectedEventIndex, settings, timelineRange } = state
  const showTraitEvents = settings?.showTraitEvents ?? true
  const showReactRenderEvents = settings?.showReactRenderEvents ?? true
  const [kindFilter, setKindFilter] = React.useState<KindFilter>('all')

  const prevLengthRef = React.useRef(events.length)
  const prevLength = prevLengthRef.current
  React.useEffect(() => {
    prevLengthRef.current = events.length
  }, [events.length])

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
          <div className="flex items-center gap-1 ml-2">
            {((
              kinds: KindFilter[],
            ) => kinds)(
              ['all', 'action', 'trait', 'state', 'service', 'view', 'devtools'],
            ).map((kind) => {
              const isActive = kindFilter === kind
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setKindFilter(kind)}
                  className="px-1.5 py-0.5 rounded-full text-[9px] border transition-colors"
                  style={{
                    backgroundColor: isActive
                      ? 'var(--dt-bg-active)'
                      : 'var(--dt-bg-root)',
                    color: isActive
                      ? 'var(--dt-text-primary)'
                      : 'var(--dt-text-muted)',
                    borderColor: isActive
                      ? 'var(--dt-border)'
                      : 'var(--dt-border-light)',
                  }}
                >
                  {kindLabel(kind)}
                </button>
              )
            })}
          </div>
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
            {ordered.map(({ entry, index: actualIndex }, orderedIndex) => {
              const { event } = entry
              if (
                timelineRange &&
                (actualIndex < timelineRange.start || actualIndex > timelineRange.end)
              ) {
                return null
              }
              const ref = Logix.Debug.internal.toRuntimeDebugEventRef(
                event as Logix.Debug.Event,
              )
              const kind = ref?.kind

              const isTraitKind =
                kind === 'trait-computed' ||
                kind === 'trait-link' ||
                kind === 'trait-source'
              const isReactRenderKind = kind === 'react-render'

              // 基于全局设置隐藏 Trait 级事件或 React 渲染事件，
              // 再叠加局部 kind 过滤。
              if (!showTraitEvents && isTraitKind) {
                return null
              }
              if (!showReactRenderEvents && isReactRenderKind) {
                return null
              }

              if (!kindMatchesFilter(kindFilter, kind)) {
                return null
              }

              const selected = actualIndex === selectedEventIndex
              const isNew = actualIndex >= prevLength
              const enterDelayMs = isNew ? Math.min(4, orderedIndex) * 20 : 0

              const isAction = kind === 'action'
              const isStateUpdate = kind === 'state'
              const isTrait = isTraitKind
              const isReactRender = isReactRenderKind
              const isDevtools = kind === 'devtools'

              const primaryLabel =
                typeof (event as any).type === 'string' &&
                ((event as any).type === 'trace:effectop' ||
                  (event as any).type === 'trace:react-render')
                  ? ref?.label ?? (event as any).type
                  : typeof (event as any).type === 'string'
                    ? (event as any).type
                    : String((event as any).type)

              return (
                <button
                  key={actualIndex}
                  onClick={() => handleSelectEvent(actualIndex)}
                  className={`group relative w-full text-left flex items-start gap-3 px-4 py-1.5 border-b transition-colors focus:outline-none ${
                    isNew ? 'dt-timeline-enter' : ''
                  }`}
                  style={{
                    backgroundColor: selected
                      ? 'var(--dt-info-bg)'
                      : 'transparent',
                    borderColor: 'var(--dt-border)',
                    animationDelay: enterDelayMs ? `${enterDelayMs}ms` : undefined,
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
                              : isTrait
                                ? 'var(--dt-info)'
                                : isReactRender
                                  ? 'var(--dt-warning)'
                                  : isDevtools
                                    ? 'var(--dt-text-muted)'
                                    : 'var(--dt-text-primary)',
                        }}
                      >
                        {primaryLabel}
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
