import { makeCliError } from '../errors.js'
import { assertRegisteredReasonCode, type RegisteredReasonCode } from '../protocol/reasonCatalog.js'

export type VerifyGateScope = 'runtime' | 'governance'

export const VERIFY_GATES_RUNTIME = [
  'gate:type',
  'gate:lint',
  'gate:test',
  'gate:control-surface-artifact',
  'gate:diagnostics-protocol',
] as const

export const VERIFY_GATES_GOVERNANCE = ['gate:perf-hard', 'gate:ssot-drift', 'gate:migration-forward-only'] as const

export const VERIFY_GATES = [...VERIFY_GATES_RUNTIME, ...VERIFY_GATES_GOVERNANCE] as const

export type VerifyGate = (typeof VERIFY_GATES)[number]

export type VerifyGateStatus = 'pass' | 'fail' | 'retryable' | 'skipped'

export type VerifyGateResult = {
  readonly gate: VerifyGate
  readonly status: VerifyGateStatus
  readonly durationMs: number
  readonly reasonCode?: string
  readonly command?: string
  readonly exitCode?: number
}

const SCOPE_GATES: Record<VerifyGateScope, ReadonlyArray<VerifyGate>> = {
  runtime: VERIFY_GATES_RUNTIME,
  governance: VERIFY_GATES_GOVERNANCE,
}

const GATE_FAILURE_REASON_CODE: Record<VerifyGate, RegisteredReasonCode> = {
  'gate:type': 'GATE_TYPE_FAILED',
  'gate:lint': 'GATE_LINT_FAILED',
  'gate:test': 'GATE_TEST_FAILED',
  'gate:control-surface-artifact': 'GATE_CONTROL_SURFACE_ARTIFACT_FAILED',
  'gate:diagnostics-protocol': 'GATE_DIAGNOSTICS_FAILED',
  'gate:perf-hard': 'GATE_PERF_HARD_FAILED',
  'gate:ssot-drift': 'GATE_SSOT_DRIFT_FAILED',
  'gate:migration-forward-only': 'GATE_MIGRATION_FORWARD_ONLY_FAILED',
}

const GATE_ORDER_INDEX: Record<VerifyGate, number> = (() => {
  const table: Partial<Record<VerifyGate, number>> = {}
  for (const [index, gate] of VERIFY_GATES.entries()) table[gate] = index
  return table as Record<VerifyGate, number>
})()

const coerceDurationMs = (value: number): number => {
  if (!Number.isFinite(value) || value < 0) return 0
  return Math.round(value)
}

const coerceExitCode = (value: number | undefined): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  const normalized = Math.round(value)
  return normalized >= 0 ? normalized : undefined
}

const assertKnownGate = (gate: string): VerifyGate => {
  if ((VERIFY_GATES as readonly string[]).includes(gate)) return gate as VerifyGate
  throw makeCliError({
    code: 'CLI_PROTOCOL_VIOLATION',
    message: `[Logix][CLI] 未知 verify gate：${gate}`,
  })
}

const assertKnownGateStatus = (status: string): VerifyGateStatus => {
  if (status === 'pass' || status === 'fail' || status === 'retryable' || status === 'skipped') return status
  throw makeCliError({
    code: 'CLI_PROTOCOL_VIOLATION',
    message: `[Logix][CLI] 未知 gate 状态：${status}`,
  })
}

const normalizeReasonCode = (status: VerifyGateStatus, gate: VerifyGate, reasonCode: string | undefined): string | undefined => {
  if (status === 'fail') {
    return reasonCode ? assertRegisteredReasonCode(reasonCode) : GATE_FAILURE_REASON_CODE[gate]
  }
  if (status === 'retryable') {
    return reasonCode ? assertRegisteredReasonCode(reasonCode) : 'VERIFY_RETRYABLE'
  }
  if (typeof reasonCode === 'string' && reasonCode.length > 0) {
    return assertRegisteredReasonCode(reasonCode)
  }
  return undefined
}

const normalizeCommand = (command: string | undefined): string | undefined => {
  if (typeof command !== 'string') return undefined
  const normalized = command.trim()
  return normalized.length > 0 ? normalized : undefined
}

export const listVerifyGates = (scope: VerifyGateScope): ReadonlyArray<VerifyGate> => SCOPE_GATES[scope]

export const isGateInScope = (scope: VerifyGateScope, gate: VerifyGate): boolean => SCOPE_GATES[scope].includes(gate)

export const assertGateInScope = (scope: VerifyGateScope, gate: VerifyGate): void => {
  if (isGateInScope(scope, gate)) return
  throw makeCliError({
    code: 'CLI_PROTOCOL_VIOLATION',
    message: `[Logix][CLI] gateScope=${scope} 不允许 gate=${gate}`,
  })
}

export const compareVerifyGateOrder = (left: VerifyGate, right: VerifyGate): number =>
  GATE_ORDER_INDEX[left] - GATE_ORDER_INDEX[right]

export const gateFailureReasonCode = (gate: VerifyGate): RegisteredReasonCode => GATE_FAILURE_REASON_CODE[gate]

export const normalizeGateResults = (args: {
  readonly scope: VerifyGateScope
  readonly gateResults: ReadonlyArray<{
    readonly gate: string
    readonly status: string
    readonly durationMs: number
    readonly reasonCode?: string
    readonly command?: string
    readonly exitCode?: number
  }>
}): ReadonlyArray<VerifyGateResult> => {
  const seen = new Set<VerifyGate>()
  const out: VerifyGateResult[] = []

  for (const gateResult of args.gateResults) {
    const gate = assertKnownGate(gateResult.gate)
    const status = assertKnownGateStatus(gateResult.status)
    assertGateInScope(args.scope, gate)
    if (seen.has(gate)) {
      throw makeCliError({
        code: 'CLI_PROTOCOL_VIOLATION',
        message: `[Logix][CLI] gate 重复：${gate}`,
      })
    }
    seen.add(gate)
    const reasonCode = normalizeReasonCode(status, gate, gateResult.reasonCode)
    const command = normalizeCommand(gateResult.command)
    const exitCode = coerceExitCode(gateResult.exitCode)
    out.push({
      gate,
      status,
      durationMs: coerceDurationMs(gateResult.durationMs),
      ...(reasonCode ? { reasonCode } : null),
      ...(command ? { command } : null),
      ...(typeof exitCode === 'number' ? { exitCode } : null),
    })
  }

  out.sort((a, b) => compareVerifyGateOrder(a.gate, b.gate))
  return out
}
