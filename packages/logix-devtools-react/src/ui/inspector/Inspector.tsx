import React from 'react'
import * as Logix from '@logix/core'
import { useDevtoolsState, useDevtoolsDispatch } from '../../DevtoolsHooks.js'
import { StateTraitGraphView } from '../graph/StateTraitGraphView.js'

export interface InspectorProps {
  readonly getProgramForModule?: (moduleId: string) => Logix.StateTrait.StateTraitProgram<any> | undefined
}

type DepsMismatchView = {
  readonly key: string
  readonly kind: 'computed' | 'source' | 'unknown'
  readonly fieldPath: string
  readonly declared: ReadonlyArray<string>
  readonly reads: ReadonlyArray<string>
  readonly missing: ReadonlyArray<string>
  readonly unused: ReadonlyArray<string>
  readonly message: string
  readonly hint?: string
}

const parseBracketList = (message: string, label: string): ReadonlyArray<string> => {
  const re = new RegExp(`${label}=\\[([^\\]]*)\\]`)
  const m = message.match(re)
  const raw = (m?.[1] ?? '').trim()
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

const parseDepsMismatch = (event: any): DepsMismatchView | undefined => {
  if (!event || typeof event !== 'object') return undefined
  if (event.type !== 'diagnostic') return undefined
  if (event.code !== 'state_trait::deps_mismatch') return undefined

  const message = typeof event.message === 'string' ? event.message : ''
  const hint = typeof event.hint === 'string' ? event.hint : undefined

  const kindFromKind =
    typeof event.kind === 'string' && event.kind.startsWith('deps_mismatch:')
      ? event.kind.slice('deps_mismatch:'.length)
      : undefined

  const head = message.match(/^\[deps\]\s+(\w+)\s+"([^"]+)"/)
  const kindFromMessage = head?.[1]
  const fieldPath = head?.[2]
  if (!fieldPath) return undefined

  const kind =
    kindFromKind === 'computed' || kindFromKind === 'source'
      ? kindFromKind
      : kindFromMessage === 'computed' || kindFromMessage === 'source'
        ? kindFromMessage
        : 'unknown'

  const declared = parseBracketList(message, 'declared')
  const reads = parseBracketList(message, 'reads')
  const missing = parseBracketList(message, 'missing')
  const unused = parseBracketList(message, 'unused')

  return {
    key: `${kind}::${fieldPath}`,
    kind,
    fieldPath,
    declared,
    reads,
    missing,
    unused,
    message,
    hint,
  }
}

