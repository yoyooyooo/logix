import { Effect } from 'effect'

import { parseCliInvocation, type CliHelpResult, type CliInvocation } from '../args.js'
import type { CliConfigArgvPrefixResolution } from '../cliConfig.js'
import type { SerializableErrorSummary } from '../errors.js'
import { asSerializableErrorSummary, makeCliError } from '../errors.js'
import { makeInstanceIdFromRun } from '../protocol/identity.js'
import { toCommandResultV2 } from '../protocol/commandResultAdapter.js'
import { withControlEventsArtifact } from '../protocol/eventsArtifact.js'
import { assertRegisteredReasonCode, isRegisteredReasonCode } from '../protocol/reasonCatalog.js'
import { makeCommandResultV2 } from '../protocol/resultV2.js'
import { assertCommandResultV2Schema } from '../protocol/schemaValidation.js'
import { CANONICAL_NEXT_ACTION, type CommandResultV2 } from '../protocol/types.js'
import type { CommandResult } from '../result.js'
import { makeErrorCommandResult, sortArtifactsByOutputKey } from '../result.js'
import type { ConfigResolutionTrace, EnvConfigLayer, RuntimeConfigResolution } from './configResolution.js'
import { resolveRuntimeConfigResolution } from './configResolution.js'
import type { PreflightFailure } from './preflight.js'
import { runPreflight } from './preflight.js'

export type PipelineRunOutcome =
  | { readonly kind: 'help'; readonly text: string; readonly exitCode: 0 }
  | { readonly kind: 'result'; readonly result: CommandResultV2; readonly exitCode: 0 | 1 | 2 | 3 | 4 | 5 }

export type PipelineRuntimeOptions = {
  readonly env?: NodeJS.ProcessEnv
  readonly stdinIsTTY?: boolean
}

export type PipelineCommandContext = {
  readonly argv: ReadonlyArray<string>
  readonly argvWithConfigPrefix: ReadonlyArray<string>
  readonly runtimeEnv: NodeJS.ProcessEnv
  readonly cliConfig: CliConfigArgvPrefixResolution
  readonly envLayer: EnvConfigLayer
  readonly configTrace: ConfigResolutionTrace
}

type PipelineParsedState = PipelineCommandContext & {
  readonly parsed: CliHelpResult | CliInvocation
}

type PipelineCommandState = PipelineCommandContext & {
  readonly parsed: CliInvocation
}

export type PipelineOptions = {
  readonly argv: ReadonlyArray<string>
  readonly helpText: string
  readonly runtime?: PipelineRuntimeOptions
  readonly runCommand: (invocation: CliInvocation, context: PipelineCommandContext) => Effect.Effect<CommandResult | CommandResultV2, unknown>
  readonly decorateResult?: (
    result: CommandResult | CommandResultV2,
    context: PipelineCommandContext,
  ) => CommandResult | CommandResultV2
}

const resolveRuntime = (runtime?: PipelineRuntimeOptions): Required<PipelineRuntimeOptions> => ({
  env: runtime?.env ?? process.env,
  stdinIsTTY: runtime?.stdinIsTTY ?? process.stdin.isTTY === true,
})

const isHelp = (value: CliHelpResult | CliInvocation): value is CliHelpResult => (value as any).kind === 'help'

const stageParse = (
  argv: ReadonlyArray<string>,
  helpText: string,
  runtime: Required<PipelineRuntimeOptions>,
): Effect.Effect<PipelineParsedState, unknown> =>
  resolveRuntimeConfigResolution(argv, { env: runtime.env }).pipe(
    Effect.flatMap((configResolution) =>
      parseCliInvocation(configResolution.argvWithConfigPrefix, { helpText }).pipe(
        Effect.map((parsed) => ({
          argv,
          argvWithConfigPrefix: configResolution.argvWithConfigPrefix,
          runtimeEnv: runtime.env,
          cliConfig: configResolution.cliConfig,
          envLayer: configResolution.envLayer,
          configTrace: configResolution.trace,
          parsed,
        })),
      ),
    ),
  )

const stageNormalize = (state: PipelineParsedState): Effect.Effect<PipelineParsedState, never> => Effect.succeed(state)

const stageValidate = (
  state: PipelineCommandState,
  runtime: Required<PipelineRuntimeOptions>,
): Effect.Effect<PipelineCommandState, PreflightFailure> => {
  return Effect.try({
    try: () =>
      runPreflight({
        argv: state.argv,
        argvWithConfigPrefix: state.argvWithConfigPrefix,
        invocation: state.parsed,
        stdinIsTTY: runtime.stdinIsTTY,
        env: runtime.env,
      }),
    catch: (cause) => cause as PreflightFailure,
  }).pipe(Effect.map(() => state))
}

