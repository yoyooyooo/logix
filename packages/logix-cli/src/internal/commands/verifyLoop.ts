import path from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'

import { Effect } from 'effect'

import { makeArtifactOutput } from '../artifacts.js'
import type { CliInvocation, VerifyLoopExecutor } from '../args.js'
import { asSerializableErrorSummary, makeCliError } from '../errors.js'
import { resolveVerifyLoopIdentity } from '../protocol/identityDriftGuard.js'
import { assertVerifyLoopReportV1Schema } from '../protocol/schemaValidation.js'
import { buildVerifyLoopReasonTrajectory } from '../protocol/trajectory.js'
import type { ControlEvent } from '../protocol/types.js'
import type { CommandResult } from '../result.js'
import { makeCommandResult, type ArtifactOutput } from '../result.js'
import { gateFailureReasonCode, listVerifyGates, type VerifyGate, type VerifyGateResult, type VerifyGateScope } from '../verify-loop/gates.js'
import { runVerifyGateExecutor } from '../verify-loop/realGateExecutor.js'
import { makeVerifyLoopReport } from '../verify-loop/report.js'
import { makeRetrySignature } from '../verify-loop/retryPolicy.js'
import { evaluateVerifyLoopState } from '../verify-loop/stateMachine.js'

type VerifyLoopInvocation = Extract<CliInvocation, { readonly command: 'verify-loop' }>

type FixtureScenario = 'pass' | 'violation' | 'retryable' | 'no-progress' | 'transient' | 'not-implemented'

const FIXTURE_SCENARIO_PREFIX = 'fixture:'

const isFixtureScenario = (value: string): value is FixtureScenario =>
  value === 'pass' ||
  value === 'violation' ||
  value === 'retryable' ||
  value === 'no-progress' ||
  value === 'transient' ||
  value === 'not-implemented'

const parseFixtureScenario = (target: string): FixtureScenario | undefined => {
  if (!target.startsWith(FIXTURE_SCENARIO_PREFIX)) return undefined
  const raw = target.slice(FIXTURE_SCENARIO_PREFIX.length).trim().toLowerCase()
  if (!isFixtureScenario(raw)) {
    throw makeCliError({
      code: 'CLI_INVALID_ARGUMENT',
      message: `[Logix][CLI] 未知 verify-loop fixture 场景：${raw}`,
    })
  }
  return raw
}

const preferredGate = (gates: ReadonlyArray<VerifyGate>): VerifyGate => gates.find((gate) => gate === 'gate:test') ?? gates[0]!

const fixtureCommand = (scenario: FixtureScenario, gate: VerifyGate): string => `fixture:${scenario}:${gate}`

const passGateResults = (gates: ReadonlyArray<VerifyGate>, scenario: FixtureScenario): ReadonlyArray<VerifyGateResult> =>
  gates.map((gate, index) => ({
    gate,
    status: 'pass',
    durationMs: index + 1,
    command: fixtureCommand(scenario, gate),
    exitCode: 0,
  }))

const skippedGateResults = (gates: ReadonlyArray<VerifyGate>, scenario: FixtureScenario): ReadonlyArray<VerifyGateResult> =>
  gates.map((gate) => ({
    gate,
    status: 'skipped',
    durationMs: 0,
    command: fixtureCommand(scenario, gate),
    exitCode: 0,
  }))

