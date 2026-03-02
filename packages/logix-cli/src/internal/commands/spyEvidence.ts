import { Effect } from 'effect'

import type { CliInvocation } from '../args.js'
import { asSerializableErrorSummary, makeCliError } from '../errors.js'
import type { CommandResult } from '../result.js'
import { makeCommandResult } from '../result.js'

type SpyEvidenceInvocation = Extract<CliInvocation, { readonly command: 'spy.evidence' }>

const ENTRY_PLACEHOLDER = '__LOGIX_UNRESOLVED_MODULE__#__LOGIX_UNRESOLVED_EXPORT__'

const normalizeEntry = (inv: SpyEvidenceInvocation): string => {
  const modulePath = inv.entry.modulePath.trim()
  const exportName = inv.entry.exportName.trim()
  if (modulePath.length === 0 || exportName.length === 0) return ENTRY_PLACEHOLDER
  return `${modulePath}#${exportName}`
}

const makeReplacementCommand = (runId: string, entry: string): string =>
  `logix trialrun --runId ${runId} --entry ${entry} --emit evidence`

export const runSpyEvidence = (inv: SpyEvidenceInvocation): Effect.Effect<CommandResult, never> =>
  Effect.succeed(
    makeCommandResult({
      runId: inv.global.runId,
      command: 'spy.evidence',
      ok: false,
      artifacts: [],
      error: asSerializableErrorSummary(
        makeCliError({
          code: 'E_CLI_COMMAND_MERGED',
          message: '[Logix][CLI] 命令已合并：spy.evidence',
          hint: makeReplacementCommand(inv.global.runId, normalizeEntry(inv)),
        }),
      ),
    }),
  )