const stageExecute = (
  state: PipelineCommandState,
  runCommand: PipelineOptions['runCommand'],
): Effect.Effect<CommandResult | CommandResultV2, unknown> => {
  return runCommand(state.parsed, {
    argv: state.argv,
    argvWithConfigPrefix: state.argvWithConfigPrefix,
    runtimeEnv: state.runtimeEnv,
    cliConfig: state.cliConfig,
    envLayer: state.envLayer,
    configTrace: state.configTrace,
  })
}

const toValidatedEmitResultV2 = (result: CommandResult | CommandResultV2): CommandResultV2 => {
  const resultV2 = withControlEventsArtifact(toCommandResultV2(result))
  const sortedResult: CommandResultV2 = {
    ...resultV2,
    artifacts: sortArtifactsByOutputKey(resultV2.artifacts),
  }
  assertCommandResultV2Schema(sortedResult)
  return sortedResult
}

const stageEmit = (
  result: CommandResult | CommandResultV2,
  context: PipelineCommandContext,
  decorate?: PipelineOptions['decorateResult'],
): Effect.Effect<PipelineRunOutcome, never> =>
  Effect.sync(() => {
    const decorated = decorate ? decorate(result, context) : result
    const sortedResult = toValidatedEmitResultV2(decorated)
    return {
      kind: 'result',
      result: sortedResult,
      exitCode: sortedResult.exitCode,
    } as const satisfies PipelineRunOutcome
  }).pipe(
    Effect.catchAllCause((cause) => {
      const fallbackRunId = typeof result.runId === 'string' && result.runId.length > 0 ? result.runId : 'missing-runId'
      const fallbackCommand = typeof result.command === 'string' && result.command.length > 0 ? result.command : 'unknown'
      const error = asSerializableErrorSummary(
        makeCliError({
          code: 'CLI_PROTOCOL_VIOLATION',
          message: '[Logix][CLI] emit 阶段协议校验失败',
          cause,
        }),
      )
      const fallback = withControlEventsArtifact(
        toCommandResultV2(
          makeErrorCommandResult({
            runId: fallbackRunId,
            command: fallbackCommand,
            error,
          }),
        ),
      )
      return Effect.succeed({
        kind: 'result',
        result: {
          ...fallback,
          artifacts: sortArtifactsByOutputKey(fallback.artifacts),
        },
        exitCode: fallback.exitCode,
      } as const satisfies PipelineRunOutcome)
    }),
  )

const tryGetRunId = (argv: ReadonlyArray<string>): string | undefined => {
  const idx = argv.lastIndexOf('--runId')
  if (idx < 0) return undefined
  const next = argv[idx + 1]
  if (!next || next.startsWith('--')) return undefined
  return next.length > 0 ? next : undefined
}

const resolveRunIdForFailure = (
  argv: ReadonlyArray<string>,
  runtime: Required<PipelineRuntimeOptions>,
): Effect.Effect<string, never> => {
  const fromArgv = tryGetRunId(argv)
  if (fromArgv) return Effect.succeed(fromArgv)

  return resolveRuntimeConfigResolution(argv, { env: runtime.env }).pipe(
    Effect.map((resolved) => tryGetRunId(resolved.argvWithConfigPrefix) ?? 'missing-runId'),
    Effect.catchAll(() => Effect.succeed('missing-runId')),
  )
}

const emitFailureResult = (args: {
  readonly runId: string
  readonly command: string
  readonly cause: unknown
  readonly context: PipelineCommandContext
  readonly decorate?: PipelineOptions['decorateResult']
}): Effect.Effect<PipelineRunOutcome, never> => {
  const error: SerializableErrorSummary = asSerializableErrorSummary(args.cause)
  return stageEmit(
    makeErrorCommandResult({
      runId: args.runId,
      command: args.command,
      error,
    }),
    args.context,
    args.decorate,
  )
}

