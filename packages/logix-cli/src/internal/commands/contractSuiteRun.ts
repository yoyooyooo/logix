import { Effect, Either } from 'effect'
import fs from 'node:fs/promises'
import path from 'node:path'

import * as Logix from '@logixjs/core'
import * as Workbench from '@logixjs/workbench'
import type { ArtifactEnvelopeLike } from '@logixjs/workbench'

import { makeArtifactOutput } from '../artifacts.js'
import type { CliInvocation } from '../args.js'
import { asSerializableErrorSummary, makeCliError } from '../errors.js'
import { readJsonFile, readJsonInput } from '../output.js'
import { loadProgramModule } from '../loadProgramModule.js'
import type { ArtifactOutput, CommandResult } from '../result.js'
import { makeCommandResult } from '../result.js'
import { silentLoggerLayer } from '../silentLogger.js'

const ANCHOR_PATCH_PLAN_ARTIFACT_KEY = '@logixjs/anchor.patchPlan@v1' as const
const ANCHOR_AUTOFILL_REPORT_ARTIFACT_KEY = '@logixjs/anchor.autofillReport@v1' as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const stripEvidenceFromTrialRunReport = (report: unknown): unknown => {
  if (!report || typeof report !== 'object') return report
  const any: any = report as any
  const { evidence: _evidence, ...rest } = any
  return rest
}

const extractArtifactValue = (report: unknown, artifactKey: string): unknown => {
  if (!isRecord(report)) return undefined
  const artifacts = (report as any).artifacts
  if (!isRecord(artifacts)) return undefined
  const env = (artifacts as any)[artifactKey]
  if (!isRecord(env) || (env as any).ok !== true) return undefined
  return (env as any).value
}

const readBaselineTrialRunReport = (baselineDir: string): Effect.Effect<unknown, unknown> =>
  Effect.tryPromise({
    try: async () => {
      const abs = path.resolve(process.cwd(), baselineDir)
      const stat = await fs.stat(abs)
      if (!stat.isDirectory()) {
        throw makeCliError({ code: 'CLI_INVALID_INPUT', message: `--baseline 不是目录：${baselineDir}` })
      }
      return path.join(abs, 'trialrun.report.json')
    },
    catch: (cause) =>
      makeCliError({
        code: 'CLI_IO_ERROR',
        message: `[Logix][CLI] 无法读取 baseline：${baselineDir}`,
        cause,
      }),
  }).pipe(Effect.flatMap((fileAbs) => readJsonFile(fileAbs)))

type ContractSuiteRunInvocation = Extract<CliInvocation, { readonly command: 'contract-suite.run' }>

