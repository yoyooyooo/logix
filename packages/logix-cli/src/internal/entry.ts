import { Effect, Logger } from 'effect'

import type { CliHelpResult, CliInvocation } from './args.js'
import { parseCliInvocation } from './args.js'
import type { CliConfigArgvPrefixResolution } from './cliConfig.js'
import { resolveCliConfigArgvPrefix, resolveCliConfigArgvPrefixResolution } from './cliConfig.js'
import type { SerializableErrorSummary } from './errors.js'
import { asSerializableErrorSummary, exitCodeFromErrorSummary, makeCliError } from './errors.js'
import type { ArtifactOutput, CommandResult } from './result.js'
import { makeErrorCommandResult, sortArtifactsByOutputKey } from './result.js'
import { sha256DigestOfJson } from './stableJson.js'
import { stableStringifyJson } from './stableJson.js'

export type RunOutcome =
  | { readonly kind: 'help'; readonly text: string; readonly exitCode: 0 }
  | { readonly kind: 'result'; readonly result: CommandResult; readonly exitCode: 0 | 1 | 2 }

type CheckInvocation = Extract<CliInvocation, { readonly command: 'check' }>
type CompareInvocation = Extract<CliInvocation, { readonly command: 'compare' }>
type TrialInvocation = Extract<CliInvocation, { readonly command: 'trial' }>

const EMPTY_CLI_CONFIG_RESOLUTION: CliConfigArgvPrefixResolution = {
  prefix: [],
  layers: [],
  discovery: { found: false },
}

const isHelp = (x: CliHelpResult | CliInvocation): x is CliHelpResult => (x as any).kind === 'help'

export const formatCommandResult = (result: CommandResult): string => stableStringifyJson(result)

export const printHelp = (): string => `logix

用法:
  logix check --runId <id> --entry <modulePath>#<exportName> [--evidence <dir>] [--selection <file>] [--budgetBytes <n>] [--out <dir>]
  logix trial --runId <id> --entry <modulePath>#<exportName> [--mode startup] [--evidence <dir>] [--selection <file>] [--out <dir>] [--diagnosticsLevel off|light|full] [--maxEvents <n>] [--timeout <ms>] [--includeTrace]
  logix compare --runId <id> --beforeReport <file> --afterReport <file> [--beforeEvidence <dir>] [--afterEvidence <dir>] [--budgetBytes <n>] [--out <dir>]

全局参数:
  --runId <string>     必须显式提供，用于确定性工件命名与关联
  --out <dir>          可选：稳定落盘目录，stdout 仍输出 CommandResult@v1
  --outRoot <dir>      可选：当未显式 --out 时，自动落盘到 <outRoot>/<command>/<runId>
  --budgetBytes <n>    可选：stdout inline artifact 的预算上限，超限会截断并标记
  --host <name>        可选：执行宿主，node|browser-mock，默认 node
  --cliConfig <path>   可选：显式指定 logix.cli.json，不提供则从 cwd 向上查找
  --profile <name>     可选：选择配置文件中的 profile，在 defaults 之上叠加
  --config <K=V>       可选：注入运行环境 config，可重复，仅 trial 消费
  -h, --help           显示帮助
`

export const printInternalHelp = printHelp

const runCheck = (inv: CheckInvocation): Effect.Effect<CommandResult, unknown> =>
  Effect.tryPromise({
    try: () => import('./commands/check.js'),
    catch: (cause) =>
      makeCliError({
        code: 'CLI_COMMAND_IMPORT_FAILED',
        message: '[Logix][CLI] 加载命令失败：check',
        cause,
      }),
  }).pipe(Effect.flatMap((mod) => mod.runCheck(inv)))

const runCompare = (inv: CompareInvocation): Effect.Effect<CommandResult, unknown> =>
  Effect.tryPromise({
    try: () => import('./commands/compare.js'),
    catch: (cause) =>
      makeCliError({
        code: 'CLI_COMMAND_IMPORT_FAILED',
        message: '[Logix][CLI] 加载命令失败：compare',
        cause,
      }),
  }).pipe(Effect.flatMap((mod) => mod.runCompare(inv)))

const runTrial = (inv: TrialInvocation): Effect.Effect<CommandResult, unknown> =>
  Effect.tryPromise({
    try: () => import('./commands/trial.js'),
    catch: (cause) =>
      makeCliError({
        code: 'CLI_COMMAND_IMPORT_FAILED',
        message: '[Logix][CLI] 加载命令失败：trial',
        cause,
      }),
  }).pipe(Effect.flatMap((mod) => mod.runTrial(inv)))

const runCommand = (inv: CliInvocation): Effect.Effect<CommandResult, unknown> => {
  switch (inv.command) {
    case 'check':
      return runCheck(inv)
    case 'compare':
      return runCompare(inv)
    case 'trial':
      return runTrial(inv)
  }
}

