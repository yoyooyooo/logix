import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { assertJsonSchemaRefsParseable } from '../helpers/schemaRefs.js'

describe('081 AnchorIndex@v1 schema', () => {
  it('should be parseable', async () => {
    const root = path.resolve(__dirname, '..', '..', '..', '..')
    const schemaPath = path.join(
      root,
      'specs/081-platform-grade-parser-mvp/contracts/schemas/anchor-index.schema.json',
    )
    await assertJsonSchemaRefsParseable(schemaPath)
    expect(true).toBe(true)
  })
})
