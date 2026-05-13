import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(__dirname, '../../../..')
const read = (p: string): string => readFileSync(resolve(repoRoot, p), 'utf8')

describe('Final single-track report collector', () => {
  it('keeps report collection tied to residue scan, witness files, and hard perf policy', () => {
    const script = read('scripts/final-cutover/collect-final-cutover-report.mjs')

    expect(script).toContain('scan-single-track-residue.mjs')
    expect(script).toContain('Form.SourceCompanion.RequiredWitnesses.test.ts')
    expect(script).toContain('Form.ReasonEvidence.contract.test.ts')
    expect(script).toContain('success_with_limited_evidence')
    expect(script).toContain('--require-perf')

    for (const hotPath of [
      'negativeBoundaries.dirtyPattern',
      'converge.txnCommit',
      'form.listScopeCheck',
      'externalStore.ingest.tickNotify',
      'runtimeStore.noTearing.tickNotify',
      'react.strictSuspenseJitter',
    ]) {
      expect(script).toContain(hotPath)
    }
  })
})
