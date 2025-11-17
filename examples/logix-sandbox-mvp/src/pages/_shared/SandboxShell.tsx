import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { type SandboxStatus, type LogEntry, type TraceSpan, type UiIntentPacket } from '@logix/sandbox'
import { ThemeToggle } from '../../components/ThemeToggle'

const shouldShowFlickerDiagnostics = (): boolean => {
  if (!import.meta.env.DEV) return false
  if (typeof window === 'undefined') return false
  try {
    const params = new URLSearchParams(window.location.search)
    return params.get('debugFlicker') === '1'
  } catch {
    return false
  }
}

export function Header({
  status,
  isRunning,
  uiRunning,
  kernel,
  codegen,
  onRun,
  disabled,
}: {
  status: SandboxStatus
  isRunning: boolean
  uiRunning?: boolean
  kernel?: {
    readonly kernelId: string
    readonly strict: boolean
    readonly allowFallback: boolean
    readonly kernels: ReadonlyArray<{
      kernelId: string
      label?: string
      kernelUrl: string
    }>
    readonly defaultKernelId?: string
    readonly onChangeKernelId: (kernelId: string) => void
    readonly onChangeStrict: (strict: boolean) => void
    readonly onChangeAllowFallback: (allowFallback: boolean) => void
  }
  codegen?: {
    readonly autoImportLogix: boolean
    readonly onChangeAutoImportLogix: (autoImportLogix: boolean) => void
  }
  onRun: () => void
  disabled: boolean
}) {
  const showRunning = uiRunning ?? isRunning
  const pathname = useLocation().pathname

  const navLinkClass = (to: string): string => {
    const active = pathname === to
    return [
      'px-2 py-1 rounded text-[11px] font-semibold transition-colors',
      active ? 'bg-indigo-600 text-white' : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5',
    ].join(' ')
  }

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/5 z-20 shadow-sm dark:shadow-none">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-white/10">
          <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 19h20L12 2zm0 3.8L18.4 17H5.6L12 5.8zM11 8v2h2V8h-2zm0 4v4h2v-4h-2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">
            Runtime Alignment Lab
          </h1>
          <div className="text-[10px] text-zinc-500 dark:text-zinc-500 font-mono mt-0.5">LOGIX_SANDBOX_V1</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />

        <nav className="flex items-center gap-1 rounded-md border border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-zinc-950/40 px-1 py-1">
          <Link data-testid="nav-lab" to="/" className={navLinkClass('/')}>
            Lab
          </Link>
          <Link data-testid="nav-playground" to="/playground" className={navLinkClass('/playground')}>
            Playground
          </Link>
          <Link data-testid="nav-ir" to="/ir" className={navLinkClass('/ir')}>
            IR
          </Link>
        </nav>

        {kernel ? (
          <div
            className={`flex items-center gap-2 ${isRunning ? 'pointer-events-none' : ''}`}
            aria-disabled={isRunning}
          >
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">
              Kernel
            </span>
            <select
              className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-700 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-100"
              value={kernel.kernelId}
              onChange={(e) => {
                if (isRunning) return
                kernel.onChangeKernelId(e.target.value)
              }}
            >
              {kernel.kernels.length > 0 ? (
                kernel.kernels.map((k) => (
                  <option key={k.kernelId} value={k.kernelId}>
                    {k.label ?? k.kernelId}
                    {kernel.defaultKernelId === k.kernelId ? ' (default)' : ''}
                  </option>
                ))
              ) : (
                <option value={kernel.kernelId}>{kernel.kernelId}</option>
              )}
            </select>

            <label className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-300">
              <input
                type="checkbox"
                className="h-3 w-3"
                checked={kernel.strict}
                onChange={(e) => {
                  if (isRunning) return
                  const next = e.target.checked
                  kernel.onChangeStrict(next)
                  if (next) {
                    kernel.onChangeAllowFallback(false)
                  }
                }}
              />
              strict
            </label>

            <label className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-300">
              <input
                type="checkbox"
                className="h-3 w-3"
                checked={kernel.allowFallback}
                onChange={(e) => {
                  if (isRunning) return
                  kernel.onChangeAllowFallback(e.target.checked)
                }}
                disabled={kernel.strict}
              />
              fallback
            </label>

            {codegen ? (
              <label
                className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-300"
                title='编译前自动注入：import * as Logix from "@logix/core"'
              >
                <input
                  type="checkbox"
                  className="h-3 w-3"
                  checked={codegen.autoImportLogix}
                  onChange={(e) => {
                    if (isRunning) return
                    codegen.onChangeAutoImportLogix(e.target.checked)
                  }}
                />
                autoImport
              </label>
            ) : null}
          </div>
        ) : null}

        <div className="h-6 w-px bg-zinc-200 dark:bg-white/10" />

        <button
          onClick={onRun}
          disabled={disabled || isRunning}
          className={`
            relative group w-[140px] px-4 py-1.5 rounded-md font-medium text-xs transition
            ${
              disabled
                ? 'opacity-50 cursor-not-allowed bg-zinc-100 dark:bg-white/5 text-zinc-400'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm hover:shadow-indigo-500/20 active:translate-y-0.5'
            }
          `}
        >
          <div className="flex w-full items-center justify-center gap-2">
            {showRunning ? (
              <svg className="animate-spin h-3.5 w-3.5 opacity-90" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 opacity-90" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
            <span>{showRunning ? 'Running...' : 'Run Scenario'}</span>
          </div>
        </button>
      </div>
    </header>
  )
}

export function StatusBar({ status }: { status: SandboxStatus }) {
  const config = {
    idle: { color: 'bg-zinc-400', label: 'Ready to connect' },
    initializing: { color: 'bg-amber-500', label: 'Initializing runtime...' },
    ready: { color: 'bg-emerald-500', label: 'Worker Ready' },
    running: { color: 'bg-indigo-500', label: 'Executing...' },
    completed: { color: 'bg-emerald-500', label: 'Execution Completed' },
    error: { color: 'bg-red-500', label: 'Runtime Error' },
  }
  const { color, label } = config[status] || config.idle

  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-white/5 text-[10px] font-mono select-none">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${color} ${status === 'running' ? 'animate-pulse' : ''}`} />
        <span className="text-zinc-600 dark:text-zinc-400 uppercase tracking-tight font-semibold">{label}</span>
      </div>
      <div className="text-zinc-400 dark:text-zinc-600">Effect-TS System v3.19</div>
    </div>
  )
}

