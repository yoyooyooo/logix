import { Effect } from 'effect'

import type { CliInvocation } from '../args.js'
import type { CommandResult } from '../result.js'
import { runUnsupportedCommand } from './unsupported.js'

type SpyEvidenceInvocation = Extract<CliInvocation, { readonly command: 'spy.evidence' }>

export const runSpyEvidence = (inv: SpyEvidenceInvocation): Effect.Effect<CommandResult, never> =>
  runUnsupportedCommand({
    runId: inv.global.runId,
    command: 'spy.evidence',
  })
