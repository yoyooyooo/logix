import { Effect } from 'effect'
import fs from 'node:fs/promises'
import path from 'node:path'

import { makeArtifactOutput } from '../artifacts.js'
import type { CliInvocation, IrValidateInput } from '../args.js'
import { asSerializableErrorSummary, makeCliError } from '../errors.js'
import { readJsonFile } from '../output.js'
import type { ArtifactOutput, CommandResult } from '../result.js'
import { makeCommandResult } from '../result.js'
import { sha256DigestOfJson } from '../stableJson.js'

type IrValidateFileCheck = {
  readonly fileName: string
  readonly ok: boolean
  readonly digest?: string
  readonly digestKind?: 'semantic' | 'content' | 'nonGating'
  readonly bytes?: number
  readonly reasonCodes?: ReadonlyArray<string>
  readonly error?: ReturnType<typeof asSerializableErrorSummary>
}

type IrValidateReportV1 = {
  readonly schemaVersion: 1
  readonly kind: 'IrValidateReport'
  readonly input: IrValidateInput
  readonly status: 'pass' | 'violation' | 'error'
  readonly requiredFiles: ReadonlyArray<string>
  readonly missingRequiredFiles: ReadonlyArray<string>
  readonly files: ReadonlyArray<IrValidateFileCheck>
  readonly summary: {
    readonly checkedFiles: number
    readonly okFiles: number
    readonly failedFiles: number
  }
}

const toBytes = (text: string): number => new TextEncoder().encode(text).length

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNonGatingFile = (fileName: string): boolean => fileName === 'trace.slim.json' || fileName === 'trialrun.report.json'

const extractSemanticDigest = (fileName: string, value: unknown): { readonly digest?: string; readonly digestKind: IrValidateFileCheck['digestKind'] } => {
  if (isNonGatingFile(fileName)) return { digest: undefined, digestKind: 'nonGating' }

  if (fileName === 'control-surface.manifest.json') {
    const digest = isRecord(value) && typeof value.digest === 'string' ? value.digest : undefined
    return { digest: digest ?? sha256DigestOfJson(value), digestKind: 'semantic' }
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
    return { digest: sha256DigestOfJson(digestPairs), digestKind: 'semantic' }
  }

  return { digest: sha256DigestOfJson(value), digestKind: 'content' }
}

const minimalValidateKnownFile = (fileName: string, value: unknown): ReadonlyArray<string> => {
  if (!value || typeof value !== 'object') return [`INVALID_SHAPE:${fileName}`]

  if (fileName === 'control-surface.manifest.json') {
    const version = (value as any).version
    if (version !== 1) return [`MANIFEST_VERSION_MISMATCH:${String(version)}`]
    const digest = (value as any).digest
    if (typeof digest !== 'string' || digest.length === 0) return ['MANIFEST_MISSING_DIGEST']
    const modules = (value as any).modules
    if (!Array.isArray(modules)) return ['MANIFEST_MISSING_MODULES_ARRAY']
  }

  if (fileName === 'workflow.surface.json') {
    if (!Array.isArray(value)) return ['WORKFLOW_SURFACE_NOT_ARRAY']
    for (const [i, item] of value.entries()) {
      if (!isRecord(item)) return [`WORKFLOW_SURFACE_ITEM_NOT_OBJECT:${i}`]
      if (typeof item.moduleId !== 'string' || item.moduleId.length === 0) return [`WORKFLOW_SURFACE_ITEM_MISSING_MODULE_ID:${i}`]
      const surface = item.surface
      if (!isRecord(surface)) return [`WORKFLOW_SURFACE_ITEM_MISSING_SURFACE:${i}`]
      if (typeof surface.digest !== 'string' || surface.digest.length === 0) return [`WORKFLOW_SURFACE_ITEM_MISSING_SURFACE_DIGEST:${i}`]
    }
  }

  if (fileName === 'trialrun.report.json') {
    const ok = (value as any).ok
    if (typeof ok !== 'boolean') return ['TRIALRUN_MISSING_OK_BOOLEAN']
  }

  return []
}

