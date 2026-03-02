import { Effect } from 'effect'
import fs from 'node:fs/promises'
import path from 'node:path'

import type { CliInvocation } from '../args.js'
import { makeArtifactOutput } from '../artifacts.js'
import { asSerializableErrorSummary, makeCliError } from '../errors.js'
import type { ArtifactOutput, CommandResult } from '../result.js'
import { makeCommandResult } from '../result.js'
import { sha256DigestOfJson } from '../stableJson.js'

type TransformModuleInvocation = Extract<CliInvocation, { readonly command: 'transform.module' }>
type TransformMode = 'report' | 'write'
type TransformOpKind = 'insert' | 'remove' | 'replace'

type ParsedTransformOp = {
  readonly opSeq: number
  readonly op: TransformOpKind
  readonly file: string
  readonly pointer: string
  readonly valueDigest?: string
}

type InvalidTransformOp = {
  readonly opSeq: number
  readonly result: 'invalid'
  readonly reasonCodes: ReadonlyArray<string>
}

type TransformPatchPlan = {
  readonly schemaVersion: 1
  readonly kind: 'PatchPlan'
  readonly runId: string
  readonly mode: TransformMode
  readonly repoRoot: string
  readonly source: {
    readonly opsPath: string
  }
  readonly operations: ReadonlyArray<ParsedTransformOp>
  readonly summary: {
    readonly totalOps: number
    readonly plannedOps: number
    readonly invalidOps: number
    readonly targetFiles: number
  }
}

type TransformWriteTarget = {
  readonly file: string
  readonly opCount: number
  readonly opSeqs: ReadonlyArray<number>
}

type TransformWriteBackResult = {
  readonly schemaVersion: 1
  readonly kind: 'WriteBackResult'
  readonly mode: TransformMode
  readonly plannedFiles: ReadonlyArray<TransformWriteTarget>
  readonly applied: ReadonlyArray<never>
  readonly failed: ReadonlyArray<{ readonly file: string; readonly reasonCode: 'WRITEBACK_NOT_IMPLEMENTED' }>
}

type TransformReport = {
  readonly schemaVersion: 1
  readonly kind: 'TransformReport'
  readonly runId: string
  readonly mode: TransformMode
  readonly repoRoot: string
  readonly status: 'pass' | 'violation'
  readonly source: {
    readonly opsPath: string
    readonly fromStdin: boolean
  }
  readonly operations: ReadonlyArray<
    | (ParsedTransformOp & { readonly result: 'planned' })
    | InvalidTransformOp
  >
  readonly writeback: {
    readonly mode: TransformMode
    readonly willWrite: boolean
    readonly plannedFiles: ReadonlyArray<TransformWriteTarget>
  }
  readonly summary: TransformPatchPlan['summary']
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asNonEmptyString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const out = value.trim()
  return out.length > 0 ? out : undefined
}

const readStdinUtf8 = (): Promise<string> =>
  new Promise((resolve, reject) => {
    let out = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => {
      out += chunk
    })
    process.stdin.on('end', () => resolve(out))
    process.stdin.on('error', reject)
  })

const readOpsPayloadText = (inv: TransformModuleInvocation): Effect.Effect<{ readonly text: string; readonly fromStdin: boolean }, unknown> => {
  if (inv.opsPath !== '-') {
    const abs = path.resolve(process.cwd(), inv.opsPath)
    return Effect.tryPromise({
      try: async () => ({ text: await fs.readFile(abs, 'utf8'), fromStdin: false as const }),
      catch: (cause) =>
        makeCliError({
          code: 'CLI_IO_ERROR',
          message: `[Logix][CLI] 无法读取 ops 文件：${inv.opsPath}`,
          cause,
        }),
    })
  }

  if (process.stdin.isTTY) {
    return Effect.fail(
      makeCliError({
        code: 'CLI_INVALID_INPUT',
        message: '[Logix][CLI] --ops - 需要从 stdin 提供 JSON 内容',
      }),
    )
  }

  return Effect.tryPromise({
    try: async () => ({ text: await readStdinUtf8(), fromStdin: true as const }),
    catch: (cause) =>
      makeCliError({
        code: 'CLI_IO_ERROR',
        message: '[Logix][CLI] 从 stdin 读取 --ops 失败',
        cause,
      }),
  })
}

