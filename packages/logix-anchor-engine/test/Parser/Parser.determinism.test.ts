import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { buildAnchorIndex } from '../../src/Parser.js'

describe('anchor-engine parser determinism', () => {
  it('should be stable for the same input', async () => {
    const repoRoot = path.resolve(__dirname, '../fixtures/repo-basic')

    const a = await Effect.runPromise(buildAnchorIndex({ repoRoot }))
    const b = await Effect.runPromise(buildAnchorIndex({ repoRoot }))

    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})

