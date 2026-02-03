import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { buildAnchorIndex } from '../../src/Parser.js'
import { ReasonCodes } from '../../src/internal/reasonCodes.js'

describe('anchor-engine parser (ServiceUse)', () => {
  it('should resolve Context.Tag("<literal>") into serviceIdLiteral (and degrade dynamic/indirect use)', async () => {
    const repoRoot = path.resolve(__dirname, '../fixtures/repo-service-use')
    const index = await Effect.runPromise(buildAnchorIndex({ repoRoot }))

    const uses = index.entries.filter((e) => e.kind === 'ServiceUse')
    expect(uses.map((u) => u.serviceIdLiteral)).toContain('svc/UserApi')
    expect(uses.find((u) => u.serviceIdLiteral === 'svc/UserApi')?.tagSymbol.name).toBe('UserApi')

    // Indirect alias `const Dyn = UserApi` should degrade (宁可漏不乱补).
    expect(index.rawMode.flatMap((x) => x.reasonCodes)).toContain(ReasonCodes.serviceUseUnresolvableServiceId)
  })
})