export const runContractSuiteRun = (inv: ContractSuiteRunInvocation): Effect.Effect<CommandResult, never> => {
  const runId = inv.global.runId

  return Effect.gen(function* () {
    const diagnosticsLevel = inv.diagnosticsLevel
    const maxEvents = inv.maxEvents
    const trialRunTimeoutMs = inv.timeoutMs
    const includeTrace = inv.includeTrace
    const config = inv.config
    const allowWarn = inv.allowWarn
    const baselineDir = inv.baselineDir
    const includeContextPack = inv.includeContextPack
    const packMaxBytes = inv.packMaxBytes
    const requireRulesManifest = inv.requireRulesManifest
    const inputsFile = inv.inputsFile
    const includeUiKitRegistry = inv.includeUiKitRegistry
    const includeAnchorAutofill = inv.includeAnchorAutofill

    const root = yield* loadProgramModule(inv.entry, { host: inv.global.host })

    const report = yield* Logix.Observability.trialRunModule(root as any, {
      runId,
      source: { host: 'node', label: 'logix-cli:contract-suite' },
      buildEnv: { hostKind: 'node', config: Object.keys(config).length > 0 ? config : undefined },
      layer: silentLoggerLayer,
      diagnosticsLevel,
      ...(maxEvents ? { maxEvents } : null),
      ...(trialRunTimeoutMs ? { trialRunTimeoutMs } : null),
    })

    const artifacts: ArtifactOutput[] = []
    const extraArtifacts: ArtifactEnvelopeLike[] = []

    const reportNoTrace = stripEvidenceFromTrialRunReport(report)
    artifacts.push(
      yield* makeArtifactOutput({
        outDir: inv.global.outDir,
        budgetBytes: inv.global.budgetBytes,
        fileName: 'trialrun.report.json',
        outputKey: 'trialRunReport',
        kind: 'TrialRunReport',
        value: reportNoTrace,
      }),
    )

    if (includeTrace && (report as any)?.evidence) {
      artifacts.push(
        yield* makeArtifactOutput({
          outDir: inv.global.outDir,
          budgetBytes: inv.global.budgetBytes,
          fileName: 'trace.slim.json',
          outputKey: 'traceSlim',
          kind: 'EvidencePackage',
          value: (report as any).evidence,
        }),
      )
    }

    if (includeAnchorAutofill) {
      const tsconfig = inv.global.tsconfig

      const autofillEither = yield* Effect.tryPromise({
        try: () => import('@logixjs/anchor-engine'),
        catch: (cause) => cause,
      }).pipe(
        Effect.flatMap((AnchorEngine) =>
          AnchorEngine.Parser.buildAnchorIndex({ repoRoot: inv.repoRoot, ...(tsconfig ? { tsconfig } : null) }).pipe(
            Effect.flatMap((index) =>
              AnchorEngine.Autofill.autofillAnchors({ repoRoot: inv.repoRoot, mode: 'report', runId, anchorIndex: index }),
            ),
          ),
        ),
        Effect.either,
      )

      if (Either.isRight(autofillEither)) {
        const out = autofillEither.right

        extraArtifacts.push(
          { artifactKey: ANCHOR_PATCH_PLAN_ARTIFACT_KEY, ok: true, value: out.patchPlan },
          { artifactKey: ANCHOR_AUTOFILL_REPORT_ARTIFACT_KEY, ok: true, value: out.report },
        )

        artifacts.push(
          yield* makeArtifactOutput({
            outDir: inv.global.outDir,
            budgetBytes: inv.global.budgetBytes,
            fileName: 'patch.plan.json',
            outputKey: 'anchorPatchPlan',
            kind: 'PatchPlan',
            value: out.patchPlan,
          }),
        )

        artifacts.push(
          yield* makeArtifactOutput({
            outDir: inv.global.outDir,
            budgetBytes: inv.global.budgetBytes,
            fileName: 'autofill.report.json',
            outputKey: 'anchorAutofillReport',
            kind: 'AutofillReport',
            value: out.report,
          }),
        )
      } else {
        const errorSummary = asSerializableErrorSummary(autofillEither.left)
        extraArtifacts.push(
          { artifactKey: ANCHOR_PATCH_PLAN_ARTIFACT_KEY, ok: false, error: errorSummary },
          { artifactKey: ANCHOR_AUTOFILL_REPORT_ARTIFACT_KEY, ok: false, error: errorSummary },
        )
      }
    }

    const baselineReport = baselineDir ? yield* readBaselineTrialRunReport(baselineDir) : undefined
    const inputs: Workbench.ContractSuiteFactsInputs | undefined = inputsFile
      ? yield* readJsonInput(inputsFile === '-' ? '-' : path.resolve(process.cwd(), inputsFile), {
          stdin: process.stdin,
          label: '--inputs',
        }).pipe(
          Effect.flatMap((value) => {
            if (!isRecord(value)) {
              return Effect.fail(
                makeCliError({
                  code: 'CLI_INVALID_INPUT',
                  message: `--inputs 期望 JSON object：${inputsFile === '-' ? 'stdin' : inputsFile}`,
                }),
              )
            }
            return Effect.succeed(value as any)
          }),
          Effect.catchAll((cause) =>
            Effect.fail(
              makeCliError({
                code: 'CLI_INVALID_INPUT',
                message: `[Logix][CLI] 无法读取 inputs：${inputsFile === '-' ? 'stdin' : inputsFile}`,
                cause,
              }),
            ),
          ),
        )
      : undefined

    const manifestDiff = (() => {
      if (!baselineReport || !isRecord(baselineReport) || !isRecord((baselineReport as any).manifest)) return undefined
      if (!isRecord(reportNoTrace) || !isRecord((reportNoTrace as any).manifest)) return undefined
      try {
        return Logix.Reflection.diffManifest((baselineReport as any).manifest, (reportNoTrace as any).manifest)
      } catch {
        return undefined
      }
    })()

    if (manifestDiff) {
      artifacts.push(
        yield* makeArtifactOutput({
          outDir: inv.global.outDir,
          budgetBytes: inv.global.budgetBytes,
          fileName: 'manifest.diff.json',
          outputKey: 'manifestDiff',
          kind: 'ModuleManifestDiff',
          value: manifestDiff,
        }),
      )
    }

    const expectedArtifactKeys = (() => {
      const keys: string[] = [Workbench.PORT_SPEC_ARTIFACT_KEY, Workbench.TYPE_IR_ARTIFACT_KEY]
      if (requireRulesManifest) keys.push(Workbench.RULES_MANIFEST_ARTIFACT_KEY)
      if (includeAnchorAutofill) keys.push(ANCHOR_PATCH_PLAN_ARTIFACT_KEY, ANCHOR_AUTOFILL_REPORT_ARTIFACT_KEY)
      return Array.from(new Set(keys))
    })()

    const facts = Workbench.normalizeContractSuiteFacts({
      runId,
      trialRunReport: reportNoTrace,
      ...(inputs ? { inputs } : null),
      expectedArtifactKeys,
      ...(extraArtifacts.length > 0 ? { extraArtifacts } : null),
      ...(manifestDiff ? { manifestDiff } : null),
      ...(baselineReport
        ? {
            before: {
              portSpec: extractArtifactValue(baselineReport, Workbench.PORT_SPEC_ARTIFACT_KEY),
              typeIr: extractArtifactValue(baselineReport, Workbench.TYPE_IR_ARTIFACT_KEY),
            },
          }
        : null),
    })

    const verdict = Workbench.computeContractSuiteVerdict(facts, requireRulesManifest ? { requireRulesManifest: true } : undefined)
    artifacts.push(
      yield* makeArtifactOutput({
        outDir: inv.global.outDir,
        budgetBytes: inv.global.budgetBytes,
        fileName: 'contract-suite.verdict.json',
        outputKey: 'contractSuiteVerdict',
        kind: 'ContractSuiteVerdict',
        value: verdict,
      }),
    )

    const gateOk = verdict.verdict === 'PASS' || (allowWarn && verdict.verdict === 'WARN')
    const shouldIncludePack = includeContextPack || includeAnchorAutofill || !gateOk

    if (shouldIncludePack) {
      const includeArtifactValuesFor = includeAnchorAutofill
        ? [Workbench.SCHEMA_REGISTRY_ARTIFACT_KEY, ANCHOR_PATCH_PLAN_ARTIFACT_KEY, ANCHOR_AUTOFILL_REPORT_ARTIFACT_KEY]
        : undefined

      const pack = Workbench.makeContractSuiteContextPack({
        facts,
        verdict,
        options: {
          maxBytes: packMaxBytes,
          includeUiKitRegistry,
          ...(includeArtifactValuesFor ? { includeArtifactValuesFor } : null),
        },
      })
      artifacts.push(
        yield* makeArtifactOutput({
          outDir: inv.global.outDir,
          budgetBytes: inv.global.budgetBytes,
          fileName: 'contract-suite.context-pack.json',
          outputKey: 'contractSuiteContextPack',
          kind: 'ContractSuiteContextPack',
          value: pack,
        }),
      )
    }

    if (gateOk) {
      return makeCommandResult({ runId, command: 'contract-suite.run', ok: true, artifacts })
    }

    return makeCommandResult({
      runId,
      command: 'contract-suite.run',
      ok: false,
      artifacts,
      error: asSerializableErrorSummary(
        makeCliError({
          code: 'CLI_VIOLATION_CONTRACT_SUITE',
          message: `[Logix][CLI] contract-suite: 门禁未通过 (verdict=${verdict.verdict})`,
          hint: '查看 contract-suite.verdict.json / contract-suite.context-pack.json 获取可行动原因与最小事实包。',
        }),
      ),
    })
  }).pipe(
    Effect.catchAll((cause) =>
      Effect.succeed(
        makeCommandResult({
          runId,
          command: 'contract-suite.run',
          ok: false,
          artifacts: [],
          error: asSerializableErrorSummary(cause),
        }),
      ),
    ),
  )
}
