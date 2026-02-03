import { Effect, Logger } from 'effect'

import type { SerializableErrorSummary } from './internal/errors.js'
import { asSerializableErrorSummary, exitCodeFromErrorSummary, makeCliError } from './internal/errors.js'
import type { ArtifactOutput, CommandResult } from './internal/result.js'
import { makeErrorCommandResult, sortArtifactsByOutputKey } from './internal/result.js'
import { stableStringifyJson } from './internal/stableJson.js'
import { parseCliInvocation, type CliHelpResult, type CliInvocation } from './internal/args.js'
import { resolveCliConfigArgvPrefix } from './internal/cliConfig.js'

export type RunOutcome =
  | { readonly kind: 'help'; readonly text: string; readonly exitCode: 0 }
  | { readonly kind: 'result'; readonly result: CommandResult; readonly exitCode: 0 | 1 | 2 }

export const formatCommandResult = (result: CommandResult): string => stableStringifyJson(result)

export const printHelp = (): string => `logix

用法:
  logix ir export --runId <id> --entry <modulePath>#<exportName> [--out <dir>]
  logix ir validate --runId <id> --in <dir> [--out <dir>]
  logix ir diff --runId <id> --before <dir|file> --after <dir|file> [--out <dir>]
  logix trialrun --runId <id> --entry <modulePath>#<exportName> [--out <dir>] [--diagnosticsLevel off|light|full] [--maxEvents <n>] [--timeout <ms>] [--includeTrace]
  logix contract-suite run --runId <id> --entry <modulePath>#<exportName> [--baseline <dir>] [--out <dir>] [--allowWarn] [--includeContextPack] [--inputs <file|->] [--includeUiKitRegistry] [--packMaxBytes <n>] [--requireRulesManifest] [--includeAnchorAutofill] [--repoRoot <dir>] [--diagnosticsLevel off|light|full] [--maxEvents <n>] [--timeout <ms>] [--includeTrace]
  logix spy evidence --runId <id> --entry <modulePath>#<exportName> [--out <dir>] [--maxUsedServices <n>] [--maxRawMode <n>] [--timeout <ms>]
  logix anchor index --runId <id> [--repoRoot <dir>] [--out <dir>]
  logix anchor autofill --runId <id> [--repoRoot <dir>] [--mode report|write] [--tsconfig <path>] [--out <dir>]
  logix transform module --runId <id> --ops <delta.json|-> [--mode report|write] [--repoRoot <dir>] [--tsconfig <path>] [--out <dir>]

全局参数:
  --runId <string>     必须显式提供（用于确定性工件命名与关联）
  --out <dir>          可选：稳定落盘目录（stdout 仍输出 CommandResult@v1）
  --outRoot <dir>      可选：当未显式 --out 时，自动落盘到 <outRoot>/<command>/<runId>
  --budgetBytes <n>    可选：stdout inline artifact 的预算上限（超限会截断并标记）
  --mode report|write  可选：写回模式（默认 report；仅对可写回命令生效）
  --tsconfig <path>    可选：ts-morph 解析/改写所用 tsconfig（默认自动探测/降级）
  --host <name>        可选：执行宿主（node|browser-mock；默认 node；影响入口加载/试跑）
  --cliConfig <path>   可选：显式指定 logix.cli.json（不提供则从 cwd 向上查找）
  --profile <name>     可选：选择配置文件中的 profile（在 defaults 之上叠加）
  --config <K=V>       可选：注入运行环境 config（可重复；仅 trialrun/contract-suite 消费）
  -h, --help           显示帮助
`

type IrExportInvocation = Extract<CliInvocation, { readonly command: 'ir.export' }>
type IrValidateInvocation = Extract<CliInvocation, { readonly command: 'ir.validate' }>
type IrDiffInvocation = Extract<CliInvocation, { readonly command: 'ir.diff' }>
type TrialRunInvocation = Extract<CliInvocation, { readonly command: 'trialrun' }>
type ContractSuiteRunInvocation = Extract<CliInvocation, { readonly command: 'contract-suite.run' }>
type SpyEvidenceInvocation = Extract<CliInvocation, { readonly command: 'spy.evidence' }>
type AnchorIndexInvocation = Extract<CliInvocation, { readonly command: 'anchor.index' }>
type AnchorAutofillInvocation = Extract<CliInvocation, { readonly command: 'anchor.autofill' }>
type TransformModuleInvocation = Extract<CliInvocation, { readonly command: 'transform.module' }>

const runIrExport = (inv: IrExportInvocation): Effect.Effect<CommandResult, unknown> =>
  Effect.tryPromise({
    try: () => import('./internal/commands/irExport.js'),
    catch: (cause) =>
      makeCliError({
        code: 'CLI_COMMAND_IMPORT_FAILED',
        message: '[Logix][CLI] 加载命令失败：ir.export',
        cause,
      }),
  }).pipe(Effect.flatMap((mod) => mod.runIrExport(inv)))

