import { makeCliError } from '../errors.js'

export type TxnPhase =
  | 'parse'
  | 'normalize'
  | 'validate'
  | 'execute.plan'
  | 'execute.effect'
  | 'emit'
  | 'verify-loop.gate-run'

type TxnPolicy = {
  readonly inTxn: boolean
  readonly allowIo: boolean
}

export type TxnGuardEvent = {
  readonly schemaVersion: 1
  readonly kind: 'TxnGuardEvent'
  readonly event: 'txn.io.blocked'
  readonly phase: TxnPhase
  readonly ioIntent: 'read' | 'write'
  readonly code: 'CLI_VIOLATION_TXN_IO'
}

export type TxnGuardRecorder = (event: TxnGuardEvent) => void

const PHASE_POLICY: Record<TxnPhase, TxnPolicy> = {
  parse: { inTxn: false, allowIo: true },
  normalize: { inTxn: true, allowIo: false },
  validate: { inTxn: true, allowIo: false },
  'execute.plan': { inTxn: true, allowIo: false },
  'execute.effect': { inTxn: false, allowIo: true },
  emit: { inTxn: false, allowIo: true },
  'verify-loop.gate-run': { inTxn: false, allowIo: true },
}

export const getTxnPhasePolicy = (phase: TxnPhase): TxnPolicy => PHASE_POLICY[phase]

export const assertTxnIoAllowed = (
  phase: TxnPhase,
  ioIntent: 'read' | 'write',
  recorder?: TxnGuardRecorder,
): void => {
  const policy = getTxnPhasePolicy(phase)
  if (policy.allowIo) return
  recorder?.({
    schemaVersion: 1,
    kind: 'TxnGuardEvent',
    event: 'txn.io.blocked',
    phase,
    ioIntent,
    code: 'CLI_VIOLATION_TXN_IO',
  })
  throw makeCliError({
    code: 'CLI_VIOLATION_TXN_IO',
    message: `[Logix][CLI] 事务窗口禁止 IO（phase=${phase}, io=${ioIntent}）`,
  })
}

export const withTxnIoGuard = <A>(
  phase: TxnPhase,
  ioIntent: 'read' | 'write',
  thunk: () => A,
  recorder?: TxnGuardRecorder,
): A => {
  assertTxnIoAllowed(phase, ioIntent, recorder)
  return thunk()
}
