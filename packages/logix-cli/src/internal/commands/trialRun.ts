import * as Logix from '@logixjs/core'
import { Effect, Either } from 'effect'

import type { CliInvocation } from '../args.js'
import { makeArtifactOutput } from '../artifacts.js'
import { loadEntryExport } from '../entry.js'
import { asSerializableErrorSummary, makeCliError } from '../errors.js'
import type { ArtifactOutput, CommandResult } from '../result.js'
import { makeCommandResult } from '../result.js'
import { sha256DigestOfJson } from '../stableJson.js'
import type { ControlSurfaceManifest } from './workflowSurface.js'
import { projectEntryControlSurface } from './workflowSurface.js'

type TrialRunInvocation = Extract<CliInvocation, { readonly command: 'trialrun' }>

type TrialRunSummaryReasonCode = Logix.Reflection.TrialRunSummaryReasonCode

type TrialRunSummaryVerdict = Logix.Reflection.TrialRunSummaryVerdict

type TrialRunReport = {
  readonly schemaVersion: 1
  readonly kind: 'TrialRunReport'
  readonly runId: string
  readonly identity: {
    readonly instanceId: string
    readonly txnSeq: 1
    readonly opSeq: 1
  }
  readonly entry: {
    readonly modulePath: string
    readonly exportName: string
    readonly entryRef: string
  }
  readonly manifest: ControlSurfaceManifest
  readonly execution: {
    readonly diagnosticsLevel: TrialRunInvocation['diagnosticsLevel']
    readonly includeTrace: boolean
    readonly emit: TrialRunInvocation['emit']
    readonly host: TrialRunInvocation['global']['host']
    readonly maxEvents?: number
    readonly timeoutMs?: number
  }
  readonly config: ReadonlyArray<{ readonly key: string; readonly value: string | number | boolean }>
  readonly environment: {
    readonly tagIds: ReadonlyArray<string>
    readonly configKeys: ReadonlyArray<string>
    readonly missingServices: ReadonlyArray<string>
    readonly missingConfigKeys: ReadonlyArray<string>
  }
  readonly summary: {
    readonly verdict: TrialRunSummaryVerdict
    readonly reasonCode: TrialRunSummaryReasonCode
    readonly emittedArtifacts: {
      readonly trialRunReport: true
      readonly traceSlim: boolean
      readonly evidence: boolean
    }
    readonly traceEventCount: number
    readonly missingServices: number
    readonly missingConfigKeys: number
    readonly errorCode?: string
  }
  readonly error?: {
    readonly code?: string
    readonly message: string
    readonly hint?: string
  }
}

type TraceSlim = {
  readonly schemaVersion: 1
  readonly kind: 'TraceSlim'
  readonly runId: string
  readonly refs: {
    readonly instanceId: string
    readonly txnSeq: 1
    readonly opSeqStart: 1
  }
  readonly events: ReadonlyArray<{
    readonly seq: number
    readonly opSeq: number
    readonly event: string
    readonly level: 'info'
    readonly refs: {
      readonly instanceId: string
      readonly txnSeq: 1
      readonly opSeq: number
    }
  }>
  readonly summary: {
    readonly eventCount: number
    readonly truncated: false
  }
}

type TrialRunEvidence = {
  readonly schemaVersion: 1
  readonly kind: 'TrialRunEvidence'
  readonly runId: string
  readonly links: {
    readonly trialRunReportDigest: string
    readonly traceSlimDigest: string
  }
  readonly checks: ReadonlyArray<{
    readonly id: 'report-linked' | 'trace-linked'
    readonly ok: true
    readonly reasonCode: 'EVIDENCE_REPORT_LINKED' | 'EVIDENCE_TRACE_LINKED'
  }>
}

const toRuntimeHostKind = (host: TrialRunInvocation['global']['host']): 'node' | 'browser' =>
  host === 'browser-mock' ? 'browser' : 'node'

const withMutedConsole = <A, E, R>(program: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  Effect.suspend(() => {
    const previous = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
    }
    console.log = () => {}
    console.info = () => {}
    console.warn = () => {}
    console.error = () => {}

    return program.pipe(
      Effect.ensuring(
        Effect.sync(() => {
          console.log = previous.log
          console.info = previous.info
          console.warn = previous.warn
          console.error = previous.error
        }),
      ),
    )
  })

const uniqSortedStringArray = (values: ReadonlyArray<string> | undefined): ReadonlyArray<string> =>
  Array.from(new Set((values ?? []).filter((value) => typeof value === 'string' && value.length > 0))).sort()

