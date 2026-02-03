'use client'

import * as React from 'react'
import { createSandboxClient, type SandboxClientState } from '@logixjs/sandbox/Client'
import type { RunResult } from '@logixjs/sandbox/Types'
import { useI18n } from 'fumadocs-ui/contexts/i18n'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

import { getPlaygroundText } from './i18n'

export type PlaygroundLevel = 'basic' | 'debug'
export type PlaygroundPanel = 'result' | 'console' | 'trace'

export type PlaygroundProps = {
  readonly id: string
  readonly title?: string
  readonly code: string
  readonly moduleExport?: string
  readonly level?: PlaygroundLevel
  readonly observe?: ReadonlyArray<string>
  readonly defaultPanel?: PlaygroundPanel
  readonly timeoutMs?: number
  readonly diagnosticsLevel?: 'off' | 'light' | 'sampled' | 'full'
  readonly maxEvents?: number
  readonly reportMaxBytes?: number
  readonly maxLogs?: number
  readonly maxTraces?: number
  readonly maxUiIntents?: number
}

type TrialRunSummary = {
  readonly ok?: boolean
  readonly errorCode?: string
  readonly missingRequired?: ReadonlyArray<{ readonly port?: string; readonly serviceId?: string }>
  readonly missingOptional?: ReadonlyArray<{ readonly port?: string; readonly serviceId?: string }>
}

const extractTrialRunSummary = (snapshot: unknown): TrialRunSummary => {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return {}
  const anySnapshot = snapshot as any

  const ok = typeof anySnapshot.ok === 'boolean' ? anySnapshot.ok : undefined
  const errorCode = typeof anySnapshot.error?.code === 'string' ? anySnapshot.error.code : undefined

  const alignment = anySnapshot.servicePortsAlignment
  const missingRequired = Array.isArray(alignment?.missingRequired) ? (alignment.missingRequired as any[]) : undefined
  const missingOptional = Array.isArray(alignment?.missingOptional) ? (alignment.missingOptional as any[]) : undefined

  return { ok, errorCode, missingRequired, missingOptional }
}

const getConsoleLine = (arg: unknown): string => {
  try {
    if (typeof arg === 'string') return arg
    return JSON.stringify(arg)
  } catch {
    return String(arg)
  }
}

