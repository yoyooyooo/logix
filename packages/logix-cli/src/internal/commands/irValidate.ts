import * as Logix from '@logixjs/core'
import { Effect } from 'effect'
import fs from 'node:fs/promises'
import path from 'node:path'

import { makeArtifactOutput } from '../artifacts.js'
import type { CliInvocation, IrValidateInput, IrValidateProfile } from '../args.js'
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
  readonly profile: 'default' | IrValidateProfile
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

const CONTRACT_PROFILE_REQUIRES_DIRECTORY_INPUT = 'CONTRACT_PROFILE_REQUIRES_DIRECTORY_INPUT'
const CROSS_MODULE_PROFILE_REQUIRES_DIRECTORY_INPUT = 'CROSS_MODULE_PROFILE_REQUIRES_DIRECTORY_INPUT'

const toBytes = (text: string): number => new TextEncoder().encode(text).length

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
          const digestInfo = Logix.Reflection.computeIrArtifactDigestSeed(fileName, parsed)
          const reasonCodes = Logix.Reflection.validateIrArtifactFile(fileName, parsed)
          const digest =
            digestInfo.digestKind === 'nonGating'
              ? undefined
              : sha256DigestOfJson(digestInfo.digestSeed ?? parsed)
          return {
            fileName,
            ok: reasonCodes.length === 0,
            digest,
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
    const profile = inv.profile ?? 'default'

    const requiredFiles =
      profile === 'contract'
        ? ['control-surface.manifest.json', 'trialrun.report.json', 'trace.slim.json', 'evidence.json']
        : profile === 'cross-module'
          ? ['control-surface.manifest.json', 'workflow.surface.json']
          : ['control-surface.manifest.json']

    const profileInputReasonCodes =
      profile === 'contract' && input.kind === 'file'
        ? ([CONTRACT_PROFILE_REQUIRES_DIRECTORY_INPUT] as const)
        : profile === 'cross-module' && input.kind === 'file'
          ? ([CROSS_MODULE_PROFILE_REQUIRES_DIRECTORY_INPUT] as const)
          : ([] as ReadonlyArray<string>)

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
    const inputDirAbs = input.kind === 'dir' ? path.resolve(process.cwd(), input.dir) : undefined
    const manifestValue =
      inputDirAbs && files.includes('control-surface.manifest.json')
        ? yield* readJsonFile(path.join(inputDirAbs, 'control-surface.manifest.json')).pipe(
            Effect.catchAll(() => Effect.succeed(undefined)),
          )
        : undefined
    const workflowSurfaceValue =
      inputDirAbs && files.includes('workflow.surface.json')
        ? yield* readJsonFile(path.join(inputDirAbs, 'workflow.surface.json')).pipe(Effect.catchAll(() => Effect.succeed(undefined)))
        : undefined

    const workflowSurfaceReasons: ReadonlyArray<string> =
      input.kind === 'dir' && manifestCheck?.ok
        ? Logix.Reflection.validateWorkflowSurfaceManifestLinks({
            manifest: manifestValue,
            workflowSurface: workflowSurfaceCheck?.ok ? workflowSurfaceValue : files.includes('workflow.surface.json') ? {} : undefined,
          })
        : []

    const crossModuleReasons: ReadonlyArray<string> =
      profile === 'cross-module' && input.kind === 'dir'
        ? Logix.Reflection.validateCrossModuleProfileSurface({
            manifest: manifestValue,
            workflowSurface: workflowSurfaceValue,
          })
        : []

    const hasParseErrors = checks.some((c) => c.ok === false && c.error)
    const hasViolations =
      profileInputReasonCodes.length > 0 ||
      missingRequiredFiles.length > 0 ||
      checks.some((c) => c.ok === false && (c.reasonCodes?.length ?? 0) > 0) ||
      workflowSurfaceReasons.length > 0 ||
      crossModuleReasons.length > 0

    const status: IrValidateReportV1['status'] = hasParseErrors ? 'error' : hasViolations ? 'violation' : 'pass'

    const report: IrValidateReportV1 = {
      schemaVersion: 1,
      kind: 'IrValidateReport',
      profile,
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

    const reportWithWorkflow: IrValidateReportV1 & {
      readonly workflowSurface?: { readonly reasonCodes: ReadonlyArray<string> }
      readonly crossModule?: { readonly reasonCodes: ReadonlyArray<string> }
    } =
      workflowSurfaceReasons.length > 0 || crossModuleReasons.length > 0
        ? {
            ...report,
            ...(workflowSurfaceReasons.length > 0 ? { workflowSurface: { reasonCodes: workflowSurfaceReasons } } : null),
            ...(crossModuleReasons.length > 0 ? { crossModule: { reasonCodes: crossModuleReasons } } : null),
          }
        : report

    const artifactReasonCodes = Array.from(
      new Set([
        ...missingRequiredFiles.map((fileName) => `MISSING_REQUIRED_FILE:${fileName}`),
        ...(profile === 'contract' ? missingRequiredFiles.map((fileName) => `CONTRACT_MISSING_KEY_ARTIFACT:${fileName}`) : []),
        ...checks.flatMap((check) => check.reasonCodes ?? []),
        ...workflowSurfaceReasons,
        ...crossModuleReasons,
        ...profileInputReasonCodes,
        ...checks
          .filter((check) => check.error?.code)
          .map((check) => `PARSE_ERROR:${String(check.error?.code ?? 'UNKNOWN')}`),
      ]),
    ).sort()

    const artifacts: ArtifactOutput[] = [
      yield* makeArtifactOutput({
        outDir: inv.global.outDir,
        budgetBytes: inv.global.budgetBytes,
        fileName: 'ir.validate.report.json',
        outputKey: 'irValidateReport',
        kind: 'IrValidateReport',
        value: reportWithWorkflow,
        ...(artifactReasonCodes.length > 0 ? { reasonCodes: artifactReasonCodes } : null),
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
