import { describe, expect, it } from 'vitest'
import { Effect, Schema } from 'effect'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import * as Form from '../../src/index.js'

const ownerLawMessage = /owner-law.*synchronous local soft fact/is

const makeCompanionEntry = (lower: (ctx: unknown) => unknown) => {
  const ValuesSchema = Schema.Struct({
    profileResource: Schema.Unknown,
  })

  const form = Form.make(
    'Form.Companion.NoAsyncGuard',
    {
      values: ValuesSchema,
      initialValues: {
        profileResource: undefined,
      },
    },
    (define) => {
      ;(define.field('profileResource') as any).companion({
        deps: ['profileResource'],
        lower,
      })
    },
  )

  const fieldProgram = FieldContracts.getModuleFieldsProgram(form.tag as any) as
    | {
        readonly entries?: ReadonlyArray<any>
      }
    | undefined
  const entry = fieldProgram?.entries?.find((candidate) => candidate?.kind === 'computed')
  expect(entry).toBeDefined()

  return entry as {
    readonly meta: {
      readonly derive: (state: unknown) => unknown
    }
  }
}

describe('Form companion async boundary', () => {
  it('rejects Promise-returning lower as source-owned async work', () => {
    const entry = makeCompanionEntry(async () => ({
      availability: {
        kind: 'interactive',
      },
    }))

    expect(() => entry.meta.derive({ profileResource: undefined })).toThrow(ownerLawMessage)
  })

  it('rejects Effect-returning lower as source-owned effectful work', () => {
    const entry = makeCompanionEntry(() =>
      Effect.succeed({
        availability: {
          kind: 'interactive',
        },
      }),
    )

    expect(() => entry.meta.derive({ profileResource: undefined })).toThrow(ownerLawMessage)
  })

  it('rejects canonical error or submit truth writes from companion lower', () => {
    const entry = makeCompanionEntry(() => ({
      availability: {
        kind: 'interactive',
      },
      errors: {
        profileResource: 'blocked',
      },
    }))

    expect(() => entry.meta.derive({ profileResource: undefined })).toThrow(
      /local soft facts only.*rule\/root\/list\/submit/is,
    )
  })
})
