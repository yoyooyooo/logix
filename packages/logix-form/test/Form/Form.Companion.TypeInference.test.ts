import { describe, expect, it } from '@effect/vitest'
import { Schema } from 'effect'
import * as Form from '../../src/index.js'
import type * as Resource from '../../../logix-core/src/Resource.js'

type ProfileData = {
  readonly name: string
  readonly tier: 'free' | 'pro'
}

const ProfileSnapshotSchema = Schema.Unknown as Schema.Schema<Resource.ResourceSnapshot<ProfileData, Error>>

const RowSchema = Schema.Struct({
  id: Schema.String,
  warehouseId: Schema.String,
})

const ValuesSchema = Schema.Struct({
  countryId: Schema.String,
  profileId: Schema.String,
  profileResource: ProfileSnapshotSchema,
  items: Schema.Array(RowSchema),
})

type Values = Schema.Schema.Type<typeof ValuesSchema>

const initialValues = {
  countryId: 'CN',
  profileId: 'p1',
  profileResource: {
    status: 'idle',
  } satisfies Resource.ResourceSnapshot<ProfileData, Error>,
  items: [{ id: 'row-1', warehouseId: 'WH-001' }],
} satisfies Values

describe('Form companion type inference', () => {
  it('infers lower(ctx) value, deps, source, availability, and candidates types', () => {
    const form = Form.make(
      'Form.Companion.TypeInference',
      {
        values: ValuesSchema,
        initialValues,
      },
      (define) => {
        define.field('profileResource').companion({
          deps: ['profileId', 'items.warehouseId'],
          lower: (ctx) => {
            const value: Resource.ResourceSnapshot<ProfileData, Error> = ctx.value
            const source: Resource.ResourceSnapshot<ProfileData, Error> | undefined = ctx.source
            const profileId: string = ctx.deps.profileId
            const warehouses: ReadonlyArray<string> = ctx.deps['items.warehouseId']
            const maybeName: string | undefined = source?.data?.name

            // @ts-expect-error deps should preserve each path value type
            const badNumber: number = ctx.deps.profileId
            // @ts-expect-error undeclared deps are not readable
            const missing = ctx.deps.countryId
            void value
            void maybeName
            void badNumber
            void missing

            return {
              availability: {
                kind: 'interactive',
                profileId,
              },
              candidates: {
                items: warehouses,
                keepCurrent: true,
                project: {
                  value: 'id',
                  label: 'name',
                },
              },
            }
          },
        })

        define.field('items.warehouseId').companion({
          deps: ['countryId', 'items.warehouseId'],
          lower: (ctx) => {
            const value: string = ctx.value
            const countryId: string = ctx.deps.countryId
            const warehouses: ReadonlyArray<string> = ctx.deps['items.warehouseId']
            void value

            return {
              availability: {
                kind: countryId ? 'interactive' : 'hidden',
              },
              candidates: {
                items: warehouses,
              },
            }
          },
        })

        if (false) {
          define.field('profileId').companion({
            deps: ['profileId'],
            lower: () => ({
              // @ts-expect-error availability must include a supported kind
              availability: {
                reason: 'missing-kind',
              },
            }),
          })

          define.field('profileId').companion({
            deps: ['profileId'],
            lower: () => ({
              // @ts-expect-error candidates must include items
              candidates: {
                keepCurrent: true,
              },
            }),
          })
        }
      },
    )

    expect(form).toBeDefined()
  })
})
