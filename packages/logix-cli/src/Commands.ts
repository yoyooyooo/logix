import { Effect, Logger } from 'effect'

import { makeCliError } from './internal/errors.js'
import type { CommandResultV2 } from './internal/protocol/types.js'
import type { ArtifactOutput, CommandResult } from './internal/result.js'
import { stableStringifyJson } from './internal/stableJson.js'
import type { CliInvocation } from './internal/args.js'
import { COMMAND_REGISTRY, COMMAND_REGISTRY_MAP } from './internal/commandRegistry.js'
import { runUnsupportedCommand } from './internal/commands/unsupported.js'
import type { PipelineCommandContext, PipelineRunOutcome, PipelineRuntimeOptions } from './internal/runtime/pipeline.js'
import { runCliPipeline } from './internal/runtime/pipeline.js'

export type RunOutcome = PipelineRunOutcome

export const formatCommandResult = (result: CommandResult | CommandResultV2): string => stableStringifyJson(result)

export const printHelp = (): string => {
  const primaryUsage = COMMAND_REGISTRY.filter((entry) => entry.visibility === 'primary')
    .map((entry) => `  ${entry.usage}`)
    .join('\n')
  const migrationUsage = COMMAND_REGISTRY.filter((entry) => entry.visibility === 'migration')
    .map((entry) => `  ${entry.usage}`)
    .join('\n')
  return `logix

用法:
${primaryUsage}

迁移入口（兼容保留，不建议新调用）:
${migrationUsage}

全局参数:
  --runId <string>     必须显式提供（用于确定性工件命名与关联）
  --out <dir>          可选：稳定落盘目录（stdout 仍输出 CommandResult@v1）
  --outRoot <dir>      可选：当未显式 --out 时，自动落盘到 <outRoot>/<command>/<runId>
  --budgetBytes <n>    可选：stdout inline artifact 的预算上限（超限会截断并标记）
  --mode report|write  可选：写回模式（默认 report；仅对可写回命令生效；verify-loop 命令使用 run|resume）
  --tsconfig <path>    可选：ts-morph 解析/改写所用 tsconfig（默认自动探测/降级）
  --host <name>        可选：执行宿主（node|browser-mock；默认 node；影响入口加载/试跑）
  --cliConfig <path>   可选：显式指定 logix.cli.json（不提供则从 cwd 向上查找）
  --profile <name>     可选：选择配置文件中的 profile（在 defaults 之上叠加）
  --config <K=V>       可选：注入运行环境 config（可重复；仅 trialrun/contract-suite 消费）
  -h, --help           显示帮助
`
}

type IrExportInvocation = Extract<CliInvocation, { readonly command: 'ir.export' }>
type IrValidateInvocation = Extract<CliInvocation, { readonly command: 'ir.validate' }>
type IrDiffInvocation = Extract<CliInvocation, { readonly command: 'ir.diff' }>
type ExtensionValidateInvocation = Extract<CliInvocation, { readonly command: 'extension.validate' }>
type ExtensionLoadInvocation = Extract<CliInvocation, { readonly command: 'extension.load' }>
type ExtensionReloadInvocation = Extract<CliInvocation, { readonly command: 'extension.reload' }>
type ExtensionStatusInvocation = Extract<CliInvocation, { readonly command: 'extension.status' }>
type DescribeInvocation = Extract<CliInvocation, { readonly command: 'describe' }>
type TrialRunInvocation = Extract<CliInvocation, { readonly command: 'trialrun' }>
type ContractSuiteRunInvocation = Extract<CliInvocation, { readonly command: 'contract-suite.run' }>
type VerifyLoopInvocation = Extract<CliInvocation, { readonly command: 'verify-loop' }>
type NextActionsExecInvocation = Extract<CliInvocation, { readonly command: 'next-actions.exec' }>
type SpyEvidenceInvocation = Extract<CliInvocation, { readonly command: 'spy.evidence' }>
type AnchorIndexInvocation = Extract<CliInvocation, { readonly command: 'anchor.index' }>
type AnchorAutofillInvocation = Extract<CliInvocation, { readonly command: 'anchor.autofill' }>
type TransformModuleInvocation = Extract<CliInvocation, { readonly command: 'transform.module' }>

