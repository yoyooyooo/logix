import { Effect } from 'effect'

import type { CliInvocation } from '../args.js'
import { runLiveClientTaskAsync } from '../liveClient.js'
import type { LiveCommandResult } from '../liveResult.js'
import { makeLiveCommandResult } from '../liveResult.js'

type LiveInvocation = Extract<CliInvocation, { readonly command: 'live' }>

const coordinate = (inv: LiveInvocation) => ({
  command: 'live' as const,
  task: inv.live.task,
  runId: inv.global.runId,
  ...('target' in inv.live ? { target: inv.live.target } : null),
  ...('attachmentId' in inv.live && inv.live.attachmentId ? { attachmentId: inv.live.attachmentId } : null),
  ...('action' in inv.live ? { action: inv.live.action } : null),
  ...('from' in inv.live ? { from: inv.live.from } : null),
  ...('path' in inv.live && inv.live.path ? { path: inv.live.path } : null),
  ...('field' in inv.live && inv.live.field ? { field: inv.live.field } : null),
  ...('cursor' in inv.live && inv.live.cursor ? { cursor: inv.live.cursor } : null),
  ...('kind' in inv.live && inv.live.kind ? { kind: inv.live.kind } : null),
  ...('limit' in inv.live && typeof inv.live.limit === 'number' ? { limit: inv.live.limit } : null),
})

export const runLive = (inv: LiveInvocation): Effect.Effect<LiveCommandResult, never> =>
  Effect.promise(async () => {
    const output = await runLiveClientTaskAsync(inv.live)
    const artifacts = [
      {
        outputKey: output.outputKey,
        kind: output.kind,
        ok: output.ok,
        inline: output.inline,
      },
    ]

    if (output.ok) {
      return makeLiveCommandResult({
        runId: inv.global.runId,
        command: `live ${inv.live.task.replace('.', ' ')}`,
        ok: true,
        inputCoordinate: coordinate(inv),
        primaryLiveOutputKey: output.outputKey,
        artifacts,
      })
    }

    return makeLiveCommandResult({
      runId: inv.global.runId,
      command: `live ${inv.live.task.replace('.', ' ')}`,
      ok: false,
      inputCoordinate: coordinate(inv),
      primaryLiveOutputKey: output.outputKey,
      artifacts,
      error: {
        code: 'CLI_LIVE_OPERATION_FAILED',
        message: 'Live operation failed.',
      },
    })
  })