const withArgvSnapshot = (inv: CliInvocation, argv: ReadonlyArray<string>): CliInvocation => {
  const argvSnapshot = {
    tokens: Array.from(argv),
    digest: sha256DigestOfJson(argv),
  }
  return {
    ...inv,
    global: {
      ...inv.global,
      argvSnapshot,
    },
  } as CliInvocation
}

const tryGetRunId = (argv: ReadonlyArray<string>): string | undefined => {
  const idx = argv.lastIndexOf('--runId')
  if (idx < 0) return undefined
  const next = argv[idx + 1]
  if (!next || next.startsWith('--')) return undefined
  return typeof next === 'string' && next.length > 0 ? next : undefined
}

const resolveRunIdForFailure = (argv: ReadonlyArray<string>): Effect.Effect<string, never> => {
  const fromArgv = tryGetRunId(argv)
  if (fromArgv) return Effect.succeed(fromArgv)

  return resolveCliConfigArgvPrefix(argv).pipe(
    Effect.map((prefix) => (prefix.length > 0 ? [...prefix, ...argv] : argv)),
    Effect.map((argv2) => tryGetRunId(argv2) ?? 'missing-runId'),
    Effect.catch(() => Effect.succeed('missing-runId')),
  )
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

const resolveCliContext = (argv: ReadonlyArray<string>): Effect.Effect<{
  readonly argv2: ReadonlyArray<string>
  readonly cliConfig: CliConfigArgvPrefixResolution
}, never | unknown> =>
  argv.includes('-h') || argv.includes('--help') || argv.length === 0
    ? Effect.succeed({
        argv2: argv,
        cliConfig: EMPTY_CLI_CONFIG_RESOLUTION,
      })
    : resolveCliConfigArgvPrefixResolution(argv).pipe(
        Effect.map((resolved) => ({
          argv2: resolved.prefix.length > 0 ? [...resolved.prefix, ...argv] : argv,
          cliConfig: resolved,
        })),
      )

const runParsedCommand = (args: {
  readonly argv2: ReadonlyArray<string>
  readonly parsed: CliInvocation
}): Effect.Effect<RunOutcome, never> =>
  runCommand(withArgvSnapshot(args.parsed, args.argv2)).pipe(
    Effect.map((result) => {
      const result2 = withHostDiagnosticsIfNeeded(result, args.argv2)
      return {
        kind: 'result' as const,
        result: {
          ...result2,
          artifacts: sortArtifactsByOutputKey(result2.artifacts),
        },
        exitCode: result2.ok ? 0 : exitCodeFromErrorSummary(result2.error),
      } satisfies RunOutcome
    }),
    Effect.catchCause((cause) => {
      const error: SerializableErrorSummary = asSerializableErrorSummary(
        makeCliError({
          code: 'CLI_COMMAND_FAILED',
          message: `[Logix][CLI] 命令执行失败：${args.parsed.command}`,
          cause,
        }),
      )
      const result = makeErrorCommandResult({
        runId: args.parsed.global.runId,
        command: args.parsed.command,
        error,
      })
      return Effect.succeed({ kind: 'result', result, exitCode: 1 } as RunOutcome)
    }),
  )

const runCliWithPolicy = (args: {
  readonly argv: ReadonlyArray<string>
  readonly helpText: string
}): Effect.Effect<RunOutcome, never> =>
  resolveCliContext(args.argv).pipe(
    Effect.flatMap(({ argv2 }) =>
      parseCliInvocation(argv2, { helpText: args.helpText }).pipe(Effect.map((parsed) => ({ argv2, parsed }))),
    ),
    Effect.matchEffect({
      onFailure: (cause) => {
        const error = asSerializableErrorSummary(cause)
        return resolveRunIdForFailure(args.argv).pipe(
          Effect.map((runId) => ({
            kind: 'result',
            result: makeErrorCommandResult({ runId, command: 'unknown', error }),
            exitCode: exitCodeFromErrorSummary(error),
          }) as RunOutcome),
        )
      },
      onSuccess: ({ argv2, parsed }) => {
        if (isHelp(parsed)) {
          return Effect.succeed({ kind: 'help', text: parsed.text, exitCode: 0 } as RunOutcome)
        }
        return runParsedCommand({ argv2, parsed })
      },
    }),
    Effect.catchCause((cause) => {
      const error: SerializableErrorSummary = asSerializableErrorSummary(
        makeCliError({
          code: 'CLI_INTERNAL',
          message: '[Logix][CLI] 入口执行失败',
          cause,
        }),
      )
      return resolveRunIdForFailure(args.argv).pipe(
        Effect.map((runId) => ({
          kind: 'result',
          result: makeErrorCommandResult({ runId, command: 'unknown', error }),
          exitCode: 1,
        }) as RunOutcome),
      )
    }),
    Effect.provide(Logger.layer([Logger.make(() => {})])),
  )

export const runCli = (argv: ReadonlyArray<string>): Effect.Effect<RunOutcome, never> =>
  runCliWithPolicy({
    argv,
    helpText: printHelp(),
  })

export const runInternalCli = runCli

export const main = runCli
