import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { autofillAnchors } from '../../src/Autofill.js'
import { buildAnchorIndex } from '../../src/Parser.js'

describe('079 autofill services patch', () => {
  it('should dedup and sort by serviceId', async () => {
    const repoRoot = path.resolve(__dirname, '../fixtures/repo-autofill-services')
    const index = await Effect.runPromise(buildAnchorIndex({ repoRoot }))
    const out = await Effect.runPromise(autofillAnchors({ repoRoot, mode: 'report', runId: 'r1', anchorIndex: index }))

    const ops = out.patchPlan.operations.filter((o) => o.kind === 'AddObjectProperty' && o.property.name === 'services')
    expect(ops.length).toBeGreaterThan(0)

    const valueCode = ops[0]!.property.valueCode
    expect(valueCode.includes('"svc/a"')).toBe(true)
    expect(valueCode.includes('"svc/b"')).toBe(true)
    expect(valueCode.indexOf('"svc/a"')).toBeLessThan(valueCode.indexOf('"svc/b"'))

    expect(valueCode.split('"svc/a"').length - 1).toBe(1)
  })
})