const readDirJsonFileNames = (dirAbs: string): Effect.Effect<ReadonlyArray<string>, unknown> =>
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

const checkJsonFile = (fileAbs: string, fileName: string): Effect.Effect<IrValidateFileCheck, never> =>
  Effect.tryPromise({
    try: () => fs.readFile(fileAbs, 'utf8'),
    catch: (cause) =>
      makeCliError({
        code: 'CLI_IO_ERROR',
        message: `[Logix][CLI] 无法读取文件：${fileName}`,
        cause,
      }),
  }).pipe(
    Effect.flatMap((raw) =>
      Effect.try({
        try: () => JSON.parse(raw) as unknown,
        catch: (cause) =>
          makeCliError({
            code: 'CLI_INVALID_INPUT',
            message: `[Logix][CLI] 无法解析 JSON：${fileName}`,
            cause,
          }),
      }).pipe(
        Effect.map((parsed) => {
          const digestInfo = extractSemanticDigest(fileName, parsed)
          const reasonCodes = minimalValidateKnownFile(fileName, parsed)
          return {
            fileName,
            ok: reasonCodes.length === 0,
            digest: digestInfo.digest,
            digestKind: digestInfo.digestKind,
            bytes: toBytes(raw),
            ...(reasonCodes.length > 0 ? { reasonCodes } : null),
          } satisfies IrValidateFileCheck
        }),
      ),
    ),
    Effect.catchAll((cause) =>
      Effect.succeed({
        fileName,
        ok: false,
        error: asSerializableErrorSummary(cause),
      }),
    ),
  )

type IrValidateInvocation = Extract<CliInvocation, { readonly command: 'ir.validate' }>