const parseOpsPayload = (raw: string): Effect.Effect<ReadonlyArray<unknown>, unknown> =>
  Effect.try({
    try: () => JSON.parse(raw) as unknown,
    catch: (cause) =>
      makeCliError({
        code: 'CLI_INVALID_INPUT',
        message: '[Logix][CLI] --ops 不是合法 JSON',
        cause,
      }),
  }).pipe(
    Effect.flatMap((parsed) => {
      if (Array.isArray(parsed)) return Effect.succeed(parsed)
      if (isRecord(parsed) && Array.isArray(parsed.ops)) return Effect.succeed(parsed.ops)
      return Effect.fail(
        makeCliError({
          code: 'CLI_INVALID_INPUT',
          message: '[Logix][CLI] --ops 结构非法：期望 Array 或 { ops: Array }',
        }),
      )
    }),
  )

const normalizeOperation = (raw: unknown, index: number): ParsedTransformOp | InvalidTransformOp => {
  const opSeq = index + 1
  if (!isRecord(raw)) {
    return { opSeq, result: 'invalid', reasonCodes: ['OP_NOT_OBJECT'] }
  }

  const op = asNonEmptyString(raw.op ?? raw.type)
  const file = asNonEmptyString(raw.file ?? raw.filePath ?? raw.targetFile)
  const pointer = asNonEmptyString(raw.pointer ?? raw.path)
  const reasonCodes: string[] = []

  if (op !== 'insert' && op !== 'remove' && op !== 'replace') {
    reasonCodes.push(`OP_UNSUPPORTED_KIND:${op ?? 'missing'}`)
  }
  if (!file) reasonCodes.push('OP_MISSING_FILE')
  if (!pointer) reasonCodes.push('OP_MISSING_POINTER')
  if ((op === 'insert' || op === 'replace') && !Object.prototype.hasOwnProperty.call(raw, 'value')) {
    reasonCodes.push('OP_MISSING_VALUE')
  }

  if (reasonCodes.length > 0) {
    return {
      opSeq,
      result: 'invalid',
      reasonCodes: Array.from(new Set(reasonCodes)).sort(),
    }
  }

  const valueDigest =
    op === 'insert' || op === 'replace'
      ? sha256DigestOfJson((raw as { readonly value: unknown }).value)
      : undefined

  return {
    opSeq,
    op: op as TransformOpKind,
    file: file!,
    pointer: pointer!,
    ...(valueDigest ? { valueDigest } : null),
  }
}

const collectWriteTargets = (ops: ReadonlyArray<ParsedTransformOp>): ReadonlyArray<TransformWriteTarget> => {
  const map = new Map<string, number[]>()
  for (const op of ops) {
    const arr = map.get(op.file)
    if (arr) arr.push(op.opSeq)
    else map.set(op.file, [op.opSeq])
  }
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([file, opSeqs]) => ({
      file,
      opCount: opSeqs.length,
      opSeqs: opSeqs.slice().sort((a, b) => a - b),
    }))
}

const makePatchPlan = (args: {
  readonly inv: TransformModuleInvocation
  readonly mode: TransformMode
  readonly validOps: ReadonlyArray<ParsedTransformOp>
  readonly invalidOps: ReadonlyArray<InvalidTransformOp>
}): TransformPatchPlan => ({
  schemaVersion: 1,
  kind: 'PatchPlan',
  runId: args.inv.global.runId,
  mode: args.mode,
  repoRoot: args.inv.repoRoot,
  source: {
    opsPath: args.inv.opsPath,
  },
  operations: args.validOps,
  summary: {
    totalOps: args.validOps.length + args.invalidOps.length,
    plannedOps: args.validOps.length,
    invalidOps: args.invalidOps.length,
    targetFiles: collectWriteTargets(args.validOps).length,
  },
})

const makeWriteBackResult = (args: {
  readonly mode: TransformMode
  readonly writeTargets: ReadonlyArray<TransformWriteTarget>
}): TransformWriteBackResult => ({
  schemaVersion: 1,
  kind: 'WriteBackResult',
  mode: args.mode,
  plannedFiles: args.writeTargets,
  applied: [],
  failed:
    args.mode === 'write'
      ? args.writeTargets.map((target) => ({ file: target.file, reasonCode: 'WRITEBACK_NOT_IMPLEMENTED' as const }))
      : [],
})

