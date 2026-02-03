import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { assertJsonSchemaRefsParseable } from '../helpers/schemaRefs.js'

describe('085 CommandResult@v1 schema', () => {
  it('should be parseable and refs should be parseable', async () => {
    const root = path.resolve(__dirname, '..', '..', '..', '..')
    const schemaPath = path.join(
      root,
      'specs/085-logix-cli-node-only/contracts/schemas/cli-command-result.schema.json',
    )
    await assertJsonSchemaRefsParseable(schemaPath)
    expect(true).toBe(true)
  })
})
