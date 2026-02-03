import { Either, Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { readJsonInput } from '../../src/internal/output.js'

describe('logix-cli output', () => {
  it('should fail fast when stdin is a TTY', async () => {
    const program = readJsonInput('-', { stdin: { isTTY: true } as any, label: '--inputs' })

    const either = await Effect.runPromise(program.pipe(Effect.either))
    expect(Either.isLeft(either)).toBe(true)
    if (Either.isLeft(either)) {
      expect(either.left).toMatchObject({ code: 'CLI_STDIN_IS_TTY' })
    }
  })
})
