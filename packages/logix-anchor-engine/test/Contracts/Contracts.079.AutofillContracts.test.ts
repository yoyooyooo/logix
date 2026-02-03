import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { assertJsonSchemaRefsParseable } from '../helpers/schemaRefs.js'

describe('079 Autofill contracts schemas', () => {
  it('should be parseable (AutofillReport / ReasonCodes)', async () => {
    const root = path.resolve(__dirname, '..', '..', '..', '..')
    const reportPath = path.join(
      root,
      'specs/079-platform-anchor-autofill/contracts/schemas/autofill-report.schema.json',
    )
    const codesPath = path.join(
      root,
      'specs/079-platform-anchor-autofill/contracts/schemas/autofill-reason-codes.schema.json',
    )

    await assertJsonSchemaRefsParseable(reportPath)
    await assertJsonSchemaRefsParseable(codesPath)
    expect(true).toBe(true)
  })
})
