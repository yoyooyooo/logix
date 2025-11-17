import React, { useEffect, useMemo, useRef } from 'react'
import { useDispatch, useModule, useSelector } from '@logix/react'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Input } from '../components/ui/input'
import { IrDef } from './IrModule'

type TrialRunArtifacts = Record<string, any>

const jsonPretty = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2)
  } catch (e) {
    return `<<json stringify failed: ${String(e)}>>`
  }
}

const downloadJson = (filename: string, value: unknown): void => {
  const blob = new Blob([jsonPretty(value)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const copyJson = async (value: unknown): Promise<void> => {
  const text = jsonPretty(value)
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.left = '-9999px'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
}

export function ArtifactsPanel({ artifacts }: { artifacts: unknown }) {
  const runtime = useModule(IrDef)
  const dispatch = useDispatch(runtime)

  const filter = useSelector(runtime, (s) => s.artifactsFilter)
  const copiedKey = useSelector(runtime, (s) => s.copiedArtifactKey)
  const clearTimerRef = useRef<number | null>(null)

  const map: TrialRunArtifacts | undefined =
    artifacts && typeof artifacts === 'object' && !Array.isArray(artifacts) ? (artifacts as any) : undefined

  const keys = useMemo(() => {
    const all = map ? Object.keys(map) : []
    const q = filter.trim()
    return (q ? all.filter((k) => k.includes(q)) : all).sort((a, b) => a.localeCompare(b))
  }, [map, filter])

  if (!map || keys.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Artifacts</CardTitle>
          <CardDescription>未加载 / 为空</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  useEffect(() => {
    return () => {
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current)
      }
    }
  }, [])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Artifacts</CardTitle>
          <CardDescription>TrialRunReport.artifacts（按 artifactKey 分组）</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={filter}
              onChange={(e) => dispatch({ _tag: 'setArtifactsFilter', payload: e.target.value })}
              placeholder="filter by key…"
              className="w-[260px]"
            />
            <Button size="sm" variant="secondary" onClick={() => downloadJson('trialrun-artifacts.json', map)}>
              Download All
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                dispatch({ _tag: 'markCopiedArtifact', payload: 'ALL' })
                void copyJson(map).finally(() => {
                  if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
                  clearTimerRef.current = window.setTimeout(
                    () => dispatch({ _tag: 'clearCopiedArtifact', payload: undefined }),
                    800,
                  )
                })
              }}
            >
              Copy All
            </Button>
            {copiedKey ? <span className="text-xs text-zinc-500">copied: {copiedKey}</span> : null}
          </div>
        </CardContent>
      </Card>

      {keys.map((key) => {
        const env = (map as any)[key]
        const ok = Boolean(env?.ok)
        const truncated = Boolean(env?.truncated)
        const badge: 'info' | 'risky' | 'breaking' | 'outline' = ok ? (truncated ? 'risky' : 'info') : 'breaking'
        return (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{key}</span>
                  <Badge variant={badge}>{ok ? (truncated ? 'TRUNCATED' : 'OK') : 'FAILED'}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const payload = ok ? env?.value : env
                      downloadJson(`${key.replace(/\//g, '_')}.json`, payload)
                    }}
                  >
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const payload = ok ? env?.value : env
                      dispatch({ _tag: 'markCopiedArtifact', payload: key })
                      void copyJson(payload).finally(() => {
                        if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
                        clearTimerRef.current = window.setTimeout(
                          () => dispatch({ _tag: 'clearCopiedArtifact', payload: undefined }),
                          800,
                        )
                      })
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                budget={env?.budgetBytes ?? '—'} actual={env?.actualBytes ?? '—'} digest={env?.digest ?? '—'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!ok && env?.error ? (
                <Alert className="mb-3 border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10">
                  <AlertTitle>{env?.error?.code ?? 'Error'}</AlertTitle>
                  <AlertDescription>
                    <div className="text-xs">{env?.error?.message}</div>
                    {env?.error?.hint ? (
                      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{env?.error?.hint}</div>
                    ) : null}
                  </AlertDescription>
                </Alert>
              ) : null}

              <pre className="whitespace-pre-wrap rounded-md bg-zinc-950 p-4 text-xs text-zinc-100 overflow-auto">
                {jsonPretty(ok ? env?.value : env)}
              </pre>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
