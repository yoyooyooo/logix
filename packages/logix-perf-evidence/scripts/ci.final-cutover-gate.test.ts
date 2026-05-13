import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(__dirname, '../../..')

describe('Final cutover performance gate script', () => {
  it('names all required hot paths in the script', () => {
    const script = readFileSync(resolve(repoRoot, 'packages/logix-perf-evidence/scripts/ci.final-cutover-gate.mjs'), 'utf8')
    for (const token of [
      'negativeBoundaries.dirtyPattern',
      'converge.txnCommit',
      'form.listScopeCheck',
      'externalStore.ingest.tickNotify',
      'runtimeStore.noTearing.tickNotify',
      'react.strictSuspenseJitter',
    ]) {
      expect(script).toContain(token)
    }
  })
})