const runTrialRun = (inv: TrialRunInvocation): Effect.Effect<CommandResult, unknown> =>
  Effect.tryPromise({
    try: () => import('./internal/commands/trialRun.js'),
    catch: (cause) =>
      makeCliError({
        code: 'CLI_COMMAND_IMPORT_FAILED',
        message: '[Logix][CLI] 加载命令失败：trialrun',
        cause,
      }),
  }).pipe(Effect.flatMap((mod) => mod.runTrialRun(inv)))

const runContractSuiteRun = (inv: ContractSuiteRunInvocation): Effect.Effect<CommandResult, unknown> =>
  Effect.tryPromise({
    try: () => import('./internal/commands/contractSuiteRun.js'),
    catch: (cause) =>
      makeCliError({
        code: 'CLI_COMMAND_IMPORT_FAILED',
        message: '[Logix][CLI] 加载命令失败：contract-suite.run',
        cause,
      }),
  }).pipe(Effect.flatMap((mod) => mod.runContractSuiteRun(inv)))

const runSpyEvidence = (inv: SpyEvidenceInvocation): Effect.Effect<CommandResult, unknown> =>
  Effect.tryPromise({
    try: () => import('./internal/commands/spyEvidence.js'),
    catch: (cause) =>
      makeCliError({
        code: 'CLI_COMMAND_IMPORT_FAILED',
        message: '[Logix][CLI] 加载命令失败：spy.evidence',
        cause,
      }),
  }).pipe(Effect.flatMap((mod) => mod.runSpyEvidence(inv)))

const runIrValidate = (inv: IrValidateInvocation): Effect.Effect<CommandResult, unknown> =>
  Effect.tryPromise({
    try: () => import('./internal/commands/irValidate.js'),
    catch: (cause) =>
      makeCliError({
        code: 'CLI_COMMAND_IMPORT_FAILED',
        message: '[Logix][CLI] 加载命令失败：ir.validate',
        cause,
      }),
  }).pipe(Effect.flatMap((mod) => mod.runIrValidate(inv)))

const runIrDiff = (inv: IrDiffInvocation): Effect.Effect<CommandResult, unknown> =>
  Effect.tryPromise({
    try: () => import('./internal/commands/irDiff.js'),
    catch: (cause) =>
      makeCliError({
        code: 'CLI_COMMAND_IMPORT_FAILED',
        message: '[Logix][CLI] 加载命令失败：ir.diff',
        cause,
      }),
  }).pipe(Effect.flatMap((mod) => mod.runIrDiff(inv)))

const runAnchorIndex = (inv: AnchorIndexInvocation): Effect.Effect<CommandResult, unknown> =>
  Effect.tryPromise({
    try: () => import('./internal/commands/anchorIndex.js'),
    catch: (cause) =>
      makeCliError({
        code: 'CLI_COMMAND_IMPORT_FAILED',
        message: '[Logix][CLI] 加载命令失败：anchor.index',
        cause,
      }),
  }).pipe(Effect.flatMap((mod) => mod.runAnchorIndex(inv)))

const runAnchorAutofill = (inv: AnchorAutofillInvocation): Effect.Effect<CommandResult, unknown> =>
  Effect.tryPromise({
    try: () => import('./internal/commands/anchorAutofill.js'),
    catch: (cause) =>
      makeCliError({
        code: 'CLI_COMMAND_IMPORT_FAILED',
        message: '[Logix][CLI] 加载命令失败：anchor.autofill',
        cause,
      }),
  }).pipe(Effect.flatMap((mod) => mod.runAnchorAutofill(inv)))

const runTransformModule = (inv: TransformModuleInvocation): Effect.Effect<CommandResult, unknown> =>
  Effect.tryPromise({
    try: () => import('./internal/commands/transformModule.js'),
    catch: (cause) =>
      makeCliError({
        code: 'CLI_COMMAND_IMPORT_FAILED',
        message: '[Logix][CLI] 加载命令失败：transform.module',
        cause,
      }),
  }).pipe(Effect.flatMap((mod) => mod.runTransformModule(inv)))

const runCommand = (inv: CliInvocation): Effect.Effect<CommandResult, unknown> => {
  switch (inv.command) {
    case 'ir.export':
      return runIrExport(inv)
    case 'ir.validate':
      return runIrValidate(inv)
    case 'ir.diff':
      return runIrDiff(inv)
    case 'trialrun':
      return runTrialRun(inv)
    case 'contract-suite.run':
      return runContractSuiteRun(inv)
    case 'spy.evidence':
      return runSpyEvidence(inv)
    case 'anchor.index':
      return runAnchorIndex(inv)
    case 'anchor.autofill':
      return runAnchorAutofill(inv)
    case 'transform.module':
      return runTransformModule(inv)
  }
}

const isHelp = (x: CliHelpResult | CliInvocation): x is CliHelpResult => (x as any).kind === 'help'

const tryGetRunId = (argv: ReadonlyArray<string>): string | undefined => {
  const idx = argv.lastIndexOf('--runId')
  if (idx < 0) return undefined
  const next = argv[idx + 1]
  if (!next || next.startsWith('--')) return undefined
  return typeof next === 'string' && next.length > 0 ? next : undefined
}

