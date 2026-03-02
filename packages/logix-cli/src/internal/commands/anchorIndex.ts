import { Effect } from 'effect'

import type { CliInvocation } from '../args.js'
import { asSerializableErrorSummary, makeCliError } from '../errors.js'
import type { CommandResult } from '../result.js'
import { makeCommandResult } from '../result.js'

type AnchorIndexInvocation = Extract<CliInvocation, { readonly command: 'anchor.index' }>

const ENTRY_PLACEHOLDER = '__LOGIX_UNRESOLVED_MODULE__#__LOGIX_UNRESOLVED_EXPORT__'

const makeReplacementCommand = (runId: string): string =>
  `logix ir export --runId ${runId} --entry ${ENTRY_PLACEHOLDER} --with-anchors`

export const runAnchorIndex = (inv: AnchorIndexInvocation): Effect.Effect<CommandResult, never> =>
  Effect.succeed(
    makeCommandResult({
      runId: inv.global.runId,
      command: 'anchor.index',
      ok: false,
      artifacts: [],
      error: asSerializableErrorSummary(
        makeCliError({
          code: 'E_CLI_COMMAND_MERGED',
          message: '[Logix][CLI] 命令已合并：anchor.index',
          hint: makeReplacementCommand(inv.global.runId),
        }),
      ),
    }),
  )
