import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(__dirname, '../../../..')
const read = (p: string) => readFileSync(resolve(repoRoot, p), 'utf8')

describe('Verification compare final cutover wording', () => {
  it('does not let Form docs make compare the default Form root truth', () => {
    const gate = read('docs/ssot/form/14-final-single-track-cutover-gate.md')
    const verification = read('docs/ssot/runtime/09-verification-control-plane.md')
    expect(`${gate}\n${verification}`).toMatch(/check.*trial|trial.*check/i)
    expect(`${gate}\n${verification}`).toMatch(/compare.*not.*default|not.*default.*compare|non-default/i)
  })
})
