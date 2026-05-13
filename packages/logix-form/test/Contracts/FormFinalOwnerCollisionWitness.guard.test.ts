import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(__dirname, '../../../..')
const read = (p: string) => readFileSync(resolve(repoRoot, p), 'utf8')

const requiredExistingWitnesses = [
  'packages/logix-form/test/Form/Form.SourceCompanion.RequiredWitnesses.test.ts',
  'packages/logix-form/test/Form/Form.Companion.NoAsyncGuard.test.ts',
  'packages/logix-form/test/Form/Form.Source.NotOptionsApi.guard.test.ts',
  'packages/logix-form/test/Form/Form.ReadRoute.CoreSelectorOnly.guard.test.ts',
  'packages/logix-form/test/Form/Form.Source.StaleSubmitSnapshot.test.ts',
  'packages/logix-form/test/Form/Form.RowIdentityContinuity.contract.test.ts',
  'packages/logix-form/test/Form/Form.Source.RowScope.Authoring.test.ts',
  'packages/logix-query/test/Query/QueryFormSourceOwnerBoundary.guard.test.ts',
  'packages/logix-query/test/Query.controller.refreshAll.test.ts',
]

const requiredWitnessNames = [
  'country -> province',
  'username uniqueness',
  'invite code',
  'row-local sku',
  'quote lookup',
  'rule direct fetch rejection',
  'React useEffect remote sync rejection',
  'hard Query trigger',
]

const requiredCodeWitnesses = [
  {
    name: 'country -> province remote candidates',
    file: 'packages/logix-form/test/Form/Form.SourceCompanion.RequiredWitnesses.test.ts',
    tokens: ['country -> province', 'provincesByCountry', "field('provinceResource').source", "field('provinceResource').companion"],
  },
  {
    name: 'invite code / username uniqueness',
    file: 'packages/logix-form/test/Form/Form.SourceCompanion.RequiredWitnesses.test.ts',
    tokens: ['invite/username uniqueness', 'uniquenessResource', "submitImpact: 'block'", 'blockingBasis'],
  },
  {
    name: 'row-local sku / quote lookup',
    file: 'packages/logix-form/test/Form/Form.SourceCompanion.RequiredWitnesses.test.ts',
    tokens: ['row-local sku / quote lookup', 'RowLocalSkuQuoteLookup', 'quoteLookup', "field('items.quoteResource').source"],
  },
  {
    name: 'hard Query trigger',
    file: 'packages/logix-query/test/Query.controller.refreshAll.test.ts',
    tokens: ['commands.refresh', 'refresh all queries', 'skip key-unavailable'],
  },
  {
    name: 'direct rule fetch / React useEffect remote sync rejection',
    file: 'packages/logix-form/test/Form/Form.Source.NotOptionsApi.guard.test.ts',
    tokens: ['source/options', 'field(path).source config on remote fact scheduling', 'submitVerdict'],
  },
]

describe('Form final owner-collision witness ledger', () => {
  it('keeps existing boundary witness files present', () => {
    for (const file of requiredExistingWitnesses) {
      expect(() => read(file), `${file} must exist`).not.toThrow()
    }
  })

  it('keeps the final spec naming every required witness', () => {
    const spec = read('specs/229-form-kernel-final-single-track-cutover/spec.md')
    for (const witness of requiredWitnessNames) {
      expect(spec.toLowerCase(), `spec must mention ${witness}`).toContain(witness.toLowerCase())
    }
  })

  it('backs required owner-collision witness names with concrete code or guard artifacts', () => {
    for (const witness of requiredCodeWitnesses) {
      const source = read(witness.file)
      for (const token of witness.tokens) {
        expect(source, `${witness.name} must be backed by ${witness.file} token ${token}`).toContain(token)
      }
    }
  })
})