const toArtifactReasonCodes = (args: {
  readonly mode: TransformMode
  readonly invalidOps: ReadonlyArray<InvalidTransformOp>
  readonly writeBackResult: TransformWriteBackResult
}): ReadonlyArray<string> =>
  Array.from(
    new Set([
      ...(args.invalidOps.length > 0 ? ['TRANSFORM_INVALID_OPERATIONS'] : ['TRANSFORM_VALID']),
      ...(args.mode === 'report' ? ['TRANSFORM_REPORT_ONLY'] : []),
      ...(args.writeBackResult.failed.length > 0 ? ['TRANSFORM_WRITEBACK_NOT_IMPLEMENTED'] : []),
      ...args.invalidOps.flatMap((item) => item.reasonCodes),
    ]),
  ).sort()

export const runTransformModule = (inv: TransformModuleInvocation): Effect.Effect<CommandResult, never> => {
  const runId = inv.global.runId
  const mode = (inv.global.mode ?? 'report') as TransformMode

  return Effect.gen(function* () {
    const payload = yield* readOpsPayloadText(inv)
    const rawOps = yield* parseOpsPayload(payload.text)
    const normalized = rawOps.map((item, index) => normalizeOperation(item, index))

    const validOps = normalized.filter((item): item is ParsedTransformOp => 'op' in item)
    const invalidOps = normalized.filter(
      (item): item is InvalidTransformOp => 'result' in item && item.result === 'invalid',
    )
    const writeTargets = collectWriteTargets(validOps)
    const writeBackResult = makeWriteBackResult({ mode, writeTargets })
    const patchPlan = makePatchPlan({ inv, mode, validOps, invalidOps })

    const status: TransformReport['status'] =
      invalidOps.length > 0 || writeBackResult.failed.length > 0 ? 'violation' : 'pass'

    const report: TransformReport = {
      schemaVersion: 1,
      kind: 'TransformReport',
      runId,
      mode,
      repoRoot: inv.repoRoot,
      status,
      source: {
        opsPath: inv.opsPath,
        fromStdin: payload.fromStdin,
      },
      operations: normalized.map((item) => ('op' in item ? { ...item, result: 'planned' as const } : item)),
      writeback: {
        mode,
        willWrite: mode === 'write' && writeTargets.length > 0,
        plannedFiles: writeTargets,
      },
      summary: patchPlan.summary,
    }

    const artifactReasonCodes = toArtifactReasonCodes({ mode, invalidOps, writeBackResult })
    const artifacts: ArtifactOutput[] = [
      yield* makeArtifactOutput({
        outDir: inv.global.outDir,
        budgetBytes: inv.global.budgetBytes,
        fileName: 'patch.plan.json',
        outputKey: 'patchPlan',
        kind: 'PatchPlan',
        value: patchPlan,
      }),
      yield* makeArtifactOutput({
        outDir: inv.global.outDir,
        budgetBytes: inv.global.budgetBytes,
        fileName: 'transform.report.json',
        outputKey: 'transformReport',
        kind: 'TransformReport',
        value: report,
        reasonCodes: artifactReasonCodes,
      }),
      ...(mode === 'write'
        ? ([
            yield* makeArtifactOutput({
              outDir: inv.global.outDir,
              budgetBytes: inv.global.budgetBytes,
              fileName: 'writeback.result.json',
              outputKey: 'writeBackResult',
              kind: 'WriteBackResult',
              value: writeBackResult,
              reasonCodes: artifactReasonCodes,
            }),
          ] as const)
        : []),
    ]

    if (status === 'pass') {
      return makeCommandResult({
        runId,
        command: 'transform.module',
        mode,
        ok: true,
        artifacts,
      })
    }

    return makeCommandResult({
      runId,
      command: 'transform.module',
      mode,
      ok: false,
      artifacts,
      error: asSerializableErrorSummary(
        makeCliError({
          code: 'CLI_PROTOCOL_VIOLATION',
          message: '[Logix][CLI] transform module: 变更计划存在违规项',
        }),
      ),
    })
  }).pipe(
    Effect.catchAll((cause) =>
      Effect.succeed(
        makeCommandResult({
          runId,
          command: 'transform.module',
          mode,
          ok: false,
          artifacts: [],
          error: asSerializableErrorSummary(cause),
        }),
      ),
    ),
  )
}