export function Tabs({
  activeTab,
  onTabChange,
  logs,
  traces,
  uiIntents,
}: {
  activeTab: 'console' | 'result' | 'traces' | 'http' | 'ui'
  onTabChange: (t: 'console' | 'result' | 'traces' | 'http' | 'ui') => void
  logs: ReadonlyArray<LogEntry>
  traces: ReadonlyArray<TraceSpan>
  uiIntents: ReadonlyArray<UiIntentPacket>
}) {
  const httpCount = traces.filter((t) => t.attributes && (t.attributes as any).kind === 'http').length

  return (
    <div className="flex items-center gap-1 px-4 border-b border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-900">
      {(['console', 'result', 'traces', 'http', 'ui'] as const).map((tab) => {
        const isActive = activeTab === tab
        return (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`
              relative py-2.5 px-3 text-xs font-medium transition-colors flex-1 min-w-0
              ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-300'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <span>
                {tab === 'console' && 'Terminal'}
                {tab === 'result' && 'Values'}
                {tab === 'traces' && 'Traces'}
                {tab === 'http' && 'HTTP'}
                {tab === 'ui' && 'UI Intent'}
              </span>
              {tab === 'console' && logs.length > 0 && <Badge count={logs.length} active={isActive} />}
              {tab === 'traces' && traces.length > 0 && <Badge count={traces.length} active={isActive} />}
              {tab === 'http' && httpCount > 0 && <Badge count={httpCount} active={isActive} />}
              {tab === 'ui' && uiIntents.length > 0 && <Badge count={uiIntents.length} active={isActive} />}
            </div>
            {isActive && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-indigo-600 dark:bg-indigo-500" />}
          </button>
        )
      })}
    </div>
  )
}

function Badge({ count, active }: { count: number; active: boolean }) {
  return (
    <span
      className={`
      px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none
      ${
        active
          ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
          : 'bg-zinc-100 dark:bg-white/10 text-zinc-500'
      }
    `}
    >
      {count}
    </span>
  )
}

export function AlertBox({
  title,
  type,
  children,
  className,
}: {
  title: string
  type: 'error' | 'warn'
  children: React.ReactNode
  className?: string
}) {
  const styles =
    type === 'error'
      ? 'bg-red-50 border-red-100 text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400'
      : 'bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400'

  return (
    <div className={`p-3 rounded-md border ${styles} ${className}`}>
      <div className="flex items-center gap-2 mb-1 font-semibold text-xs uppercase tracking-wider opacity-90">
        {title}
      </div>
      {children}
    </div>
  )
}

const formatLogTime = (timestamp: number): string =>
  new Date(timestamp)
    .toLocaleTimeString([], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    .split(' ')[0]!

const formatLogArgs = (args: ReadonlyArray<unknown>): string =>
  args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')

function useFlickerDiagnostics(enabled: boolean, logs: ReadonlyArray<unknown>) {
  const mountIdRef = React.useRef<string>(`${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 8)}`)

  const renderCountRef = React.useRef(0)
  renderCountRef.current += 1

  const logsVersionRef = React.useRef(0)
  const prevLogsRef = React.useRef<ReadonlyArray<unknown> | null>(null)
  const lastLogsChangeAtRef = React.useRef<number>(0)

  if (prevLogsRef.current !== logs) {
    prevLogsRef.current = logs
    logsVersionRef.current += 1
    lastLogsChangeAtRef.current = performance.now()
  }

  const unmountCountRef = React.useRef(0)
  React.useEffect(() => {
    if (!enabled) return
    return () => {
      unmountCountRef.current += 1
    }
  }, [enabled])

  return enabled
    ? {
        mountId: mountIdRef.current,
        renderCount: renderCountRef.current,
        logsLength: logs.length,
        logsVersion: logsVersionRef.current,
        lastLogsChangeAt: lastLogsChangeAtRef.current,
        visibility: typeof document !== 'undefined' ? document.visibilityState : 'unknown',
        hasFocus: typeof document !== 'undefined' ? document.hasFocus() : false,
        unmountCount: unmountCountRef.current,
      }
    : null
}

const LogRow = React.memo(
  function LogRow({ log }: { log: LogEntry }) {
    const time = formatLogTime(log.timestamp)
    const message = formatLogArgs(log.args)

    return (
      <div className="flex items-start gap-3 py-1">
        <span className="text-zinc-400 dark:text-zinc-600 select-none min-w-[60px]">{time}</span>
        <div className="flex-1 break-words">
          <span
            className={`
               inline-block mr-2 font-bold text-[10px] uppercase tracking-wider
               ${log.level === 'error' ? 'text-red-500' : log.level === 'warn' ? 'text-amber-500' : 'text-blue-500'}
             `}
          >
            {log.level}
          </span>
          <span className="text-zinc-700 dark:text-zinc-300">{message}</span>
        </div>
      </div>
    )
  },
  (prev, next) => prev.log === next.log,
)

function ConsoleView({ logs }: { logs: ReadonlyArray<LogEntry> }) {
  const diag = useFlickerDiagnostics(shouldShowFlickerDiagnostics(), logs)

  return (
    <div className="font-mono text-xs">
      {diag && (
        <div className="sticky top-0 z-10 mb-2">
          <div className="inline-flex items-center gap-2 rounded border border-zinc-200 dark:border-white/10 bg-white/95 dark:bg-zinc-950/95 px-2 py-1 text-[10px] text-zinc-600 dark:text-zinc-300">
            <span className="font-semibold">flicker</span>
            <span className="font-mono">mount={diag.mountId}</span>
            <span className="font-mono">render#{diag.renderCount}</span>
            <span className="font-mono">logs={diag.logsLength}</span>
            <span className="font-mono">v={diag.logsVersion}</span>
            <span className="font-mono">t={Math.round(diag.lastLogsChangeAt)}ms</span>
            <span className="font-mono">{diag.visibility}</span>
            <span className="font-mono">focus={diag.hasFocus ? '1' : '0'}</span>
          </div>
        </div>
      )}
      {logs.length === 0 ? (
        <EmptyState label="No logs emitted" />
      ) : (
        <div className="divide-y divide-dashed divide-zinc-100 dark:divide-white/5">
          {logs.map((log, i) => (
            <LogRow key={`${log.timestamp}-${i}`} log={log} />
          ))}
        </div>
      )}
    </div>
  )
}

export const MemoConsoleView = React.memo(ConsoleView)

export function ResultView({ result }: { result: unknown }) {
  if (result === undefined || result === null) return <EmptyState label="Run program to see result" />

  const isRunResult =
    typeof result === 'object' &&
    result !== null &&
    typeof (result as any).runId === 'string' &&
    typeof (result as any).duration === 'number' &&
    'stateSnapshot' in (result as any)

  if (isRunResult) {
    const runId = (result as any).runId as string
    const duration = (result as any).duration as number
    const requestedKernelId = (result as any).requestedKernelId as string | undefined
    const effectiveKernelId = (result as any).effectiveKernelId as string | undefined
    const fallbackReason = (result as any).fallbackReason as string | undefined
    const kernelImplementationRef = (result as any).kernelImplementationRef as unknown
    const stateSnapshot = (result as any).stateSnapshot as unknown

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 text-[11px] font-mono">
          <span className="px-2 py-1 rounded border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200">
            runId: {runId}
          </span>
          <span className="px-2 py-1 rounded border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200">
            duration: {duration}ms
          </span>
          <span className="px-2 py-1 rounded border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200">
            requested: {requestedKernelId ?? '-'}
          </span>
          <span className="px-2 py-1 rounded border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200">
            effective: {effectiveKernelId ?? '-'}
          </span>
          {fallbackReason ? (
            <span className="px-2 py-1 rounded border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-200">
              fallback: {fallbackReason}
            </span>
          ) : null}
          {kernelImplementationRef ? (
            <span className="px-2 py-1 rounded border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200">
              implRef:{' '}
              {typeof kernelImplementationRef === 'string'
                ? kernelImplementationRef
                : JSON.stringify(kernelImplementationRef)}
            </span>
          ) : null}
        </div>

        <div className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded border border-zinc-200 dark:border-white/5">
          <pre className="font-mono text-xs text-zinc-700 dark:text-emerald-400/90 whitespace-pre-wrap leading-relaxed">
            {JSON.stringify(stateSnapshot, null, 2)}
          </pre>
        </div>
      </div>
    )
  }

  return (
    <div className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded border border-zinc-200 dark:border-white/5">
      <pre className="font-mono text-xs text-zinc-700 dark:text-emerald-400/90 whitespace-pre-wrap leading-relaxed">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  )
}

export function TracesView({ traces }: { traces: ReadonlyArray<TraceSpan> }) {
  if (traces.length === 0) return <EmptyState label="No trace spans captured" />

  return (
    <div className="space-y-2">
      {traces.map((t, i) => {
        const duration = t.endTime && t.startTime > 0 ? t.endTime - t.startTime : 0
        return (
          <div
            key={i}
            className="flex items-center gap-3 p-2.5 bg-white dark:bg-white/[0.02] rounded border border-zinc-200 dark:border-white/5 hover:border-indigo-300 dark:hover:border-white/10 transition-colors"
          >
            <div className={`w-1.5 h-1.5 rounded-full ${t.status === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-200 truncate">
                  {t.name || t.spanId}
                </span>
                <span className="px-1.5 py-0.5 text-[9px] rounded-sm bg-zinc-100 dark:bg-white/10 text-zinc-500 font-mono">
                  {t.spanId.slice(0, 6)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {duration > 0 && <span className="text-[10px] font-mono text-zinc-400">{duration}ms</span>}
              <span
                className={`
                px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider
                ${
                  t.status === 'success'
                    ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : t.status === 'error'
                      ? 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                      : 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400'
                }
              `}
              >
                {t.status}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function HttpView({ traces }: { traces: ReadonlyArray<TraceSpan> }) {
  const httpTraces = traces.filter((t) => (t.attributes as any)?.kind === 'http')
  if (httpTraces.length === 0) return <EmptyState label="No HTTP calls captured" />

  return (
    <div className="space-y-2">
      {httpTraces.map((t) => {
        const attrs = (t.attributes ?? {}) as any
        const duration = t.endTime && t.startTime > 0 ? t.endTime - t.startTime : 0
        return (
          <div
            key={t.spanId}
            className="rounded border border-zinc-200 dark:border-white/5 bg-white dark:bg-white/[0.02] p-3 shadow-sm"
          >
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                    attrs.mode === 'mock'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'
                  }`}
                >
                  {attrs.mode === 'mock' ? 'Mock' : 'Real'}
                </span>
                <span className="font-mono">{attrs.method ?? 'GET'}</span>
              </div>
              <div className="font-mono">{duration > 0 ? `${duration} ms` : ''}</div>
            </div>
            <div className="text-sm font-mono text-zinc-900 dark:text-zinc-100 break-all">{attrs.url ?? t.name}</div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-500 mt-1">
              status {attrs.status ?? 0} {attrs.delayMs ? `· delay ${attrs.delayMs}ms` : ''}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function UiIntentRawPanel({ intents }: { intents: ReadonlyArray<UiIntentPacket> }) {
  if (!intents || intents.length === 0) {
    return <EmptyState label="No UI_INTENT emitted" />
  }

  return (
    <div className="space-y-3">
      {intents.map((intent) => (
        <div
          key={intent.id}
          className="rounded border border-zinc-200 dark:border-white/5 bg-white dark:bg-white/[0.02] p-3 shadow-sm"
        >
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200 text-[10px] font-semibold uppercase">
                {intent.component}
              </span>
              <span className="font-mono">{intent.intent}</span>
            </div>
            <div className="text-right space-y-0.5">
              {intent.meta?.storyId && (
                <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                  {intent.meta.storyId}
                  {intent.meta.stepId ? ` · step ${intent.meta.stepId}` : ''}
                </div>
              )}
              <div className="text-[10px] font-mono text-zinc-400">#{intent.id}</div>
            </div>
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
            callbacks: {intent.callbacks?.length ? intent.callbacks.join(', ') : '—'}
          </div>
          <pre className="mt-2 text-[11px] bg-zinc-100 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-200 rounded-md p-2 overflow-auto">
            {JSON.stringify(intent.props ?? {}, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-zinc-300 dark:text-zinc-700">
      <svg className="w-8 h-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
        />
      </svg>
      <p className="text-xs font-medium">{label}</p>
    </div>
  )
}