const isHostErrorCode = (code: string | undefined): code is 'CLI_HOST_MISSING_BROWSER_GLOBAL' | 'CLI_HOST_MISMATCH' =>
  code === 'CLI_HOST_MISSING_BROWSER_GLOBAL' || code === 'CLI_HOST_MISMATCH'

const stripHostFromArgv = (argv: ReadonlyArray<string>): ReadonlyArray<string> => {
  const out: string[] = []
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]!
    if (token === '--host') {
      i += 1
      continue
    }
    if (token.startsWith('--host=')) continue
    out.push(token)
  }
  return out
}

const makeCliDiagnosticsArtifact = (args: {
  readonly errorCode: 'CLI_HOST_MISSING_BROWSER_GLOBAL' | 'CLI_HOST_MISMATCH'
  readonly argv: ReadonlyArray<string>
}): ArtifactOutput => {
  const argvNoHost = stripHostFromArgv(args.argv)
  const command = `logix --host browser-mock ${argvNoHost.join(' ')}`.trim()

  return {
    outputKey: 'cliDiagnostics',
    kind: 'CliDiagnostics',
    schemaVersion: 1,
    ok: true,
    inline: {
      schemaVersion: 1,
      kind: 'CliDiagnostics',
      diagnostics: [
        {
          severity: 'error',
          code: args.errorCode,
          message:
            args.errorCode === 'CLI_HOST_MISSING_BROWSER_GLOBAL'
              ? '入口需要浏览器全局（window/document/navigator 等）；请用 browser-mock host 重跑，或把浏览器代码移出模块顶层。'
              : 'host 可能不匹配；请尝试 browser-mock，或把浏览器代码移出模块顶层。',
          action: { kind: 'run.command', command },
        },
      ],
    } as any,
  }
}

const withHostDiagnosticsIfNeeded = (result: CommandResult, argv: ReadonlyArray<string>): CommandResult => {
  if (result.ok) return result
  const code = result.error?.code
  if (!isHostErrorCode(code)) return result
  if (result.artifacts.some((a) => a.outputKey === 'cliDiagnostics')) return result
  return {
    ...result,
    artifacts: [...result.artifacts, makeCliDiagnosticsArtifact({ errorCode: code, argv })],
  }
}

export const runCli = (argv: ReadonlyArray<string>): Effect.Effect<RunOutcome, never> =>
  (argv.includes('-h') || argv.includes('--help') || argv.length === 0
    ? Effect.succeed(argv)
    : resolveCliConfigArgvPrefix(argv).pipe(Effect.map((prefix) => (prefix.length > 0 ? [...prefix, ...argv] : argv)))
  ).pipe(
    Effect.flatMap((argv2) =>
      parseCliInvocation(argv2, {
        helpText: printHelp(),
      }).pipe(Effect.map((parsed) => ({ argv2, parsed }))),
    ),
    Effect.matchEffect({
      onFailure: (cause) => {
        const runId = tryGetRunId(argv) ?? 'missing-runId'
        const error = asSerializableErrorSummary(cause)
        return Effect.succeed({
          kind: 'result',
          result: makeErrorCommandResult({ runId, command: 'unknown', error }),
          exitCode: exitCodeFromErrorSummary(error),
        } as RunOutcome)
      },
      onSuccess: ({ argv2, parsed }) => {
        if (isHelp(parsed)) {
          return Effect.succeed({ kind: 'help', text: parsed.text, exitCode: 0 } as RunOutcome)
        }

        return runCommand(parsed).pipe(
          Effect.map(
            (result) => {
              const result2 = withHostDiagnosticsIfNeeded(result, argv2)
              return {
                kind: 'result' as const,
                result: {
                  ...result2,
                  artifacts: sortArtifactsByOutputKey(result2.artifacts),
                },
                exitCode: result2.ok ? 0 : exitCodeFromErrorSummary(result2.error),
              } as RunOutcome
            },
          ),
          Effect.catchAllCause((cause) => {
            const error: SerializableErrorSummary = asSerializableErrorSummary(
              makeCliError({
                code: 'CLI_COMMAND_FAILED',
                message: `[Logix][CLI] 命令执行失败：${parsed.command}`,
                cause,
              }),
            )
            const result = makeErrorCommandResult({
              runId: parsed.global.runId,
              command: parsed.command,
              error,
            })
            return Effect.succeed({ kind: 'result', result, exitCode: 1 } as RunOutcome)
          }),
        )
      },
    }),
    Effect.catchAllCause((cause) => {
      const runId = tryGetRunId(argv) ?? 'missing-runId'
      const error: SerializableErrorSummary = asSerializableErrorSummary(
        makeCliError({
          code: 'CLI_INTERNAL',
          message: '[Logix][CLI] 入口执行失败',
          cause,
        }),
      )
      return Effect.succeed({
        kind: 'result',
        result: makeErrorCommandResult({ runId, command: 'unknown', error }),
        exitCode: 1,
      } as RunOutcome)
    }),
    // CLI stdout is a strict protocol (CommandResult@v1); silence Effect logs to avoid polluting stdout/stderr.
    Effect.provide(Logger.replace(Logger.defaultLogger, Logger.make(() => {}))),
  )

export const main = runCli
