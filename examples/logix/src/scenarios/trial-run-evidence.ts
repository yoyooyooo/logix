/**
 * @scenario Runtime Trial · Control Plane Shell
 * @description
 *   演示最小 `runtime.trial` 邻接样例：
 *   - 构造 runtime 并执行一次轻量试跑
 *   - 导出标准化 control-plane shell
 *   - 对关键 shell 字段做最小校验
 *
 * 运行：
 *   pnpm -C examples/logix exec tsx src/scenarios/trial-run-evidence.ts
 */
import { Effect, Exit, Layer, Schema, ServiceMap } from 'effect'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import * as Logix from '@logixjs/core'

const State = Schema.Struct({
  a: Schema.Number,
  derivedA: Schema.Number,
})

const Actions = {
  noop: Schema.Void,
}

const TrialRun = Logix.Module.make('TrialRunEvidence', {
  state: State,
  actions: Actions,
  reducers: { noop: (s: any) => s },
})

const TrialRunFields = FieldContracts.fieldFrom(State)({
  derivedA: FieldContracts.fieldComputed({
    deps: ['a'],
    get: (a) => a + 1,
  }),
})

const TrialRunFieldsLogic = TrialRun.logic('trial-run-evidence-fields', ($) => {
  $.fields(TrialRunFields)
  return Effect.void
})

const TrialRunProgram = Logix.Program.make(TrialRun, {
  initial: { a: 0, derivedA: 1 },
  logics: [TrialRunFieldsLogic],
})

const main = Effect.gen(function* () {
  const result = yield* Logix.Runtime.trial(TrialRunProgram, {
    runId: 'run-node-trial-1',
    buildEnv: { hostKind: 'node', config: {} },
    diagnosticsLevel: 'full',
    maxEvents: 200,
  })

  if (result.verdict !== 'PASS') {
    // eslint-disable-next-line no-console
    console.error('[TrialRun] program failed:', result.errorCode)
  }

  // eslint-disable-next-line no-console
  console.log('[TrialRun] verdict:', result.verdict)
  // eslint-disable-next-line no-console
  console.log('[TrialRun] runId:', (result.environment as any)?.runId)
  // eslint-disable-next-line no-console
  console.log('[TrialRun] summary:', result.summary)
  // eslint-disable-next-line no-console
  console.log('[TrialRun] artifacts:', JSON.stringify(result.artifacts ?? [], null, 2))
})

Effect.runPromise(main as any).catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
