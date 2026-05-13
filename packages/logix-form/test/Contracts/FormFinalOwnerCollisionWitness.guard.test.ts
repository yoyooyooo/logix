import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(__dirname, '../../../..')
const read = (p: string) => readFileSync(resolve(repoRoot, p), 'utf8')

const requiredExistingWitnesses = [
  'packages/logix-form/test/Form/Form.Companion.NoAsyncGuard.test.ts',
  'packages/logix-form/test/Form/Form.Source.NotOptionsApi.guard.test.ts',
  'packages/logix-form/test/Form/Form.ReadRoute.CoreSelectorOnly.guard.test.ts',
  'packages/logix-form/test/Form/Form.Source.StaleSubmitSnapshot.test.ts',
  'packages/logix-form/test/Form/Form.RowIdentityContinuity.contract.test.ts',
]

const requiredFutureWitnessNames = [
  'country -> province',
  'username uniqueness',
  'invite code',
  'row-local sku',
  'quote lookup',
  'rule direct fetch rejection',
  'React useEffect remote sync rejection',
  'hard Query trigger',
]

describe('Form final owner-collision witness ledger', () => {
  it('keeps existing boundary witness files present', () => {
    for (const file of requiredExistingWitnesses) {
      expect(() => read(file), `${file} must exist`).not.toThrow()
    }
  })

  it('keeps the final spec naming every required witness', () => {
    const spec = read('specs/229-form-kernel-final-single-track-cutover/spec.md')
    for (const witness of requiredFutureWitnessNames) {
      expect(spec.toLowerCase(), `spec must mention ${witness}`).toContain(witness.toLowerCase())
    }
  })
})
