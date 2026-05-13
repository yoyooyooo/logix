import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const packageRoot = fileURLToPath(new URL('../../', import.meta.url))

describe('Form single-track source residue boundary', () => {
  it('does not keep legacy public helper source files', () => {
    for (const relPath of [
      'src/Path.ts',
      'src/SchemaPathMapping.ts',
      'src/SchemaErrorMapping.ts',
    ]) {
      expect(existsSync(join(packageRoot, relPath))).toBe(false)
    }
  })
})