type RunCommandContext = PipelineCommandContext

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

const runDescribe = (inv: DescribeInvocation, ctx: RunCommandContext): Effect.Effect<CommandResult, unknown> =>
  Effect.tryPromise({
    try: () => import('./internal/commands/describe.js'),
    catch: (cause) =>
      makeCliError({
        code: 'CLI_COMMAND_IMPORT_FAILED',
        message: '[Logix][CLI] 加载命令失败：describe',
        cause,
      }),
  }).pipe(
    Effect.flatMap((mod) =>
      mod.runDescribe(inv, {
        argv: ctx.argv,
        argvWithConfigPrefix: ctx.argvWithConfigPrefix,
        env: ctx.runtimeEnv,
        cliConfig: ctx.cliConfig,
        envLayer: ctx.envLayer,
        configTrace: ctx.configTrace,
      }),
    ),
  )

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

const runVerifyLoop = (inv: VerifyLoopInvocation): Effect.Effect<CommandResult, unknown> =>
  Effect.tryPromise({
    try: () => import('./internal/commands/verifyLoop.js'),
    catch: (cause) =>
      makeCliError({
        code: 'CLI_COMMAND_IMPORT_FAILED',
        message: '[Logix][CLI] 加载命令失败：verify-loop',
        cause,
      }),
  }).pipe(Effect.flatMap((mod) => mod.runVerifyLoop(inv)))

const runNextActionsExec = (inv: NextActionsExecInvocation): Effect.Effect<CommandResult, unknown> =>
  Effect.tryPromise({
    try: () => import('./internal/commands/nextActionsExec.js'),
    catch: (cause) =>
      makeCliError({
        code: 'CLI_COMMAND_IMPORT_FAILED',
        message: '[Logix][CLI] 加载命令失败：next-actions.exec',
        cause,
      }),
  }).pipe(Effect.flatMap((mod) => mod.runNextActionsExec(inv)))

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

const runExtensionValidate = (inv: ExtensionValidateInvocation): Effect.Effect<CommandResult, unknown> =>
  Effect.tryPromise({
    try: () => import('./internal/commands/extensionValidate.js'),
    catch: (cause) =>
      makeCliError({
        code: 'CLI_COMMAND_IMPORT_FAILED',
        message: '[Logix][CLI] 加载命令失败：extension.validate',
        cause,
      }),
  }).pipe(Effect.flatMap((mod) => mod.runExtensionValidate(inv)))

const runExtensionLoad = (inv: ExtensionLoadInvocation): Effect.Effect<CommandResult, unknown> =>
  Effect.tryPromise({
    try: () => import('./internal/commands/extensionLoad.js'),
    catch: (cause) =>
      makeCliError({
        code: 'CLI_COMMAND_IMPORT_FAILED',
        message: '[Logix][CLI] 加载命令失败：extension.load',
        cause,
      }),
  }).pipe(Effect.flatMap((mod) => mod.runExtensionLoad(inv)))

const runExtensionReload = (inv: ExtensionReloadInvocation): Effect.Effect<CommandResult, unknown> =>
  Effect.tryPromise({
    try: () => import('./internal/commands/extensionReload.js'),
    catch: (cause) =>
      makeCliError({
        code: 'CLI_COMMAND_IMPORT_FAILED',
        message: '[Logix][CLI] 加载命令失败：extension.reload',
        cause,
      }),
  }).pipe(Effect.flatMap((mod) => mod.runExtensionReload(inv)))

