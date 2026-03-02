import { Effect } from 'effect'

import type { CliInvocation } from '../args.js'
import { asSerializableErrorSummary, makeCliError } from '../errors.js'
import type { CommandResult } from '../result.js'
import { makeCommandResult } from '../result.js'

type ContractSuiteRunInvocation = Extract<CliInvocation, { readonly command: 'contract-suite.run' }>

const ARTIFACT_DIR_PLACEHOLDER = '__LOGIX_ARTIFACT_DIR__'

const makeReplacementCommand = (runId: string): string =>
  `logix ir validate --runId ${runId} --profile contract --in ${ARTIFACT_DIR_PLACEHOLDER}`

export const runContractSuiteRun = (inv: ContractSuiteRunInvocation): Effect.Effect<CommandResult, never> =>
  Effect.succeed(
    makeCommandResult({
      runId: inv.global.runId,
      command: 'contract-suite.run',
      ok: false,
      artifacts: [],
      error: asSerializableErrorSummary(
        makeCliError({
          code: 'E_CLI_COMMAND_MERGED',
          message: '[Logix][CLI] 命令已合并：contract-suite.run',
          hint: makeReplacementCommand(inv.global.runId),
        }),
      ),
    }),
  )
