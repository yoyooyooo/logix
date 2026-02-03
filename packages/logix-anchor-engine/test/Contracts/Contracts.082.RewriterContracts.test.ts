import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { assertJsonSchemaRefsParseable } from '../helpers/schemaRefs.js'

describe('082 Rewriter contracts schemas', () => {
  it('should be parseable (PatchPlan / WriteBackResult)', async () => {
    const root = path.resolve(__dirname, '..', '..', '..', '..')
    const patchPlanPath = path.join(
      root,
      'specs/082-platform-grade-rewriter-mvp/contracts/schemas/patch-plan.schema.json',
    )
    const writeBackPath = path.join(
      root,
      'specs/082-platform-grade-rewriter-mvp/contracts/schemas/writeback-result.schema.json',
    )

    await assertJsonSchemaRefsParseable(patchPlanPath)
    await assertJsonSchemaRefsParseable(writeBackPath)
    expect(true).toBe(true)
  })
})