const toErrorMessage = (cause: unknown): string => {
  if (typeof cause === 'string') return cause
  if (cause instanceof Error) return cause.message
  if (cause && typeof cause === 'object' && 'message' in cause && typeof (cause as any).message === 'string') {
    return String((cause as any).message)
  }
  return ''
}

const parseMissingServicesFromMessage = (message: string): ReadonlyArray<string> => {
  const out: string[] = []
  const re = /Service not found: ([^\s(]+)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(message))) {
    const id = match[1]?.replace(/[,:.;]+$/, '')
    if (typeof id === 'string' && id.length > 0) out.push(id)
  }
  return uniqSortedStringArray(out)
}

const toConfigEntries = (
  config: TrialRunInvocation['config'],
): ReadonlyArray<{ readonly key: string; readonly value: string | number | boolean }> =>
  Object.keys(config)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((key) => ({ key, value: config[key]! }))

const makeFallbackTraceSlim = (runId: string, instanceId: string): TraceSlim => ({
  schemaVersion: 1,
  kind: 'TraceSlim',
  runId,
  refs: {
    instanceId,
    txnSeq: 1,
    opSeqStart: 1,
  },
  events: [
    {
      seq: 1,
      opSeq: 1,
      event: 'trialrun.execute.started',
      level: 'info',
      refs: { instanceId, txnSeq: 1, opSeq: 1 },
    },
    {
      seq: 2,
      opSeq: 2,
      event: 'trialrun.execute.completed',
      level: 'info',
      refs: { instanceId, txnSeq: 1, opSeq: 2 },
    },
  ],
  summary: {
    eventCount: 2,
    truncated: false,
  },
})

const makeTraceSlimFromEvidence = (args: {
  readonly runId: string
  readonly instanceId: string
  readonly evidence?: Logix.Observability.EvidencePackage
}): TraceSlim => {
  const rawEvents = Array.isArray(args.evidence?.events) ? args.evidence.events : []
  const events = rawEvents
    .filter((item): item is { readonly type?: unknown } => typeof item === 'object' && item !== null)
    .map((event, index) => {
      const opSeq = index + 1
      return {
        seq: opSeq,
        opSeq,
        event: typeof event.type === 'string' && event.type.length > 0 ? event.type : 'trialrun.event',
        level: 'info' as const,
        refs: {
          instanceId: args.instanceId,
          txnSeq: 1 as const,
          opSeq,
        },
      }
    })

  if (events.length === 0) {
    return makeFallbackTraceSlim(args.runId, args.instanceId)
  }

  return {
    schemaVersion: 1,
    kind: 'TraceSlim',
    runId: args.runId,
    refs: {
      instanceId: args.instanceId,
      txnSeq: 1,
      opSeqStart: 1,
    },
    events,
    summary: {
      eventCount: events.length,
      truncated: false,
    },
  }
}

const makeTrialRunEvidence = (args: {
  readonly runId: string
  readonly trialRunReport: TrialRunReport
  readonly traceSlim: TraceSlim
}): TrialRunEvidence => ({
  schemaVersion: 1,
  kind: 'TrialRunEvidence',
  runId: args.runId,
  links: {
    trialRunReportDigest: sha256DigestOfJson(args.trialRunReport),
    traceSlimDigest: sha256DigestOfJson(args.traceSlim),
  },
  checks: [
    { id: 'report-linked', ok: true, reasonCode: 'EVIDENCE_REPORT_LINKED' },
    { id: 'trace-linked', ok: true, reasonCode: 'EVIDENCE_TRACE_LINKED' },
  ],
})