const toVerifyGateResults = (args: {
  readonly scope: VerifyGateScope
  readonly gates: ReadonlyArray<VerifyGate>
  readonly scenario: FixtureScenario
}): ReadonlyArray<VerifyGateResult> => {
  switch (args.scenario) {
    case 'pass':
    case 'transient':
      return passGateResults(args.gates, args.scenario)
    case 'not-implemented':
      return skippedGateResults(args.gates, args.scenario)
    case 'violation': {
      const gate = preferredGate(args.gates)
      return args.gates.map((item, index) =>
        item === gate
          ? {
              gate: item,
              status: 'fail',
              durationMs: index + 1,
              reasonCode: gateFailureReasonCode(item),
              command: fixtureCommand(args.scenario, item),
              exitCode: 2,
            }
          : { gate: item, status: 'pass', durationMs: index + 1, command: fixtureCommand(args.scenario, item), exitCode: 0 },
      )
    }
    case 'retryable':
    case 'no-progress': {
      const gate = preferredGate(args.gates)
      return args.gates.map((item, index) =>
        item === gate
          ? {
              gate: item,
              status: 'retryable',
              durationMs: index + 1,
              reasonCode: 'VERIFY_RETRYABLE',
              command: fixtureCommand(args.scenario, item),
              exitCode: 75,
            }
          : { gate: item, status: 'pass', durationMs: index + 1, command: fixtureCommand(args.scenario, item), exitCode: 0 },
      )
    }
  }
}

const makeControlEvents = (args: {
  readonly runId: string
  readonly instanceId: string
  readonly txnSeq: number
  readonly opSeq: number
  readonly attemptSeq: number
  readonly reasonCode: string
  readonly ok: boolean
  readonly gateResults: ReadonlyArray<VerifyGateResult>
}): ReadonlyArray<ControlEvent> => {
  const fixedPayload = {
    command: 'verify-loop',
    reasonCode: args.reasonCode,
    ok: args.ok,
  } as const

  const executeEvents = args.gateResults.map(
    (gateResult): Pick<ControlEvent, 'event' | 'payload'> => ({
      event: 'execute.completed',
      payload: {
        ...fixedPayload,
        gate: gateResult.gate,
        status: gateResult.status,
        durationMs: gateResult.durationMs,
        ...(gateResult.reasonCode ? { gateReasonCode: gateResult.reasonCode } : null),
      },
    }),
  )

  const staged = [
    { event: 'parse.completed', payload: fixedPayload },
    { event: 'normalize.completed', payload: fixedPayload },
    { event: 'validate.completed', payload: fixedPayload },
    ...executeEvents,
    { event: 'emit.completed', payload: fixedPayload },
  ] as const

  return staged.map(
    (entry, index): ControlEvent => ({
      schemaVersion: 1,
      kind: 'ControlEvent',
      event: entry.event,
      refs: {
        runId: args.runId,
        instanceId: args.instanceId,
        txnSeq: args.txnSeq,
        opSeq: args.opSeq + index,
        attemptSeq: args.attemptSeq,
      },
      payload: entry.payload,
    }),
  )
}

const makeArtifactPath = (outDir: string | undefined, fileName: string): string =>
  outDir ? path.join(outDir, fileName) : `inline://${fileName}`

const makeVerifyError = (reasonCode: string, message: string) =>
  asSerializableErrorSummary(
    makeCliError({
      code: reasonCode,
      message,
    }),
  )

const absolutizeArtifactFile = (args: { readonly outDir?: string; readonly file?: string }): string | undefined => {
  if (typeof args.file !== 'string' || args.file.length === 0) return undefined
  if (path.isAbsolute(args.file)) return args.file
  const outDir = typeof args.outDir === 'string' && args.outDir.length > 0 ? args.outDir : undefined
  if (!outDir) return path.resolve(process.cwd(), args.file)
  return path.resolve(process.cwd(), outDir, args.file)
}

