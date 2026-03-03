import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { gateFailureReasonCode, listVerifyGates, type VerifyGate, type VerifyGateResult, type VerifyGateScope } from './gates.js'
import { classifyTransientError } from './transientClassifier.js'

const DEFAULT_REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..')
const VERIFY_TARGET_ALIAS: Readonly<Record<string, string>> = {
  'examples:real': 'examples/logix',
}

const GATE_COMMANDS: Readonly<Record<VerifyGate, ReadonlyArray<string>>> = {
  'gate:type': ['pnpm', 'typecheck'],
  'gate:lint': ['pnpm', 'lint'],
  'gate:test': ['pnpm', 'test:turbo'],
  'gate:control-surface-artifact': ['pnpm', '-C', 'packages/logix-cli', 'test'],
  'gate:diagnostics-protocol': ['pnpm', '-C', 'packages/logix-cli', 'test', '--', 'test/Contracts'],
  'gate:perf-hard': ['pnpm', 'run', 'check:perf-evidence'],
  'gate:ssot-drift': ['pnpm', 'run', 'check:ssot-alignment'],
  'gate:migration-forward-only': ['pnpm', 'run', 'check:forward-evolution'],
}

const shellQuote = (value: string): string => (/^[a-zA-Z0-9._:/=-]+$/u.test(value) ? value : JSON.stringify(value))

const formatCommand = (command: ReadonlyArray<string>): string => command.map((part) => shellQuote(part)).join(' ')

const gateCommand = (gate: VerifyGate): ReadonlyArray<string> => GATE_COMMANDS[gate]

const resolveRepoRoot = (): string => {
  const marker = path.join(DEFAULT_REPO_ROOT, 'pnpm-workspace.yaml')
  if (fs.existsSync(marker)) return DEFAULT_REPO_ROOT
  return process.cwd()
}

export const resolveVerifyTargetPath = (target: string, repoRoot: string): string => {
  const normalized = target.trim().toLowerCase()
  const aliased = VERIFY_TARGET_ALIAS[normalized] ?? target
  return path.resolve(repoRoot, aliased)
}

export const resolveVerifyExecutionCwd = (targetPath: string): string => {
  const stats = fs.statSync(targetPath)
  return stats.isDirectory() ? targetPath : path.dirname(targetPath)
}

const durationSince = (startMs: number): number => Math.max(0, Date.now() - startMs)

const toExitCode = (status: number | null): number => (typeof status === 'number' && status >= 0 ? status : 1)

const isTransientExecutionFailure = (args: {
  readonly exitCode: number
  readonly stdout: string | null
  readonly stderr: string | null
  readonly error?: unknown
}): boolean => {
  if (typeof args.error !== 'undefined') {
    return classifyTransientError(args.error).isTransient
  }
  if (args.exitCode === 75) return true
  const merged = [args.stderr ?? '', args.stdout ?? ''].filter((part) => part.trim().length > 0).join('\n')
  if (merged.length === 0) return false
  return classifyTransientError({ message: merged }).isTransient
}

const makeSkippedResult = (gate: VerifyGate): VerifyGateResult => ({
  gate,
  status: 'skipped',
  durationMs: 0,
  command: formatCommand(gateCommand(gate)),
  exitCode: 0,
})

const makeTargetMissingResults = (args: {
  readonly scope: VerifyGateScope
  readonly targetPath: string
}): ReadonlyArray<VerifyGateResult> => {
  const gates = listVerifyGates(args.scope)
  const failedGate = gates[0]!
  const probeCommand = `test -e ${shellQuote(args.targetPath)}`
  return gates.map((gate) =>
    gate === failedGate
      ? {
          gate,
          status: 'fail',
          durationMs: 0,
          reasonCode: gateFailureReasonCode(gate),
          command: probeCommand,
          exitCode: 1,
        }
      : makeSkippedResult(gate),
  )
}

const runGate = (args: {
  readonly gate: VerifyGate
  readonly cwd: string
}): VerifyGateResult => {
  const command = gateCommand(args.gate)
  const startedAt = Date.now()
  const run = spawnSync(command[0]!, command.slice(1), {
    cwd: args.cwd,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  })
  const durationMs = durationSince(startedAt)

  if (run.error) {
    if (
      isTransientExecutionFailure({
        exitCode: 1,
        stdout: run.stdout,
        stderr: run.stderr,
        error: run.error,
      })
    ) {
      return {
        gate: args.gate,
        status: 'retryable',
        durationMs,
        reasonCode: 'VERIFY_RETRYABLE',
        command: formatCommand(command),
        exitCode: 75,
      }
    }
    return {
      gate: args.gate,
      status: 'fail',
      durationMs,
      reasonCode: gateFailureReasonCode(args.gate),
      command: formatCommand(command),
      exitCode: 1,
    }
  }

  const exitCode = toExitCode(run.status)
  if (exitCode === 0) {
    return {
      gate: args.gate,
      status: 'pass',
      durationMs,
      command: formatCommand(command),
      exitCode,
    }
  }

  if (
    isTransientExecutionFailure({
      exitCode,
      stdout: run.stdout,
      stderr: run.stderr,
    })
  ) {
    return {
      gate: args.gate,
      status: 'retryable',
      durationMs,
      reasonCode: 'VERIFY_RETRYABLE',
      command: formatCommand(command),
      exitCode,
    }
  }

  return {
    gate: args.gate,
    status: 'fail',
    durationMs,
    reasonCode: gateFailureReasonCode(args.gate),
    command: formatCommand(command),
    exitCode,
  }
}

export const runVerifyGateExecutor = (args: {
  readonly scope: VerifyGateScope
  readonly target: string
}): ReadonlyArray<VerifyGateResult> => {
  const repoRoot = resolveRepoRoot()
  const targetPath = resolveVerifyTargetPath(args.target, repoRoot)

  if (!fs.existsSync(targetPath)) {
    return makeTargetMissingResults({ scope: args.scope, targetPath })
  }

  const gates = listVerifyGates(args.scope)
  const results: VerifyGateResult[] = []
  const executionCwd = resolveVerifyExecutionCwd(targetPath)

  for (let index = 0; index < gates.length; index += 1) {
    const gate = gates[index]!
    const gateCwd = args.scope === 'runtime' ? executionCwd : repoRoot
    const gateResult = runGate({
      gate,
      cwd: gateCwd,
    })
    results.push(gateResult)
    if (gateResult.status === 'pass') continue

    for (let pending = index + 1; pending < gates.length; pending += 1) {
      results.push(makeSkippedResult(gates[pending]!))
    }
    break
  }

  return results
}
