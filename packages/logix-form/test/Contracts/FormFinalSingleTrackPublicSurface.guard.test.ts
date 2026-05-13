import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(__dirname, '../../../..')
const rel = (p: string) => resolve(repoRoot, p)

const forbiddenRootFiles = [
  'packages/logix-form/src/Path.ts',
  'packages/logix-form/src/Source.ts',
  'packages/logix-form/src/Row.ts',
  'packages/logix-form/src/Fact.ts',
  'packages/logix-form/src/SoftFact.ts',
  'packages/logix-form/src/SchemaPathMapping.ts',
  'packages/logix-form/src/SchemaErrorMapping.ts',
]

const forbiddenIndexTokens = [
  'Path.js',
  'Source.js',
  'Row.js',
  'Fact.js',
  'SoftFact.js',
  'SchemaPathMapping.js',
  'SchemaErrorMapping.js',
  'useForm',
  'useField',
  'useFieldArray',
  'useCompanion',
  'useFieldSource',
  'useFormSelector',
]

describe('Form final single-track public surface', () => {
  it('has no compatibility-shaped public root files', () => {
    for (const file of forbiddenRootFiles) {
      expect(existsSync(rel(file)), `${file} must not exist as live public file`).toBe(false)
    }
  })

  it('does not export old public nouns from package root', () => {
    const index = readFileSync(rel('packages/logix-form/src/index.ts'), 'utf8')
    for (const token of forbiddenIndexTokens) {
      expect(index, `packages/logix-form/src/index.ts must not contain ${token}`).not.toContain(token)
    }
  })
})
