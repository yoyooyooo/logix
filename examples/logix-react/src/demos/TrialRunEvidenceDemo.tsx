import React from 'react'
import { Context, Effect, Exit, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'

const State = Schema.Struct({
  a: Schema.Number,
  derivedA: Schema.Number,
})

const Actions = {
  noop: Schema.Void,
}

const TrialRunDef = Logix.Module.make('TrialRunEvidenceDemo', {
  state: State,
  actions: Actions,
  reducers: { noop: (s: any) => s },
  traits: Logix.StateTrait.from(State)({
    derivedA: Logix.StateTrait.computed({
      deps: ['a'],
      get: (a) => a + 1,
    }),
  }),
})

const TrialRunModule = TrialRunDef.implement({
  initial: { a: 0, derivedA: 1 },
  logics: [],
})

export const TrialRunEvidenceDemo: React.FC = () => {
  const [running, setRunning] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [evidenceJson, setEvidenceJson] = React.useState<string>('(尚未运行)')

  const onRun = React.useCallback(() => {
    setRunning(true)
    setError(null)

    const runId = `run-browser-${Date.now()}`

    const program = Effect.gen(function* () {
      const ctx = yield* TrialRunModule.impl.layer.pipe(Layer.build)
      const runtime = Context.get(ctx, TrialRunDef.tag)

      yield* runtime.dispatch({ _tag: 'noop', payload: undefined })
      yield* Effect.yieldNow()

      return runtime.instanceId as string
    })

    Effect.runPromise(
      Effect.scoped(
        Logix.Observability.trialRun(program, {
          runId,
          source: { host: 'browser', label: 'TrialRunEvidenceDemo' },
          diagnosticsLevel: 'full',
          runtimeServicesInstanceOverrides: {
            txnQueue: { implId: 'trace', notes: 'demo: browser instance override' },
          },
          maxEvents: 300,
        }),
      ),
    )
      .then((result) => {
        if (Exit.isFailure(result.exit)) {
          setError(`trialRun failed: ${String(result.exit)}`)
        }
        setEvidenceJson(JSON.stringify(result.evidence.summary ?? {}, null, 2))
      })
      .catch((err) => {
        setError(String(err))
      })
      .finally(() => {
        setRunning(false)
      })
  }, [])

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">TrialRun Evidence Demo</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            在浏览器中运行一次受控试跑，导出 EvidencePackage.summary（含 runtime.services 与 converge 静态 IR）
          </p>
        </div>
        <button
          type="button"
          disabled={running}
          onClick={onRun}
          className="px-3 py-2 rounded-md text-sm font-medium bg-blue-600 text-white disabled:opacity-50"
        >
          {running ? 'Running…' : 'Run Trial'}
        </button>
      </div>

      {error ? <div className="text-sm text-red-600 dark:text-red-300 font-mono">{error}</div> : null}

      <div>
        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Evidence Summary (JSON)
        </div>
        <pre className="text-xs bg-gray-50 dark:bg-gray-800 rounded p-3 overflow-auto max-h-[calc(100vh-200px)]">
          {evidenceJson}
        </pre>
      </div>
    </div>
  )
}