export const runVerifyLoop = (inv: VerifyLoopInvocation): Effect.Effect<CommandResult, never> => {
  const runId = inv.global.runId

  return Effect.gen(function* () {
    const scenario = parseFixtureScenario(inv.target)
    const executor: VerifyLoopExecutor = inv.executor ?? (scenario ? 'fixture' : 'real')
    if (executor === 'fixture' && !scenario) {
      throw makeCliError({
        code: 'CLI_INVALID_ARGUMENT',
        message: '[Logix][CLI] --executor fixture 仅支持 --target fixture:<scenario>',
      })
    }
    const fixtureScenario = executor === 'fixture' ? scenario : undefined
    const providedInstanceId = typeof inv.instanceId === 'string' ? inv.instanceId.trim() : undefined
    const identityResolution = resolveVerifyLoopIdentity({
      mode: inv.mode,
      runId,
      previousRunId: inv.previousRunId,
      providedInstanceId,
    })
    const ids = identityResolution.identity
    const maxAttempts = inv.maxAttempts ?? 3
    const gateScope = inv.gateScope
    const gates = listVerifyGates(gateScope)

    const gateResults = yield* Effect.try({
      try: () =>
        fixtureScenario
          ? toVerifyGateResults({
              scope: gateScope,
              gates,
              scenario: fixtureScenario,
            })
          : runVerifyGateExecutor({ scope: gateScope, target: inv.target }),
      catch: (cause) =>
        makeCliError({
          code: 'CLI_PROTOCOL_VIOLATION',
          message: '[Logix][CLI] verify-loop gate 执行失败',
          cause,
        }),
    })

    const cause =
      fixtureScenario === 'transient'
        ? makeCliError({
            code: 'ECONNRESET',
            message: '[Logix][CLI] transient fault: connection reset by peer',
          })
        : undefined

    const retrySignature = makeRetrySignature({
      verdict: 'RETRYABLE',
      reasonCode: 'VERIFY_RETRYABLE',
      gateResults,
    })

    const retryContext =
      fixtureScenario === 'retryable' || fixtureScenario === 'no-progress' || fixtureScenario === 'transient'
        ? {
            attemptSeq: ids.attemptSeq,
            maxAttempts,
            signature: retrySignature,
            trajectory:
              fixtureScenario === 'no-progress'
                ? [
                    { attemptSeq: Math.max(1, ids.attemptSeq - 2), signature: retrySignature },
                    { attemptSeq: Math.max(1, ids.attemptSeq - 1), signature: retrySignature },
                  ]
                : [],
            ...(fixtureScenario === 'no-progress' ? { noProgressThreshold: 2 } : null),
          }
        : undefined

    const decision = evaluateVerifyLoopState({
      gateResults,
      ...(typeof cause !== 'undefined' ? { cause } : null),
      ...(retryContext ? { retryContext } : null),
    })
    const trajectory = buildVerifyLoopReasonTrajectory({
      mode: inv.mode,
      currentAttemptSeq: ids.attemptSeq,
      currentReasonCode: decision.reasonCode,
      previousAttemptSeq: identityResolution.previousAttemptSeq,
      retryTrajectory: retryContext?.trajectory,
    })
    const report = makeVerifyLoopReport({
      runId,
      instanceId: ids.instanceId,
      mode: inv.mode,
      gateScope,
      ...(inv.previousRunId ? { previousRunId: inv.previousRunId } : null),
      txnSeq: ids.txnSeq,
      opSeq: ids.opSeq,
      attemptSeq: ids.attemptSeq,
      verdict: decision.verdict,
      gateResults,
      reasonCode: decision.reasonCode,
      reasons: decision.reasons,
      trajectory,
      target: inv.target,
      artifacts: [
        { name: 'verify-loop.report.json', path: makeArtifactPath(inv.global.outDir, 'verify-loop.report.json') },
        { name: 'control.events.json', path: makeArtifactPath(inv.global.outDir, 'control.events.json') },
        { name: 'ssot-drift.report.json', path: makeArtifactPath(inv.global.outDir, 'ssot-drift.report.json') },
        { name: 'perf.diff.json', path: makeArtifactPath(inv.global.outDir, 'perf.diff.json') },
      ],
      ext: {
        target: inv.target,
        maxAttempts,
        executor,
        emitNextActions: inv.emitNextActions,
        ...(inv.emitNextActionsOut ? { emitNextActionsOut: inv.emitNextActionsOut } : null),
      },
    })
    assertVerifyLoopReportV1Schema(report)

    const controlEvents = makeControlEvents({
      runId: report.runId,
      instanceId: report.instanceId,
      txnSeq: report.txnSeq,
      opSeq: report.opSeq,
      attemptSeq: report.attemptSeq,
      reasonCode: report.reasonCode,
      ok: report.verdict === 'PASS',
      gateResults: report.gateResults,
    })

    const verifyLoopReportArtifactBase = yield* makeArtifactOutput({
      outDir: inv.global.outDir,
      budgetBytes: inv.global.budgetBytes,
      fileName: 'verify-loop.report.json',
      outputKey: 'verifyLoopReport',
      kind: 'VerifyLoopReport',
      value: report,
      reasonCodes: [report.reasonCode],
    })
    const verifyLoopReportArtifact: ArtifactOutput = {
      ...verifyLoopReportArtifactBase,
      ...(verifyLoopReportArtifactBase.file
        ? { file: absolutizeArtifactFile({ outDir: inv.global.outDir, file: verifyLoopReportArtifactBase.file }) }
        : null),
    }

    const artifacts: ArtifactOutput[] = [
      verifyLoopReportArtifact,
      yield* makeArtifactOutput({
        outDir: inv.global.outDir,
        budgetBytes: inv.global.budgetBytes,
        fileName: 'control.events.json',
        outputKey: 'controlEvents',
        kind: 'ControlEvents',
        value: controlEvents,
        reasonCodes: [report.reasonCode],
      }),
      ...(inv.emitNextActions
        ? [
            yield* makeArtifactOutput({
              outDir: inv.global.outDir,
              budgetBytes: inv.global.budgetBytes,
              fileName: 'next-actions.json',
              outputKey: 'nextActions',
              kind: 'NextActions',
              value: report.nextActions,
              reasonCodes: [report.reasonCode],
            }),
          ]
        : []),
      yield* makeArtifactOutput({
        outDir: inv.global.outDir,
        budgetBytes: inv.global.budgetBytes,
        fileName: 'ssot-drift.report.json',
        outputKey: 'ssotDriftReport',
        kind: 'SsoTDriftReport',
        value: {
          schemaVersion: 1,
          kind: 'SsoTDriftReport',
          gateScope: report.gateScope,
          status: report.gateScope === 'governance' ? 'checked' : 'not-applicable',
        },
      }),
      yield* makeArtifactOutput({
        outDir: inv.global.outDir,
        budgetBytes: inv.global.budgetBytes,
        fileName: 'perf.diff.json',
        outputKey: 'perfDiff',
        kind: 'PerfDiff',
        value: {
          schemaVersion: 1,
          kind: 'PerfDiff',
          gateScope: report.gateScope,
          status: report.gateScope === 'governance' ? 'checked' : 'not-applicable',
        },
      }),
    ]

    if (inv.emitNextActions && typeof inv.emitNextActionsOut === 'string' && inv.emitNextActionsOut.trim().length > 0) {
      const emitPath = path.resolve(inv.emitNextActionsOut)
      yield* Effect.tryPromise({
        try: async () => {
          await mkdir(path.dirname(emitPath), { recursive: true })
          await writeFile(emitPath, `${JSON.stringify(report.nextActions, null, 2)}\n`, 'utf8')
        },
        catch: (cause) =>
          makeCliError({
            code: 'CLI_COMMAND_FAILED',
            message: `[Logix][CLI] verify-loop 写出 next-actions 失败：${emitPath}`,
            cause,
          }),
      })
    }

    if (report.verdict === 'PASS') {
      return makeCommandResult({
        runId,
        command: 'verify-loop',
        ok: true,
        exitCode: report.exitCode,
        artifacts,
      })
    }

    const firstReason = report.reasons[0]?.message ?? `[Logix][CLI] verify-loop 未通过（reason=${report.reasonCode}）`
    return makeCommandResult({
      runId,
      command: 'verify-loop',
      ok: false,
      exitCode: report.exitCode,
      artifacts,
      error: makeVerifyError(report.reasonCode, firstReason),
    })
  }).pipe(
    Effect.catchAll((cause) =>
      Effect.succeed(
        makeCommandResult({
          runId,
          command: 'verify-loop',
          ok: false,
          artifacts: [],
          error: asSerializableErrorSummary(cause),
        }),
      ),
    ),
  )
}