const runExtensionStatus = (inv: ExtensionStatusInvocation): Effect.Effect<CommandResult, unknown> =>
  Effect.tryPromise({
    try: () => import('./internal/commands/extensionStatus.js'),
    catch: (cause) =>
      makeCliError({
        code: 'CLI_COMMAND_IMPORT_FAILED',
        message: '[Logix][CLI] 加载命令失败：extension.status',
        cause,
      }),
  }).pipe(Effect.flatMap((mod) => mod.runExtensionStatus(inv)))

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

type CommandRunner = (inv: CliInvocation, ctx: RunCommandContext) => Effect.Effect<CommandResult | CommandResultV2, unknown>

const COMMAND_RUNNERS: Record<CliInvocation['command'], CommandRunner> = {
  describe: (inv, ctx) => runDescribe(inv as DescribeInvocation, ctx),
  'ir.export': (inv) => runIrExport(inv as IrExportInvocation),
  'ir.validate': (inv) => runIrValidate(inv as IrValidateInvocation),
  'ir.diff': (inv) => runIrDiff(inv as IrDiffInvocation),
  'extension.validate': (inv) => runExtensionValidate(inv as ExtensionValidateInvocation),
  'extension.load': (inv) => runExtensionLoad(inv as ExtensionLoadInvocation),
  'extension.reload': (inv) => runExtensionReload(inv as ExtensionReloadInvocation),
  'extension.status': (inv) => runExtensionStatus(inv as ExtensionStatusInvocation),
  trialrun: (inv) => runTrialRun(inv as TrialRunInvocation),
  'contract-suite.run': (inv) => runContractSuiteRun(inv as ContractSuiteRunInvocation),
  'verify-loop': (inv) => runVerifyLoop(inv as VerifyLoopInvocation),
  'next-actions.exec': (inv) => runNextActionsExec(inv as NextActionsExecInvocation),
  'spy.evidence': (inv) => runSpyEvidence(inv as SpyEvidenceInvocation),
  'anchor.index': (inv) => runAnchorIndex(inv as AnchorIndexInvocation),
  'anchor.autofill': (inv) => runAnchorAutofill(inv as AnchorAutofillInvocation),
  'transform.module': (inv) => runTransformModule(inv as TransformModuleInvocation),
}

export const listRegisteredCommands = (): ReadonlyArray<string> => COMMAND_REGISTRY.map((entry) => entry.command)

const runCommand = (inv: CliInvocation, ctx: RunCommandContext): Effect.Effect<CommandResult | CommandResultV2, unknown> => {
  const entry = COMMAND_REGISTRY_MAP.get(inv.command)
  if (!entry || entry.availability === 'unavailable') {
    return runUnsupportedCommand({
      runId: inv.global.runId,
      command: inv.command,
      message: `[Logix][CLI] 命令当前不可用：${inv.command}`,
    })
  }
  return COMMAND_RUNNERS[inv.command](inv, ctx)
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

const withHostDiagnosticsIfNeeded = (
  result: CommandResult | CommandResultV2,
  argv: ReadonlyArray<string>,
): CommandResult | CommandResultV2 => {
  if (result.ok) return result
  const code = 'error' in result ? result.error?.code : undefined
  if (!isHostErrorCode(code)) return result
  if (result.artifacts.some((a) => a.outputKey === 'cliDiagnostics')) return result
  return {
    ...result,
    artifacts: [...result.artifacts, makeCliDiagnosticsArtifact({ errorCode: code, argv })],
  }
}

export const runCli = (argv: ReadonlyArray<string>, runtime?: PipelineRuntimeOptions): Effect.Effect<RunOutcome, never> =>
  runCliPipeline({
    argv,
    helpText: printHelp(),
    runtime,
    runCommand,
    decorateResult: (result, context) => withHostDiagnosticsIfNeeded(result, context.argvWithConfigPrefix),
  }).pipe(
    // CLI stdout is a strict protocol (CommandResult@v1); silence Effect logs to avoid polluting stdout/stderr.
    Effect.provide(Logger.replace(Logger.defaultLogger, Logger.make(() => {}))),
  )

export const main = runCli