const makeTrialRunReport = (args: {
  readonly inv: TrialRunInvocation
  readonly coreReport: Logix.Observability.TrialRunReport
  readonly traceSlim: TraceSlim
  readonly includeEvidence: boolean
}): TrialRunReport => {
  const manifest = projectEntryControlSurface(args.inv.entry).manifest
  const entry = {
    modulePath: args.inv.entry.modulePath,
    exportName: args.inv.entry.exportName,
    entryRef: `${args.inv.entry.modulePath}#${args.inv.entry.exportName}`,
  }
  const summaryReasonCode = Logix.Reflection.pickTrialRunSummaryReasonCode(args.coreReport)
  const summaryVerdict = Logix.Reflection.pickTrialRunSummaryVerdict(summaryReasonCode)
  const shouldReportTraceCount = args.includeEvidence || args.inv.includeTrace

  return {
    schemaVersion: 1,
    kind: 'TrialRunReport',
    runId: args.inv.global.runId,
    identity: {
      // CLI 协议要求稳定标识链：同输入重跑不依赖随机 runtime instanceId。
      instanceId: args.inv.global.runId,
      txnSeq: 1,
      opSeq: 1,
    },
    entry,
    manifest,
    execution: {
      diagnosticsLevel: args.inv.diagnosticsLevel,
      includeTrace: args.inv.includeTrace,
      emit: args.inv.emit,
      host: args.inv.global.host,
      ...(typeof args.inv.maxEvents === 'number' ? { maxEvents: args.inv.maxEvents } : null),
      ...(typeof args.inv.timeoutMs === 'number' ? { timeoutMs: args.inv.timeoutMs } : null),
    },
    config: toConfigEntries(args.inv.config),
    environment: {
      tagIds: uniqSortedStringArray(args.coreReport.environment?.tagIds),
      configKeys: uniqSortedStringArray(args.coreReport.environment?.configKeys),
      missingServices: uniqSortedStringArray(args.coreReport.environment?.missingServices),
      missingConfigKeys: uniqSortedStringArray(args.coreReport.environment?.missingConfigKeys),
    },
    summary: {
      verdict: summaryVerdict,
      reasonCode: summaryReasonCode,
      emittedArtifacts: {
        trialRunReport: true,
        traceSlim: args.includeEvidence,
        evidence: args.includeEvidence,
      },
      traceEventCount: shouldReportTraceCount ? args.traceSlim.summary.eventCount : 0,
      missingServices: (args.coreReport.environment?.missingServices ?? []).length,
      missingConfigKeys: (args.coreReport.environment?.missingConfigKeys ?? []).length,
      ...(typeof args.coreReport.error?.code === 'string' && args.coreReport.error.code.length > 0
        ? { errorCode: args.coreReport.error.code }
        : null),
    },
    ...(args.coreReport.error
      ? {
          error: {
            code: args.coreReport.error.code,
            message: args.coreReport.error.message,
            ...(args.coreReport.error.hint ? { hint: args.coreReport.error.hint } : null),
          },
        }
      : null),
  }
}

const makeEntryLoadFailureReport = (args: {
  readonly inv: TrialRunInvocation
  readonly traceSlim: TraceSlim
  readonly includeEvidence: boolean
  readonly cause: unknown
}): TrialRunReport => {
  const manifest = projectEntryControlSurface(args.inv.entry).manifest
  const entry = {
    modulePath: args.inv.entry.modulePath,
    exportName: args.inv.entry.exportName,
    entryRef: `${args.inv.entry.modulePath}#${args.inv.entry.exportName}`,
  }

  const errorSummary = asSerializableErrorSummary(args.cause)
  const missingServices = parseMissingServicesFromMessage(errorSummary.message)
  const failureInput: Logix.Reflection.TrialRunSummaryInput = {
    ok: false,
    environment: {
      missingServices,
      missingConfigKeys: [],
    },
    error: {
      code: errorSummary.code,
    },
  }
  const reasonCode = Logix.Reflection.pickTrialRunSummaryReasonCode(failureInput)
  const verdict = Logix.Reflection.pickTrialRunSummaryVerdict(reasonCode)
  const shouldReportTraceCount = args.includeEvidence || args.inv.includeTrace

  return {
    schemaVersion: 1,
    kind: 'TrialRunReport',
    runId: args.inv.global.runId,
    identity: {
      instanceId: args.inv.global.runId,
      txnSeq: 1,
      opSeq: 1,
    },
    entry,
    manifest,
    execution: {
      diagnosticsLevel: args.inv.diagnosticsLevel,
      includeTrace: args.inv.includeTrace,
      emit: args.inv.emit,
      host: args.inv.global.host,
      ...(typeof args.inv.maxEvents === 'number' ? { maxEvents: args.inv.maxEvents } : null),
      ...(typeof args.inv.timeoutMs === 'number' ? { timeoutMs: args.inv.timeoutMs } : null),
    },
    config: toConfigEntries(args.inv.config),
    environment: {
      tagIds: [],
      configKeys: [],
      missingServices,
      missingConfigKeys: [],
    },
    summary: {
      verdict,
      reasonCode,
      emittedArtifacts: {
        trialRunReport: true,
        traceSlim: args.includeEvidence,
        evidence: args.includeEvidence,
      },
      traceEventCount: shouldReportTraceCount ? args.traceSlim.summary.eventCount : 0,
      missingServices: missingServices.length,
      missingConfigKeys: 0,
      ...(errorSummary.code ? { errorCode: errorSummary.code } : null),
    },
    error: {
      code: errorSummary.code,
      message: errorSummary.message,
      ...(errorSummary.hint ? { hint: errorSummary.hint } : null),
    },
  }
}

