import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { buildAnchorIndex } from '../../src/Parser.js'
import { ReasonCodes } from '../../src/internal/reasonCodes.js'

describe('anchor-engine parser (RawMode)', () => {
  it('should degrade subset-out shapes into rawMode with stable reasonCodes', async () => {
    const repoRoot = path.resolve(__dirname, '../fixtures/repo-basic')
    const index = await Effect.runPromise(buildAnchorIndex({ repoRoot }))

    const codes = index.rawMode.flatMap((x) => x.reasonCodes)
    expect(codes).toContain(ReasonCodes.moduleMakeNonLiteralModuleId)
  })
})

