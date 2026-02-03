import { describe, expect, it } from 'vitest'
import { Effect } from 'effect'

import { parseCliInvocation } from '../../src/internal/args.js'

describe('args: --config before command tokens', () => {
  it('should not pollute command tokens', async () => {
    const parsed = await Effect.runPromise(
      parseCliInvocation(['--runId', 'r1', '--config', 'foo=bar', 'contract-suite', 'run', '--entry', 'x.ts#AppRoot'], {
        helpText: 'help',
      }),
    )
    expect(parsed.kind).toBe('command')
    if (parsed.kind !== 'command') throw new Error('expected command')
    expect(parsed.command).toBe('contract-suite.run')
    expect(parsed.global.runId).toBe('r1')
  })
})