export function Playground(props: PlaygroundProps) {
  const { locale } = useI18n()
  const t = getPlaygroundText(locale)

  const initialCodeRef = React.useRef(props.code)
  const [code, setCode] = React.useState(props.code)
  const [panel, setPanel] = React.useState<PlaygroundPanel>(() => {
    const requested = props.defaultPanel ?? 'result'
    return requested === 'trace' && props.level !== 'debug' ? 'result' : requested
  })
  const [sandboxState, setSandboxState] = React.useState<SandboxClientState | null>(null)
  const [result, setResult] = React.useState<RunResult | null>(null)
  const [localError, setLocalError] = React.useState<string | null>(null)

  const timeoutMs = props.timeoutMs ?? 10_000
  const runSeqRef = React.useRef(0)

  const client = React.useMemo(
    () =>
      createSandboxClient({
        timeout: timeoutMs,
        maxLogs: props.maxLogs ?? 200,
        maxTraces: props.maxTraces ?? 200,
        maxUiIntents: props.maxUiIntents ?? 50,
      }),
    [props.maxLogs, props.maxTraces, props.maxUiIntents, timeoutMs],
  )

  React.useEffect(() => {
    const unsubscribe = client.subscribe((s) => setSandboxState(s))
    return () => {
      unsubscribe()
      client.terminate()
    }
  }, [client])

  const canCancel = sandboxState?.status === 'running' || sandboxState?.status === 'initializing'

  const onReset = React.useCallback(() => {
    setCode(initialCodeRef.current)
    setResult(null)
    setLocalError(null)
    runSeqRef.current = 0
    client.terminate()
  }, [client])

  const onCancel = React.useCallback(() => {
    client.terminate()
  }, [client])

  const onRun = React.useCallback(async () => {
    setLocalError(null)
    setResult(null)

    const runId = `docs:${props.id}:${++runSeqRef.current}`
    const diagnosticsLevel = props.diagnosticsLevel ?? 'off'
    const maxEvents = props.maxEvents ?? (diagnosticsLevel === 'off' ? 0 : 200)
    const reportMaxBytes = props.reportMaxBytes ?? 300_000

    try {
      const out = await client.trialRunModule({
        moduleCode: code,
        moduleExport: props.moduleExport,
        runId,
        diagnosticsLevel,
        maxEvents,
        trialRunTimeoutMs: timeoutMs,
        reportMaxBytes,
      })

      setResult(out)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : String(err))
    }
  }, [client, code, props.diagnosticsLevel, props.id, props.maxEvents, props.moduleExport, props.reportMaxBytes, timeoutMs])

  const status = sandboxState?.status ?? 'idle'
  const sandboxError = sandboxState?.error
  const dirty = code !== initialCodeRef.current
  const showTracePanel = props.level === 'debug'
  const activePanel = panel === 'trace' && !showTracePanel ? 'result' : panel
  const trialRunSummary = React.useMemo(() => extractTrialRunSummary(result?.stateSnapshot), [result?.stateSnapshot])

  return (
    <Card className="my-6">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">{props.title ?? 'Playground'}</CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onReset} disabled={canCancel}>
              {t.reset}
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel} disabled={!canCancel}>
              {t.cancel}
            </Button>
            <Button size="sm" onClick={onRun} disabled={status === 'running'}>
              {status === 'running' ? t.running : t.run}
            </Button>
          </div>
        </div>

        {props.observe && props.observe.length > 0 ? (
          <ul className="list-disc pl-5 text-sm text-muted-foreground">
            {props.observe.slice(0, 3).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div>
              {t.status}: <span className="font-mono">{status}</span>
            </div>
            {dirty ? <div className="font-mono">modified</div> : null}
          </div>

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            disabled={canCancel}
            className={cn(
              'min-h-[240px] w-full resize-y rounded-lg border bg-background px-3 py-2 font-mono text-xs leading-relaxed',
              'focus:outline-none focus:ring-1 focus:ring-ring',
            )}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={activePanel === 'result' ? 'secondary' : 'outline'}
            onClick={() => setPanel('result')}
          >
            {t.result}
          </Button>
          <Button
            size="sm"
            variant={activePanel === 'console' ? 'secondary' : 'outline'}
            onClick={() => setPanel('console')}
          >
            {t.console}
          </Button>
          {showTracePanel ? (
            <Button size="sm" variant={activePanel === 'trace' ? 'secondary' : 'outline'} onClick={() => setPanel('trace')}>
              {t.trace}
            </Button>
          ) : null}
        </div>

        {activePanel === 'result' ? (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            {localError ? (
              <div className="space-y-1">
                <div className="font-medium text-destructive">{t.error}</div>
                <pre className="whitespace-pre-wrap break-words font-mono text-xs">{localError}</pre>
              </div>
            ) : result || sandboxError ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-mono text-xs">{result?.runId ?? 'unknown-runId'}</div>
                  {result ? <div className="text-xs text-muted-foreground">{t.durationMs(result.duration)}</div> : null}
                </div>
                {trialRunSummary.ok !== undefined ? (
                  <div className="text-xs">
                    <span className="font-mono">trialrun:</span>{' '}
                    <span className={trialRunSummary.ok ? 'text-emerald-700' : 'text-destructive'}>
                      {trialRunSummary.ok ? 'PASS' : 'FAIL'}
                    </span>
                    {trialRunSummary.ok === false && trialRunSummary.errorCode ? (
                      <span className="ml-2 font-mono text-muted-foreground">({trialRunSummary.errorCode})</span>
                    ) : null}
                  </div>
                ) : null}
                {sandboxError ? (
                  <div className="space-y-1">
                    <div className="font-medium text-destructive">
                      {t.error} <span className="font-mono text-xs">({sandboxError.code})</span>
                    </div>
                    <pre className="whitespace-pre-wrap break-words font-mono text-xs">{sandboxError.message}</pre>
                  </div>
                ) : null}
                {trialRunSummary.ok === false && trialRunSummary.missingRequired && trialRunSummary.missingRequired.length > 0 ? (
                  <details className="rounded-md border bg-background px-3 py-2">
                    <summary className="cursor-pointer select-none text-xs text-muted-foreground">
                      servicePortsAlignment.missingRequired ({trialRunSummary.missingRequired.length})
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs">
                      {JSON.stringify(trialRunSummary.missingRequired, null, 2)}
                    </pre>
                  </details>
                ) : null}
                {result?.stateSnapshot !== undefined ? (
                  <details className="rounded-md border bg-background px-3 py-2">
                    <summary className="cursor-pointer select-none text-xs text-muted-foreground">stateSnapshot</summary>
                    <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs">
                      {JSON.stringify(result?.stateSnapshot, null, 2)}
                    </pre>
                  </details>
                ) : null}
                {showTracePanel && result?.kernelImplementationRef !== undefined ? (
                  <details className="rounded-md border bg-background px-3 py-2">
                    <summary className="cursor-pointer select-none text-xs text-muted-foreground">kernelImplementationRef</summary>
                    <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs">
                      {JSON.stringify(result.kernelImplementationRef, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </div>
            ) : (
              <div className="text-muted-foreground">{t.noResult}</div>
            )}
          </div>
        ) : activePanel === 'console' ? (
          <div className="rounded-lg border bg-muted/30 p-3">
            {sandboxState?.logs && sandboxState.logs.length > 0 ? (
              <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
                {sandboxState.logs
                  .slice(-200)
                  .map((l) => `[${l.level}] ${l.args.map(getConsoleLine).join(' ')}\n`)
                  .join('')}
              </pre>
            ) : (
              <div className="text-sm text-muted-foreground">{t.noResult}</div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/30 p-3">
            {sandboxState?.traces && sandboxState.traces.length > 0 ? (
              <div className="space-y-2">
                {sandboxState.traces.slice(-200).map((span) => {
                  const duration =
                    typeof span.endTime === 'number' && Number.isFinite(span.endTime) ? Math.max(0, span.endTime - span.startTime) : null
                  return (
                    <details key={span.spanId} className="rounded-md border bg-background px-3 py-2">
                      <summary className="cursor-pointer select-none text-xs">
                        <span className="font-mono">{span.status}</span>
                        <span className="ml-2 font-medium">{span.name || span.spanId}</span>
                        {duration !== null ? <span className="ml-2 text-muted-foreground">({duration}ms)</span> : null}
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs">
                        {JSON.stringify(span, null, 2)}
                      </pre>
                    </details>
                  )
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">{t.noResult}</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
