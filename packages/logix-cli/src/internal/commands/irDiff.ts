import { Effect } from 'effect'
import fs from 'node:fs/promises'
import path from 'node:path'

import { makeArtifactOutput } from '../artifacts.js'
import type { CliInvocation } from '../args.js'
import { asSerializableErrorSummary, makeCliError } from '../errors.js'
import { readJsonFile } from '../output.js'
import type { ArtifactOutput, CommandResult } from '../result.js'
import { makeCommandResult } from '../result.js'
import { sha256DigestOfJson } from '../stableJson.js'

type DigestInfo =
  | { readonly kind: 'semantic'; readonly digest: string }
  | { readonly kind: 'nonGating'; readonly reason: string }

type IrDiffChangedFile = {
  readonly fileName: string
  readonly beforeDigest: string | undefined
  readonly afterDigest: string | undefined
  readonly digestKind: DigestInfo['kind']
  readonly changedPathsSample: ReadonlyArray<string>
  readonly truncated: boolean
}

type IrDiffReportV1 = {
  readonly schemaVersion: 1
  readonly kind: 'IrDiffReport'
  readonly before: string
  readonly after: string
  readonly status: 'pass' | 'violation' | 'error'
  readonly parseErrors: ReadonlyArray<{
    readonly fileName: string
    readonly side: 'before' | 'after'
    readonly error: ReturnType<typeof asSerializableErrorSummary>
  }>
  readonly addedFiles: ReadonlyArray<{ readonly fileName: string; readonly digest: string | undefined }>
  readonly removedFiles: ReadonlyArray<{ readonly fileName: string; readonly digest: string | undefined }>
  readonly changedFiles: ReadonlyArray<IrDiffChangedFile>
  readonly nonGatingChangedFiles: ReadonlyArray<IrDiffChangedFile>
  readonly summary: {
    readonly added: number
    readonly removed: number
    readonly changed: number
    readonly nonGatingChanged: number
    readonly unchanged: number
  }
}

