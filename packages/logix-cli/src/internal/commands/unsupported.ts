import { Effect } from 'effect'

import { makeCliError, asSerializableErrorSummary } from '../errors.js'
import type { CommandResult } from '../result.js'
import { makeCommandResult } from '../result.js'

export const runUnsupportedCommand = (args: {
  readonly runId: string
  readonly command: string
  readonly message?: string
}): Effect.Effect<CommandResult, never> =>
  Effect.succeed(
    makeCommandResult({
      runId: args.runId,
      command: args.command,
      ok: false,
      artifacts: [],
      error: asSerializableErrorSummary(
        makeCliError({
          code: 'CLI_NOT_IMPLEMENTED',
          message: args.message ?? `[Logix][CLI] 命令尚未在当前实现中启用：${args.command}`,
        }),
      ),
    }),
  )
