import { Effect } from 'effect'

import type { CliInvocation } from '../args.js'
import type { CommandResult } from '../result.js'
import { runUnsupportedCommand } from './unsupported.js'

type TrialRunInvocation = Extract<CliInvocation, { readonly command: 'trialrun' }>

export const runTrialRun = (inv: TrialRunInvocation): Effect.Effect<CommandResult, never> =>
  runUnsupportedCommand({
    runId: inv.global.runId,
    command: 'trialrun',
  })
