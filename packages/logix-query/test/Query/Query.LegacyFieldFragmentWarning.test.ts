import { describe, expect, it } from 'vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Query from '../../src/index.js'

describe('Query legacy field fragment warning', () => {
  it('should reject direct legacy field-fragment config on Query.make', async () => {
    const Params = Schema.Struct({
      q: Schema.String,
    })
    const legacyFieldsKey = ['tr', 'aits'].join('')

    expect(() =>
      Query.make('QueryLegacyFieldFragmentWarning', {
        params: Params,
        initialParams: { q: 'x' },
        [legacyFieldsKey]: {
          'queries.manual': FieldContracts.fieldLink({
            from: 'params.q',
          }),
        },
      } as any),
    ).toThrow()
  })
})
