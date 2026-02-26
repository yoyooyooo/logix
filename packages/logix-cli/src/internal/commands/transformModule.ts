import { Effect } from 'effect'

import type { CliInvocation } from '../args.js'
import type { CommandResult } from '../result.js'
import { runUnsupportedCommand } from './unsupported.js'

type TransformModuleInvocation = Extract<CliInvocation, { readonly command: 'transform.module' }>

export const runTransformModule = (inv: TransformModuleInvocation): Effect.Effect<CommandResult, never> =>
  runUnsupportedCommand({
    runId: inv.global.runId,
    command: 'transform.module',
  })