const escapeJsonPointer = (seg: string): string => seg.replace(/~/g, '~0').replace(/\//g, '~1')

const diffJsonPaths = (a: unknown, b: unknown, args: { readonly path: string; readonly out: string[]; readonly limit: number }): boolean => {
  if (args.out.length >= args.limit) return true

  if (a === b) return false
  if (a === null || b === null) {
    if (a !== b) args.out.push(args.path)
    return args.out.length >= args.limit
  }

  const ta = typeof a
  const tb = typeof b
  if (ta !== tb) {
    args.out.push(args.path)
    return args.out.length >= args.limit
  }

  if (ta !== 'object') {
    if (!Object.is(a, b)) args.out.push(args.path)
    return args.out.length >= args.limit
  }

  const aa = a as any
  const bb = b as any

  const isArrA = Array.isArray(aa)
  const isArrB = Array.isArray(bb)
  if (isArrA || isArrB) {
    if (!(isArrA && isArrB)) {
      args.out.push(args.path)
      return args.out.length >= args.limit
    }
    const min = Math.min(aa.length, bb.length)
    if (aa.length !== bb.length) args.out.push(`${args.path}/length`)
    for (let i = 0; i < min; i++) {
      if (diffJsonPaths(aa[i], bb[i], { ...args, path: `${args.path}/${i}` })) return true
      if (args.out.length >= args.limit) return true
    }
    return args.out.length >= args.limit
  }

  const keys = Array.from(new Set([...Object.keys(aa), ...Object.keys(bb)])).sort((x, y) => (x < y ? -1 : x > y ? 1 : 0))
  for (const key of keys) {
    const nextPath = `${args.path}/${escapeJsonPointer(key)}`
    if (!(key in aa)) {
      args.out.push(nextPath)
      if (args.out.length >= args.limit) return true
      continue
    }
    if (!(key in bb)) {
      args.out.push(nextPath)
      if (args.out.length >= args.limit) return true
      continue
    }
    if (diffJsonPaths(aa[key], bb[key], { ...args, path: nextPath })) return true
    if (args.out.length >= args.limit) return true
  }

  return args.out.length >= args.limit
}

const listJsonFiles = (dirAbs: string): Effect.Effect<ReadonlyArray<string>, unknown> =>
  Effect.tryPromise({
    try: () => fs.readdir(dirAbs, { withFileTypes: true }),
    catch: (cause) =>
      makeCliError({
        code: 'CLI_IO_ERROR',
        message: `[Logix][CLI] 无法读取目录：${dirAbs}`,
        cause,
      }),
  }).pipe(
    Effect.map((entries) =>
      entries
        .filter((e) => e.isFile() && e.name.endsWith('.json'))
        .map((e) => e.name)
        .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
    ),
  )

type ReadJsonResult = { readonly ok: true; readonly value: unknown } | { readonly ok: false; readonly error: ReturnType<typeof asSerializableErrorSummary> }

const readJsonForSide = (fileAbs: string): Effect.Effect<ReadJsonResult, never> =>
  readJsonFile(fileAbs).pipe(
    Effect.map((value) => ({ ok: true as const, value })),
    Effect.catchAll((cause) => Effect.succeed({ ok: false as const, error: asSerializableErrorSummary(cause) })),
  )

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNonGatingFile = (fileName: string): boolean => fileName === 'trace.slim.json' || fileName === 'trialrun.report.json'

const extractSemanticDigest = (fileName: string, value: unknown): DigestInfo => {
  if (isNonGatingFile(fileName)) {
    return { kind: 'nonGating', reason: 'non_gating_by_policy' }
  }

  if (fileName === 'control-surface.manifest.json') {
    const digest = isRecord(value) && typeof value.digest === 'string' ? value.digest : undefined
    return { kind: 'semantic', digest: digest ?? sha256DigestOfJson(value) }
  }

  if (fileName === 'workflow.surface.json') {
    const digestPairs = Array.isArray(value)
      ? value
          .map((x) => {
            const moduleId = isRecord(x) && typeof x.moduleId === 'string' ? x.moduleId : undefined
            const surface = isRecord(x) ? x.surface : undefined
            const digest = isRecord(surface) && typeof surface.digest === 'string' ? surface.digest : undefined
            return moduleId && digest ? { moduleId, digest } : undefined
          })
          .filter((x): x is { moduleId: string; digest: string } => Boolean(x))
          .sort((a, b) => (a.moduleId < b.moduleId ? -1 : a.moduleId > b.moduleId ? 1 : 0))
      : []
    return { kind: 'semantic', digest: sha256DigestOfJson(digestPairs) }
  }

  return { kind: 'semantic', digest: sha256DigestOfJson(value) }
}

type IrDiffInvocation = Extract<CliInvocation, { readonly command: 'ir.diff' }>

export const runIrDiff = (inv: IrDiffInvocation): Effect.Effect<CommandResult, never> => {
  const runId = inv.global.runId

  return Effect.gen(function* () {
    const { before, after } = inv

    const beforeAbs = path.resolve(process.cwd(), before)
    const afterAbs = path.resolve(process.cwd(), after)

    const beforeStat = yield* Effect.tryPromise({
      try: () => fs.stat(beforeAbs),
      catch: (cause) =>
        makeCliError({
          code: 'CLI_IO_ERROR',
          message: `[Logix][CLI] 无法读取输入：${before}`,
          cause,
        }),
    })
    const afterStat = yield* Effect.tryPromise({
      try: () => fs.stat(afterAbs),
      catch: (cause) =>
        makeCliError({
          code: 'CLI_IO_ERROR',
          message: `[Logix][CLI] 无法读取输入：${after}`,
          cause,
        }),
    })

    const beforeIsDir = beforeStat.isDirectory()
    const afterIsDir = afterStat.isDirectory()
    if (beforeIsDir !== afterIsDir) {
      const error = asSerializableErrorSummary(
        makeCliError({
          code: 'CLI_INVALID_INPUT',
          message: '--before/--after 类型不匹配：必须同为目录或同为文件',
        }),
      )
      return makeCommandResult({ runId, command: 'ir.diff', ok: false, artifacts: [], error })
    }

    const parseErrors: Array<{ fileName: string; side: 'before' | 'after'; error: ReturnType<typeof asSerializableErrorSummary> }> = []
    const addedFiles: Array<{ fileName: string; digest: string | undefined }> = []
    const removedFiles: Array<{ fileName: string; digest: string | undefined }> = []
    const changedFiles: IrDiffChangedFile[] = []
    const nonGatingChangedFiles: IrDiffChangedFile[] = []
    let unchanged = 0

    if (!beforeIsDir) {
      const fileName = `${path.basename(beforeAbs)}→${path.basename(afterAbs)}`

      const beforeRes = yield* readJsonForSide(beforeAbs)
      const afterRes = yield* readJsonForSide(afterAbs)

      if (!beforeRes.ok) parseErrors.push({ fileName, side: 'before', error: beforeRes.error })
      if (!afterRes.ok) parseErrors.push({ fileName, side: 'after', error: afterRes.error })

      if (beforeRes.ok && afterRes.ok) {
        const beforeDigest = sha256DigestOfJson(beforeRes.value)
        const afterDigest = sha256DigestOfJson(afterRes.value)
        if (beforeDigest === afterDigest) {
          unchanged = 1
        } else {
          const changedPaths: string[] = []
          const truncated = diffJsonPaths(beforeRes.value, afterRes.value, { path: '$', out: changedPaths, limit: 200 })
          changedFiles.push({
            fileName,
            beforeDigest,
            afterDigest,
            digestKind: 'semantic',
            changedPathsSample: changedPaths,
            truncated,
          })
        }
      }
    } else {
      const beforeFiles = yield* listJsonFiles(beforeAbs)
      const afterFiles = yield* listJsonFiles(afterAbs)
      const allFiles = Array.from(new Set([...beforeFiles, ...afterFiles])).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))

      for (const fileName of allFiles) {
        const beforeHas = beforeFiles.includes(fileName)
        const afterHas = afterFiles.includes(fileName)

        if (!beforeHas && afterHas) {
          const v = yield* readJsonForSide(path.join(afterAbs, fileName))
          if (v.ok) {
            const digestInfo = extractSemanticDigest(fileName, v.value)
            if (digestInfo.kind === 'semantic') {
              addedFiles.push({ fileName, digest: digestInfo.digest })
            } else {
              nonGatingChangedFiles.push({
                fileName,
                beforeDigest: undefined,
                afterDigest: undefined,
                digestKind: 'nonGating',
                changedPathsSample: ['$'],
                truncated: false,
              })
            }
          } else parseErrors.push({ fileName, side: 'after', error: v.error })
          continue
        }

        if (beforeHas && !afterHas) {
          const v = yield* readJsonForSide(path.join(beforeAbs, fileName))
          if (v.ok) {
            const digestInfo = extractSemanticDigest(fileName, v.value)
            if (digestInfo.kind === 'semantic') {
              removedFiles.push({ fileName, digest: digestInfo.digest })
            } else {
              nonGatingChangedFiles.push({
                fileName,
                beforeDigest: undefined,
                afterDigest: undefined,
                digestKind: 'nonGating',
                changedPathsSample: ['$'],
                truncated: false,
              })
            }
          } else parseErrors.push({ fileName, side: 'before', error: v.error })
          continue
        }

        const vBefore = yield* readJsonForSide(path.join(beforeAbs, fileName))
        const vAfter = yield* readJsonForSide(path.join(afterAbs, fileName))

        if (!vBefore.ok) parseErrors.push({ fileName, side: 'before', error: vBefore.error })
        if (!vAfter.ok) parseErrors.push({ fileName, side: 'after', error: vAfter.error })

        if (!(vBefore.ok && vAfter.ok)) continue

        const beforeSem = extractSemanticDigest(fileName, vBefore.value)
        const afterSem = extractSemanticDigest(fileName, vAfter.value)

        if (beforeSem.kind === 'nonGating' || afterSem.kind === 'nonGating') {
          const beforeContent = sha256DigestOfJson(vBefore.value)
          const afterContent = sha256DigestOfJson(vAfter.value)
          if (beforeContent === afterContent) {
            unchanged += 1
            continue
          }
          const changedPaths: string[] = []
          const truncated = diffJsonPaths(vBefore.value, vAfter.value, { path: '$', out: changedPaths, limit: 200 })
          nonGatingChangedFiles.push({
            fileName,
            beforeDigest: undefined,
            afterDigest: undefined,
            digestKind: 'nonGating',
            changedPathsSample: changedPaths,
            truncated,
          })
          continue
        }

        if (beforeSem.digest === afterSem.digest) {
          const beforeContent = sha256DigestOfJson(vBefore.value)
          const afterContent = sha256DigestOfJson(vAfter.value)
          if (beforeContent !== afterContent) {
            const changedPaths: string[] = []
            const truncated = diffJsonPaths(vBefore.value, vAfter.value, { path: '$', out: changedPaths, limit: 200 })
            nonGatingChangedFiles.push({
              fileName,
              beforeDigest: beforeSem.digest,
              afterDigest: afterSem.digest,
              digestKind: 'semantic',
              changedPathsSample: changedPaths,
              truncated,
            })
            continue
          }
          unchanged += 1
          continue
        }

        const changedPaths: string[] = []
        const truncated = diffJsonPaths(vBefore.value, vAfter.value, { path: '$', out: changedPaths, limit: 200 })
        changedFiles.push({
          fileName,
          beforeDigest: beforeSem.digest,
          afterDigest: afterSem.digest,
          digestKind: 'semantic',
          changedPathsSample: changedPaths,
          truncated,
        })
      }
    }

    const hasGatingDiffs = addedFiles.length > 0 || removedFiles.length > 0 || changedFiles.length > 0
    const status: IrDiffReportV1['status'] = parseErrors.length > 0 ? 'error' : hasGatingDiffs ? 'violation' : 'pass'

    const report: IrDiffReportV1 = {
      schemaVersion: 1,
      kind: 'IrDiffReport',
      before,
      after,
      status,
      parseErrors,
      addedFiles,
      removedFiles,
      changedFiles,
      nonGatingChangedFiles,
      summary: {
        added: addedFiles.length,
        removed: removedFiles.length,
        changed: changedFiles.length,
        nonGatingChanged: nonGatingChangedFiles.length,
        unchanged,
      },
    }

    const artifacts: ArtifactOutput[] = [
      yield* makeArtifactOutput({
        outDir: inv.global.outDir,
        budgetBytes: inv.global.budgetBytes,
        fileName: 'ir.diff.report.json',
        outputKey: 'irDiffReport',
        kind: 'IrDiffReport',
        value: report,
      }),
    ]

    if (status === 'pass') {
      return makeCommandResult({ runId, command: 'ir.diff', ok: true, artifacts })
    }

    const topError =
      status === 'violation'
        ? asSerializableErrorSummary(
            makeCliError({
              code: 'CLI_VIOLATION_IR_DIFF',
              message: '[Logix][CLI] ir diff: 存在差异',
            }),
          )
        : asSerializableErrorSummary(
            makeCliError({
              code: 'CLI_INVALID_INPUT',
              message: '[Logix][CLI] ir diff: 输入不可解析',
            }),
          )

    return makeCommandResult({
      runId,
      command: 'ir.diff',
      ok: false,
      artifacts,
      error: topError,
    })
  }).pipe(
    Effect.catchAll((cause) =>
      Effect.succeed(
        makeCommandResult({
          runId,
          command: 'ir.diff',
          ok: false,
          artifacts: [],
          error: asSerializableErrorSummary(cause),
        }),
      ),
    ),
  )
}
