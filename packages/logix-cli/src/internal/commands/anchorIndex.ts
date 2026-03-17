import { Effect } from 'effect'

import type { CliInvocation } from '../args.js'
import type { CommandResult } from '../result.js'
import { runUnsupportedCommand } from './unsupported.js'

type AnchorIndexInvocation = Extract<CliInvocation, { readonly command: 'anchor.index' }>

export const runAnchorIndex = (inv: AnchorIndexInvocation): Effect.Effect<CommandResult, never> =>
  runUnsupportedCommand({
    runId: inv.global.runId,
    command: 'anchor.index',
  })