const toTrialRunFailure = (report: Logix.Observability.TrialRunReport) => {
  const missingServices = uniqSortedStringArray(report.environment?.missingServices)
  const missingConfigKeys = uniqSortedStringArray(report.environment?.missingConfigKeys)

  if (missingServices.length > 0 || missingConfigKeys.length > 0) {
    const hintParts: string[] = []
    if (missingServices.length > 0) hintParts.push(`missingServices=${missingServices.join(',')}`)
    if (missingConfigKeys.length > 0) hintParts.push(`missingConfigKeys=${missingConfigKeys.join(',')}`)
    return makeCliError({
      code: 'CLI_INVALID_ARGUMENT',
      message: '[Logix][CLI] trialrun 失败：缺失 Layer/Config 依赖',
      hint: hintParts.length > 0 ? hintParts.join(' | ') : '请补齐依赖后重跑。',
    })
  }

  if (report.error?.code === 'TrialRunTimeout') {
    return makeCliError({
      code: 'CLI_TRIALRUN_TIMEOUT',
      message: '[Logix][CLI] trialrun 失败：执行超时',
      hint: report.error.hint,
    })
  }

  if (report.error?.code === 'DisposeTimeout') {
    return makeCliError({
      code: 'CLI_TRIALRUN_DISPOSE_TIMEOUT',
      message: '[Logix][CLI] trialrun 失败：关闭阶段超时',
      hint: report.error.hint,
    })
  }

  if (report.error) {
    return makeCliError({
      code: 'CLI_TRIALRUN_RUNTIME_FAILURE',
      message: report.error.message,
      hint: report.error.hint,
    })
  }

  return makeCliError({
    code: 'CLI_TRIALRUN_RUNTIME_FAILURE',
    message: '[Logix][CLI] trialrun 失败：未返回可用错误信息',
  })
}