export const Inspector: React.FC<InspectorProps> = ({ getProgramForModule }) => {
  const state = useDevtoolsState()
  const dispatch = useDevtoolsDispatch()

  const {
    selectedRuntime,
    selectedModule,
    selectedInstance,
    activeState,
    selectedEventIndex,
    timeline,
    settings,
    timeTravel,
    runtimes,
  } = state

  const hasSelectedEvent =
    selectedEventIndex !== undefined && selectedEventIndex >= 0 && selectedEventIndex < timeline.length

  const selectedEvent = hasSelectedEvent ? timeline[selectedEventIndex]?.event : undefined

  // 当没有显式选中的事件时，默认使用时间线中最近一条事件作为详情视图的数据源，
  // 以便右侧面板在“未选中”状态下仍然展示最新事件的信息。
  const latestEvent = !hasSelectedEvent && timeline.length > 0 ? timeline[timeline.length - 1]?.event : undefined

  const detailEvent = selectedEvent ?? latestEvent
  const detailEventLabel = selectedEvent ? 'Selected Event' : 'Latest Event'

  const transactionSummary = React.useMemo(() => {
    // When no event is explicitly selected, we still want "latest txn" summary even if the
    // newest event is a trace without txnId.
    const txnAnchorEvent = (() => {
      if (selectedEvent) return selectedEvent
      for (let i = timeline.length - 1; i >= 0; i--) {
        const ev = timeline[i]?.event
        if (!ev) continue
        const ref = Logix.Debug.internal.toRuntimeDebugEventRef(ev as Logix.Debug.Event)
        if (ref?.txnId) return ev
      }
      return undefined
    })()

    if (!txnAnchorEvent) {
      return undefined
    }

    const ref = Logix.Debug.internal.toRuntimeDebugEventRef(txnAnchorEvent as Logix.Debug.Event)
    if (!ref || !ref.txnId) {
      return undefined
    }

    const txnId = ref.txnId
    const refsForTxn = timeline
      .map((entry) => Logix.Debug.internal.toRuntimeDebugEventRef(entry.event as Logix.Debug.Event))
      .filter((r): r is Logix.Debug.RuntimeDebugEventRef => r != null && r.txnId === txnId)

    if (refsForTxn.length === 0) {
      return undefined
    }

    const eventCount = refsForTxn.length
    let patchCount: number | undefined
    let renderCount = 0

    for (const r of refsForTxn) {
      if (r.kind === 'state') {
        const meta = r.meta as any
        if (meta && typeof meta.patchCount === 'number') {
          patchCount = meta.patchCount
        }
      }
      if (r.kind === 'react-render') {
        renderCount += 1
      }
    }

    return { txnId, eventCount, patchCount, renderCount }
  }, [detailEvent, timeline])

  const selectedFieldPath = state.selectedFieldPath

  const program = getProgramForModule && selectedModule ? getProgramForModule(selectedModule) : undefined

  const depsMismatches = React.useMemo(() => {
    const byKey = new Map<string, DepsMismatchView>()
    for (const entry of timeline) {
      const parsed = parseDepsMismatch((entry as any)?.event)
      if (!parsed) continue
      byKey.set(parsed.key, parsed)
    }
    return Array.from(byKey.values())
  }, [timeline])

  const handleSelectFieldPath = React.useCallback(
    (fieldPath: string) => {
      dispatch({ _tag: 'selectFieldPath', payload: fieldPath })
    },
    [dispatch],
  )

  const handleTimeTravel = React.useCallback(
    (mode: 'before' | 'after' | 'latest') => {
      if (!settings.enableTimeTravelUI) return
      if (!transactionSummary) return
      if (!selectedModule || !selectedRuntime) return

      // 若尚未显式选择 Instance，则在当前 Runtime + Module 下自动选择第一个实例。
      let instanceId = selectedInstance
      if (!instanceId) {
        const runtimeView = runtimes.find((r) => r.runtimeLabel === selectedRuntime)
        const moduleView = runtimeView?.modules.find((m) => m.moduleId === selectedModule)
        instanceId = moduleView?.instances[0]
      }
      if (!instanceId) return

      if (mode === 'latest') {
        dispatch({
          _tag: 'timeTravelLatest',
          payload: {
            moduleId: selectedModule,
            instanceId,
          },
        })
        return
      }

      dispatch({
        _tag: mode === 'before' ? 'timeTravelBefore' : 'timeTravelAfter',
        payload: {
          moduleId: selectedModule,
          instanceId,
          txnId: transactionSummary.txnId,
        },
      })
    },
    [
      dispatch,
      settings.enableTimeTravelUI,
      transactionSummary,
      selectedModule,
      selectedInstance,
      selectedRuntime,
      runtimes,
    ],
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
          {settings.enableTimeTravelUI && timeTravel && (
            <div className="mt-1 text-[10px] font-mono">
              <span style={{ color: 'var(--dt-warning)' }}>TIME TRAVEL</span>
              <span style={{ color: 'var(--dt-text-muted)' }}>
                {' '}
                txn={timeTravel.txnId} · mode={timeTravel.mode}
              </span>
            </div>
          )}
        </div>

        {transactionSummary && (
          <div className="border-b" style={{ borderColor: 'var(--dt-border)', backgroundColor: 'var(--dt-bg-root)' }}>
            <div
              className="px-4 py-2 border-b flex justify-between items-center"
              style={{
                backgroundColor: 'var(--dt-bg-header)',
                borderColor: 'var(--dt-border)',
              }}
            >
              <span className="text-[10px] font-mono" style={{ color: 'var(--dt-text-secondary)' }}>
                Transaction Summary
              </span>
              <span className="text-[9px] font-mono" style={{ color: 'var(--dt-text-muted)' }}>
                txnId: {transactionSummary.txnId}
              </span>
            </div>
            <div className="px-4 py-2 flex flex-wrap gap-2 text-[10px] font-mono">
              <span style={{ color: 'var(--dt-text-secondary)' }}>
                Events: <span style={{ color: 'var(--dt-text-primary)' }}>{transactionSummary.eventCount}</span>
              </span>
              {transactionSummary.patchCount !== undefined && (
                <span style={{ color: 'var(--dt-text-secondary)' }}>
                  Patches: <span style={{ color: 'var(--dt-state-dim)' }}>{transactionSummary.patchCount}</span>
                </span>
              )}
              <span style={{ color: 'var(--dt-text-secondary)' }}>
                Renders: <span style={{ color: 'var(--dt-warning)' }}>{transactionSummary.renderCount}</span>
              </span>
            </div>
            {settings.enableTimeTravelUI && selectedInstance && (
              <div className="px-4 pb-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="px-2 py-1 rounded border text-[10px] font-mono"
                  style={{
                    borderColor: 'var(--dt-border)',
                    color: 'var(--dt-text-secondary)',
                    backgroundColor: 'var(--dt-bg-surface)',
                  }}
                  onClick={() => handleTimeTravel('before')}
                >
                  回到事务前状态
                </button>
                <button
                  type="button"
                  className="px-2 py-1 rounded border text-[10px] font-mono"
                  style={{
                    borderColor: 'var(--dt-border)',
                    color: 'var(--dt-text-secondary)',
                    backgroundColor: 'var(--dt-bg-surface)',
                  }}
                  onClick={() => handleTimeTravel('after')}
                >
                  回到事务后状态
                </button>
                <button
                  type="button"
                  className="px-2 py-1 rounded border text-[10px] font-mono"
                  style={{
                    borderColor: 'var(--dt-border)',
                    color: 'var(--dt-text-secondary)',
                    backgroundColor: 'var(--dt-bg-surface)',
                  }}
                  onClick={() => handleTimeTravel('latest')}
                >
                  返回最新状态
                </button>
              </div>
            )}
          </div>
        )}

        {depsMismatches.length > 0 && (
          <div className="border-b" style={{ borderColor: 'var(--dt-border)', backgroundColor: 'var(--dt-bg-root)' }}>
            <div
              className="px-4 py-2 border-b flex justify-between items-center"
              style={{
                backgroundColor: 'var(--dt-bg-header)',
                borderColor: 'var(--dt-border)',
              }}
            >
              <span className="text-[10px] font-mono" style={{ color: 'var(--dt-warning)' }}>
                Deps Mismatch
              </span>
              <span className="text-[9px] font-mono" style={{ color: 'var(--dt-text-muted)' }}>
                {depsMismatches.length} warning{depsMismatches.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="px-4 py-2 space-y-2">
              {depsMismatches.map((m) => (
                <div
                  key={m.key}
                  className="rounded border px-2 py-1"
                  style={{
                    borderColor: 'var(--dt-border-light)',
                    backgroundColor: 'var(--dt-bg-element)',
                  }}
                  title={m.message}
                >
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                    <span style={{ color: 'var(--dt-text-muted)' }}>{m.kind}</span>
                    <button
                      type="button"
                      className="underline underline-offset-2"
                      style={{ color: 'var(--dt-primary)' }}
                      onClick={() => handleSelectFieldPath(m.fieldPath)}
                      aria-label={`DepsMismatchFieldPath:${m.fieldPath}`}
                      title="点击以按字段过滤时间线"
                    >
                      {m.fieldPath}
                    </button>
                    {m.missing.length > 0 && (
                      <span style={{ color: 'var(--dt-warning)' }} title={m.missing.join('\n')}>
                        missing({m.missing.length})
                      </span>
                    )}
                    {m.unused.length > 0 && (
                      <span style={{ color: 'var(--dt-text-secondary)' }} title={m.unused.join('\n')}>
                        unused({m.unused.length})
                      </span>
                    )}
                  </div>
                  {m.hint && (
                    <div className="mt-1 text-[9px] leading-relaxed" style={{ color: 'var(--dt-text-muted)' }}>
                      {m.hint}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-b" style={{ borderColor: 'var(--dt-border)', backgroundColor: 'var(--dt-bg-root)' }}>
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
