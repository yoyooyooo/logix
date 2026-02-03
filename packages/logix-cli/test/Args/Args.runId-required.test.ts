import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { parseCliInvocation } from '../../src/internal/args.js'

describe('logix-cli args', () => {
  it('should fail when runId is missing', async () => {
    await expect(
      Effect.runPromise(parseCliInvocation(['trialrun', '--entry', 'x.ts#AppRoot'], { helpText: 'help' })),
    ).rejects.toThrow(/runId/i)
  })
})
