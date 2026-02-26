import { Effect } from 'effect'

import type { CliInvocation } from '../args.js'
import type { CommandResult } from '../result.js'
import { runUnsupportedCommand } from './unsupported.js'

type ContractSuiteRunInvocation = Extract<CliInvocation, { readonly command: 'contract-suite.run' }>

export const runContractSuiteRun = (inv: ContractSuiteRunInvocation): Effect.Effect<CommandResult, never> =>
  runUnsupportedCommand({
    runId: inv.global.runId,
    command: 'contract-suite.run',
  })
