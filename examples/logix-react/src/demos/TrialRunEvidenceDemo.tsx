import React from 'react'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'

const State = Schema.Struct({
  a: Schema.Number,
  derivedA: Schema.Number,
})

const Actions = {
  noop: Schema.Void,
}

const TrialRun = Logix.Module.make('TrialRunEvidenceDemo', {
  state: State,
  actions: Actions,
})

const TrialRunFields = FieldContracts.fieldFrom(State)({
  derivedA: FieldContracts.fieldComputed({
    deps: ['a'],
    get: (a) => a + 1,
  }),
})

const TrialRunFieldsLogic = TrialRun.logic('trial-run-evidence-demo-fields', ($) => {
  $.fields(TrialRunFields)
  return Effect.void
})

const TrialRunProgram = Logix.Program.make(TrialRun, {
  initial: { a: 0, derivedA: 1 },
  logics: [TrialRunFieldsLogic],
})

export const TrialRunEvidenceDemo: React.FC = () => {
  const [running, setRunning] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [reportJson, setReportJson] = React.useState<string>('(尚未运行)')

  const onRun = React.useCallback(() => {
    setRunning(true)
    setError(null)

    const runId = `run-browser-${Date.now()}`

    Effect.runPromise(
      Logix.Runtime.trial(TrialRunProgram, {
        runId,
        buildEnv: { hostKind: 'browser', config: {} },
        diagnosticsLevel: 'full',
        maxEvents: 300,
      }).pipe(Effect.orDie),
    )
      .then((result) => {
        if (result.verdict !== 'PASS') {
          setError(`trial failed: ${String(result.errorCode)}`)
        }
        setReportJson(JSON.stringify(result, null, 2))
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
            在浏览器中运行一次受控试跑，查看 standardized control-plane report shell
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
          Trial Report (JSON)
        </div>
        <pre className="text-xs bg-gray-50 dark:bg-gray-800 rounded p-3 overflow-auto max-h-[calc(100vh-200px)]">
          {reportJson}
        </pre>
      </div>
    </div>
  )
}