const emitPreflightFailureResult = (args: {
  readonly failure: PreflightFailure
  readonly invocation: CliInvocation
  readonly context: PipelineCommandContext
  readonly decorate?: PipelineOptions['decorateResult']
}): Effect.Effect<PipelineRunOutcome, never> => {
  const reasonCode = isRegisteredReasonCode(args.failure.code)
    ? assertRegisteredReasonCode(args.failure.code)
    : assertRegisteredReasonCode('CLI_INVALID_ARGUMENT')

  return stageEmit(
    makeCommandResultV2({
      runId: args.invocation.global.runId,
      instanceId: makeInstanceIdFromRun(args.invocation.global.runId),
      txnSeq: 1,
      opSeq: 1,
      attemptSeq: 1,
      command: args.invocation.command,
      verdict: 'VIOLATION',
      reasonCode,
      reasons: [
        {
          code: reasonCode,
          message: args.failure.message,
          data: {
            stage: 'preflight.validate',
            ...(args.failure.hint ? { hint: args.failure.hint } : null),
            ...(args.failure.data ? args.failure.data : null),
          },
        },
      ],
      artifacts: [],
      nextActions: [
        {
          id: 'fix-preflight-and-rerun',
          action: CANONICAL_NEXT_ACTION.PREFLIGHT_FIX_AND_RERUN,
          args: {
            stage: 'preflight.validate',
          },
          ifReasonCodes: [reasonCode],
        },
      ],
    }),
    args.context,
    args.decorate,
  )
}

const toFailureContext = (args: {
  readonly argv: ReadonlyArray<string>
  readonly runtime: Required<PipelineRuntimeOptions>
  readonly resolution?: RuntimeConfigResolution
}): PipelineCommandContext => ({
  argv: args.argv,
  argvWithConfigPrefix: args.resolution?.argvWithConfigPrefix ?? args.argv,
  runtimeEnv: args.runtime.env,
  cliConfig: args.resolution?.cliConfig ?? {
    prefix: [],
    layers: [],
    discovery: { found: false },
  },
  envLayer: args.resolution?.envLayer ?? {
    source: 'env',
    tokens: [],
    bindings: [],
  },
  configTrace: args.resolution?.trace ?? {
    precedence: ['defaults', 'profile', 'env', 'argv'],
    effective: [],
    overrideTrail: [],
  },
})

export const runCliPipeline = (options: PipelineOptions): Effect.Effect<PipelineRunOutcome, never> => {
  const runtime = resolveRuntime(options.runtime)
  const parseProgram = stageParse(options.argv, options.helpText, runtime)

  return parseProgram.pipe(
    Effect.matchEffect({
      onFailure: (cause) =>
        resolveRunIdForFailure(options.argv, runtime).pipe(
          Effect.flatMap((runId) =>
            emitFailureResult({
              runId,
              command: 'unknown',
              cause,
              context: toFailureContext({ argv: options.argv, runtime }),
              decorate: options.decorateResult,
            }),
          ),
        ),
      onSuccess: (parsedState) =>
        stageNormalize(parsedState).pipe(
          Effect.flatMap((normalizedState) => {
            if (isHelp(normalizedState.parsed)) {
              return Effect.succeed({
                kind: 'help',
                text: normalizedState.parsed.text,
                exitCode: 0,
              } as const satisfies PipelineRunOutcome)
            }

            const commandState: PipelineCommandState = {
              ...normalizedState,
              parsed: normalizedState.parsed,
            }

            const commandContext: PipelineCommandContext = {
              argv: commandState.argv,
              argvWithConfigPrefix: commandState.argvWithConfigPrefix,
              runtimeEnv: commandState.runtimeEnv,
              cliConfig: commandState.cliConfig,
              envLayer: commandState.envLayer,
              configTrace: commandState.configTrace,
            }

            return stageValidate(commandState, runtime).pipe(
              Effect.matchEffect({
                onFailure: (failure) =>
                  emitPreflightFailureResult({
                    failure,
                    invocation: commandState.parsed,
                    context: commandContext,
                    decorate: options.decorateResult,
                  }),
                onSuccess: (validatedState) =>
                  stageExecute(validatedState, options.runCommand).pipe(
                    Effect.matchEffect({
                      onFailure: (cause) =>
                        emitFailureResult({
                          runId: validatedState.parsed.global.runId,
                          command: validatedState.parsed.command,
                          cause: makeCliError({
                            code: 'CLI_COMMAND_FAILED',
                            message: `[Logix][CLI] 命令执行失败：${validatedState.parsed.command}`,
                            cause,
                          }),
                          context: commandContext,
                          decorate: options.decorateResult,
                        }),
                      onSuccess: (result) =>
                        stageEmit(result, commandContext, options.decorateResult),
                    }),
                  ),
              }),
            )
          }),
        ),
    }),
    Effect.catchAllCause((cause) =>
      resolveRunIdForFailure(options.argv, runtime).pipe(
        Effect.flatMap((runId) =>
          emitFailureResult({
            runId,
            command: 'unknown',
            cause: makeCliError({
              code: 'CLI_INTERNAL',
              message: '[Logix][CLI] 入口执行失败',
              cause,
            }),
            context: toFailureContext({ argv: options.argv, runtime }),
            decorate: options.decorateResult,
          }),
        ),
      ),
    ),
  )
}