export const runTrialRun = (inv: TrialRunInvocation): Effect.Effect<CommandResult, never> => {
  const runId = inv.global.runId
  const includeEvidence = inv.emit === 'evidence'

  return Effect.gen(function* () {
    const entryExportEither = yield* loadEntryExport({
      entry: inv.entry,
      host: inv.global.host,
    }).pipe(Effect.either)

    if (Either.isLeft(entryExportEither)) {
      const entryLoadError = entryExportEither.left
      const traceSlim: TraceSlim = {
        ...makeFallbackTraceSlim(runId, runId),
        events: [
          {
            seq: 1,
            opSeq: 1,
            event: 'trialrun.entry.load.started',
            level: 'info',
            refs: { instanceId: runId, txnSeq: 1, opSeq: 1 },
          },
          {
            seq: 2,
            opSeq: 2,
            event: 'trialrun.entry.load.failed',
            level: 'info',
            refs: { instanceId: runId, txnSeq: 1, opSeq: 2 },
          },
        ],
        summary: {
          eventCount: 2,
          truncated: false,
        },
      }
      const trialRunReport = makeEntryLoadFailureReport({
        inv,
        traceSlim,
        includeEvidence,
        cause: entryLoadError,
      })
      const evidence = makeTrialRunEvidence({ runId, trialRunReport, traceSlim })
      const entryFailureReasonCodes = Logix.Reflection.collectTrialRunFailureReasonCodes({
        ok: false,
        environment: {
          missingServices: trialRunReport.environment.missingServices,
          missingConfigKeys: trialRunReport.environment.missingConfigKeys,
        },
        error: {
          code: trialRunReport.error?.code,
        },
      })
      const trialRunReasonCodes = Array.from(
        new Set([
          includeEvidence ? 'TRIALRUN_EMIT_EVIDENCE' : 'TRIALRUN_REPORT_ONLY',
          ...entryFailureReasonCodes,
        ]),
      ).sort()

      const artifacts: ArtifactOutput[] = [
        yield* makeArtifactOutput({
          outDir: inv.global.outDir,
          budgetBytes: inv.global.budgetBytes,
          fileName: 'trialrun.report.json',
          outputKey: 'trialRunReport',
          kind: 'TrialRunReport',
          value: trialRunReport,
          reasonCodes: trialRunReasonCodes,
        }),
      ]

      if (includeEvidence) {
        artifacts.push(
          yield* makeArtifactOutput({
            outDir: inv.global.outDir,
            budgetBytes: inv.global.budgetBytes,
            fileName: 'trace.slim.json',
            outputKey: 'traceSlim',
            kind: 'TraceSlim',
            value: traceSlim,
            reasonCodes: ['TRIALRUN_TRACE_EMITTED'],
          }),
        )

        artifacts.push(
          yield* makeArtifactOutput({
            outDir: inv.global.outDir,
            budgetBytes: inv.global.budgetBytes,
            fileName: 'evidence.json',
            outputKey: 'evidence',
            kind: 'TrialRunEvidence',
            value: evidence,
            reasonCodes: ['TRIALRUN_EVIDENCE_EMITTED'],
          }),
        )
      }

      const missingServices = trialRunReport.environment.missingServices
      const mappedError =
        missingServices.length > 0
          ? makeCliError({
              code: 'CLI_INVALID_ARGUMENT',
              message: '[Logix][CLI] trialrun 失败：入口加载阶段检测到缺失 service 依赖',
              hint: `missingServices=${missingServices.join(',')}`,
            })
          : entryLoadError

      return makeCommandResult({
        runId,
        command: 'trialrun',
        ok: false,
        artifacts,
        error: asSerializableErrorSummary(mappedError),
      })
    }

    const entryExport = entryExportEither.right

    const coreReport = yield* withMutedConsole(
      Logix.Observability.trialRunModule(entryExport as any, {
        runId,
        diagnosticsLevel: inv.diagnosticsLevel,
        layer: Logix.Debug.noopLayer,
        ...(typeof inv.maxEvents === 'number' ? { maxEvents: inv.maxEvents } : null),
        ...(typeof inv.timeoutMs === 'number' ? { trialRunTimeoutMs: inv.timeoutMs } : null),
        buildEnv: {
          hostKind: toRuntimeHostKind(inv.global.host),
          config: inv.config,
        },
      }),
    )

    const traceSlim = makeTraceSlimFromEvidence({
      runId,
      instanceId: runId,
      evidence: coreReport.evidence,
    })
    const trialRunReport = makeTrialRunReport({
      inv,
      coreReport,
      traceSlim,
      includeEvidence,
    })
    const evidence = makeTrialRunEvidence({ runId, trialRunReport, traceSlim })

    const trialRunReasonCodes = Array.from(
      new Set([
        includeEvidence ? 'TRIALRUN_EMIT_EVIDENCE' : 'TRIALRUN_REPORT_ONLY',
        ...Logix.Reflection.collectTrialRunFailureReasonCodes(coreReport),
      ]),
    ).sort()

    const artifacts: ArtifactOutput[] = [
      yield* makeArtifactOutput({
        outDir: inv.global.outDir,
        budgetBytes: inv.global.budgetBytes,
        fileName: 'trialrun.report.json',
        outputKey: 'trialRunReport',
        kind: 'TrialRunReport',
        value: trialRunReport,
        reasonCodes: trialRunReasonCodes,
      }),
    ]

    if (includeEvidence) {
      artifacts.push(
        yield* makeArtifactOutput({
          outDir: inv.global.outDir,
          budgetBytes: inv.global.budgetBytes,
          fileName: 'trace.slim.json',
          outputKey: 'traceSlim',
          kind: 'TraceSlim',
          value: traceSlim,
          reasonCodes: ['TRIALRUN_TRACE_EMITTED'],
        }),
      )

      artifacts.push(
        yield* makeArtifactOutput({
          outDir: inv.global.outDir,
          budgetBytes: inv.global.budgetBytes,
          fileName: 'evidence.json',
          outputKey: 'evidence',
          kind: 'TrialRunEvidence',
          value: evidence,
          reasonCodes: ['TRIALRUN_EVIDENCE_EMITTED'],
        }),
      )
    }

    if (coreReport.ok) {
      return makeCommandResult({
        runId,
        command: 'trialrun',
        ok: true,
        artifacts,
      })
    }

    return makeCommandResult({
      runId,
      command: 'trialrun',
      ok: false,
      artifacts,
      error: asSerializableErrorSummary(toTrialRunFailure(coreReport)),
    })
  }).pipe(
    Effect.catchAllCause((cause) =>
      Effect.succeed(
        makeCommandResult({
          runId,
          command: 'trialrun',
          ok: false,
          artifacts: [],
          error: asSerializableErrorSummary(cause),
        }),
      ),
    ),
  )
}
