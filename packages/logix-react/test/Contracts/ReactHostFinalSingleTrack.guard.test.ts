import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(__dirname, '../../../..')
const read = (p: string) => readFileSync(resolve(repoRoot, p), 'utf8')

const forbidden = ['useForm', 'useField', 'useFieldArray', 'useCompanion', 'useFieldSource', 'useFormSelector']

describe('React host final single-track boundary', () => {
  it('does not expose Form-owned hook family from React root or Hooks barrel', () => {
    const index = read('packages/logix-react/src/index.ts')
    const hooks = read('packages/logix-react/src/Hooks.ts')
    for (const token of forbidden) {
      expect(index, `React root must not expose ${token}`).not.toContain(token)
      expect(hooks, `React Hooks barrel must not expose ${token}`).not.toContain(token)
    }
  })
})