export const runIrValidate = (inv: IrValidateInvocation): Effect.Effect<CommandResult, never> => {
  const runId = inv.global.runId

  return Effect.gen(function* () {
    const input = inv.input

    const requiredFiles = ['control-surface.manifest.json']

    const files =
      input.kind === 'dir'
        ? yield* readDirJsonFileNames(path.resolve(process.cwd(), input.dir))
        : [path.basename(path.resolve(process.cwd(), input.file))]

    const checks =
      input.kind === 'dir'
        ? yield* Effect.forEach(files, (name) =>
            checkJsonFile(path.join(path.resolve(process.cwd(), input.dir), name), name),
          )
        : yield* Effect.forEach(files, (name) => checkJsonFile(path.resolve(process.cwd(), input.file), name))

    const missingRequiredFiles =
      input.kind === 'dir' ? requiredFiles.filter((f) => !files.includes(f)) : ([] as ReadonlyArray<string>)

    const manifestCheck = checks.find((c) => c.fileName === 'control-surface.manifest.json')
    const workflowSurfaceCheck = checks.find((c) => c.fileName === 'workflow.surface.json')

    const workflowSurfaceReasons: string[] = []
    if (input.kind === 'dir' && manifestCheck?.ok) {
      const manifestFileAbs = path.join(path.resolve(process.cwd(), input.dir), 'control-surface.manifest.json')
      const manifestValue = yield* readJsonFile(manifestFileAbs).pipe(Effect.catchAll(() => Effect.succeed(undefined)))

      const workflowRefs =
        isRecord(manifestValue) && Array.isArray((manifestValue as any).modules)
          ? (manifestValue as any).modules
              .map((m: any) => (m && typeof m.moduleId === 'string' && m.workflowSurface && typeof m.workflowSurface.digest === 'string'
                ? { moduleId: String(m.moduleId), digest: String(m.workflowSurface.digest) }
                : undefined))
              .filter((x: any) => Boolean(x))
          : []

      if (workflowRefs.length > 0) {
        if (!files.includes('workflow.surface.json')) {
          workflowSurfaceReasons.push('MISSING_WORKFLOW_SURFACE_FILE')
        } else if (!workflowSurfaceCheck?.ok) {
          workflowSurfaceReasons.push('WORKFLOW_SURFACE_FILE_INVALID')
        } else {
          const wfAbs = path.join(path.resolve(process.cwd(), input.dir), 'workflow.surface.json')
          const wfValue = yield* readJsonFile(wfAbs).pipe(Effect.catchAll(() => Effect.succeed(undefined)))
          const wfMap =
            Array.isArray(wfValue)
              ? new Map(
                  wfValue
                    .map((x: any) => {
                      const moduleId = isRecord(x) && typeof x.moduleId === 'string' ? x.moduleId : undefined
                      const surface = isRecord(x) ? x.surface : undefined
                      const digest = isRecord(surface) && typeof surface.digest === 'string' ? surface.digest : undefined
                      return moduleId && digest ? [moduleId, digest] : undefined
                    })
                    .filter((x: any): x is [string, string] => Boolean(x)),
                )
              : new Map<string, string>()

          for (const ref of workflowRefs) {
            const got = wfMap.get(ref.moduleId)
            if (!got) workflowSurfaceReasons.push(`WORKFLOW_SURFACE_MISSING_MODULE:${ref.moduleId}`)
            else if (got !== ref.digest) workflowSurfaceReasons.push(`WORKFLOW_SURFACE_DIGEST_MISMATCH:${ref.moduleId}`)
          }
        }
      }
    }

    const hasParseErrors = checks.some((c) => c.ok === false && c.error)
    const hasViolations =
      missingRequiredFiles.length > 0 ||
      checks.some((c) => c.ok === false && (c.reasonCodes?.length ?? 0) > 0) ||
      workflowSurfaceReasons.length > 0

    const status: IrValidateReportV1['status'] = hasParseErrors ? 'error' : hasViolations ? 'violation' : 'pass'

    const report: IrValidateReportV1 = {
      schemaVersion: 1,
      kind: 'IrValidateReport',
      input,
      status,
      requiredFiles,
      missingRequiredFiles,
      files: checks,
      summary: {
        checkedFiles: checks.length,
        okFiles: checks.filter((c) => c.ok).length,
        failedFiles: checks.filter((c) => !c.ok).length,
      },
    }

    const reportWithWorkflow: IrValidateReportV1 & { readonly workflowSurface?: { readonly reasonCodes: ReadonlyArray<string> } } =
      workflowSurfaceReasons.length > 0 ? { ...report, workflowSurface: { reasonCodes: workflowSurfaceReasons } } : report

    const artifacts: ArtifactOutput[] = [
      yield* makeArtifactOutput({
        outDir: inv.global.outDir,
        budgetBytes: inv.global.budgetBytes,
        fileName: 'ir.validate.report.json',
        outputKey: 'irValidateReport',
        kind: 'IrValidateReport',
        value: reportWithWorkflow,
      }),
    ]

    if (status === 'pass') {
      return makeCommandResult({ runId, command: 'ir.validate', ok: true, artifacts })
    }

    const topError =
      status === 'violation'
        ? asSerializableErrorSummary(
            makeCliError({
              code: 'CLI_VIOLATION_IR_VALIDATE',
              message: '[Logix][CLI] ir validate: 门禁未通过',
            }),
          )
        : asSerializableErrorSummary(
            makeCliError({
              code: 'CLI_INVALID_INPUT',
              message: '[Logix][CLI] ir validate: 输入不可解析',
            }),
          )

    return makeCommandResult({
      runId,
      command: 'ir.validate',
      ok: false,
      artifacts,
      error: topError,
    })
  }).pipe(
    Effect.catchAll((cause) =>
      Effect.succeed(
        makeCommandResult({
          runId,
          command: 'ir.validate',
          ok: false,
          artifacts: [],
          error: asSerializableErrorSummary(cause),
        }),
      ),
    ),
  )
}
