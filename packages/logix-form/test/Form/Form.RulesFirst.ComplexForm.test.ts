import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logix/core'
import * as Form from '../../src/index.js'

describe('Form rules-first complex form (US1)', () => {
  it.scoped('covers derived + conditional required + list scope + $self', () =>
    Effect.gen(function* () {
      const ChannelSchema = Schema.Union(Schema.Literal('email'), Schema.Literal('phone'))

      const ItemSchema = Schema.Struct({
        id: Schema.String,
        warehouseId: Schema.String,
        quantity: Schema.Number,
        price: Schema.Number,
      })

      const ValuesSchema = Schema.Struct({
        profile: Schema.Struct({
          firstName: Schema.String,
          lastName: Schema.String,
          fullName: Schema.String,
          security: Schema.Struct({
            password: Schema.String,
            confirmPassword: Schema.String,
          }),
        }),
        contact: Schema.Struct({
          email: Schema.String,
          preferredChannel: ChannelSchema,
          phone: Schema.String,
        }),
        items: Schema.Array(ItemSchema),
      })

      type Values = Schema.Schema.Type<typeof ValuesSchema>
      type Item = Schema.Schema.Type<typeof ItemSchema>

      const $ = Form.from(ValuesSchema)
      const z = $.rules

      const rules = z.schema(
        z.object({
          contact: z.object({
            email: z.field({ required: '请填写邮箱' }),
            preferredChannel: z.field({}),
            phone: z.field({
              validateOn: ['onBlur'],
              deps: ['preferredChannel'],
              validate: (phone, ctx) => {
                const state: any = ctx.state
                if (state.contact?.preferredChannel !== 'phone') return undefined
                return String(phone ?? '').trim() ? undefined : '当首选渠道为电话时，请填写手机号'
              },
            }),
          }),
          profile: z.object({
            firstName: z.field({}),
            lastName: z.field({}),
            security: z
              .object({
                password: z.field({
                  minLength: { min: 8, message: '密码至少 8 位' },
                }),
                confirmPassword: z.field({ required: '请再次输入密码' }),
              })
              .refine({
                deps: ['password', 'confirmPassword'],
                validate: (security: any) =>
                  String(security?.password ?? '') === String(security?.confirmPassword ?? '')
                    ? undefined
                    : '两次密码不一致',
              }),
          }),
          items: z
            .array(
              z.object({
                warehouseId: z.field({}),
                quantity: z.field({ min: { min: 1, message: '数量必须 > 0' } }),
                price: z.field({ min: { min: 0, message: '价格不能为负' } }),
              }),
              { identity: { mode: 'trackBy', trackBy: 'id' } },
            )
            .refine({
              validate: {
                atLeastOne: (rows: ReadonlyArray<Item>) => ({
                  $list: Array.isArray(rows) && rows.length > 0 ? undefined : '至少一行',
                }),
                uniqueWarehouse: {
                  deps: ['warehouseId'],
                  validate: (rows: ReadonlyArray<Item>) => {
                    const indicesByValue = new Map<string, Array<number>>()

                    for (let i = 0; i < rows.length; i++) {
                      const v = String(rows[i]?.warehouseId ?? '').trim()
                      if (!v) continue
                      const bucket = indicesByValue.get(v) ?? []
                      bucket.push(i)
                      indicesByValue.set(v, bucket)
                    }

                    const rowErrors: Array<Record<string, unknown> | undefined> = rows.map(() => undefined)
                    for (const dupIndices of indicesByValue.values()) {
                      if (dupIndices.length <= 1) continue
                      for (const i of dupIndices) {
                        rowErrors[i] = {
                          warehouseId: '仓库选择需跨行互斥（当前重复）',
                        }
                      }
                    }

                    return rowErrors.some(Boolean) ? { rows: rowErrors } : undefined
                  },
                },
              },
            }),
        }),
      )

      const module = Form.make('Form.RulesFirst.ComplexForm', {
        values: ValuesSchema,
        initialValues: {
          profile: {
            firstName: '',
            lastName: '',
            fullName: '',
            security: { password: 'short', confirmPassword: 'different' },
          },
          contact: { email: '', preferredChannel: 'email', phone: '' },
          items: [
            { id: 'row-0', warehouseId: 'WH-DUP', quantity: 0, price: 1 },
            { id: 'row-1', warehouseId: 'WH-DUP', quantity: 1, price: -1 },
          ],
        } satisfies Values,
        validateOn: ['onSubmit'],
        reValidateOn: ['onChange'],
        derived: $.derived({
          'profile.fullName': Form.computed({
            deps: ['profile.firstName', 'profile.lastName'],
            get: (first, last) => `${String(first ?? '')} ${String(last ?? '')}`.trim(),
          }),
        }),
        rules,
      })

      const runtime = Logix.Runtime.make(module, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const getRows = (state: any): any[] => state.errors?.items?.rows ?? []
      const indexById = (items: ReadonlyArray<any>): Map<string, number> =>
        new Map(items.map((row, i) => [String(row?.id ?? i), i]))

      const program = Effect.gen(function* () {
        const rt = yield* module.tag
        const controller = module.controller.make(rt)

        // derived: only writes values/ui, not errors.
        yield* controller.field('profile.firstName').set('Alice')
        yield* controller.field('profile.lastName').set('Smith')
        yield* Effect.sleep('20 millis')

        const sDerived: any = yield* controller.getState
        expect(sDerived.profile?.fullName).toBe('Alice Smith')
        expect(sDerived.errors?.profile?.fullName).toBeUndefined()

        // pre-submit: rules.validateOn=["onBlur"] can still trigger (wiring is controlled by rulesValidateOn).
        yield* controller.field('contact.preferredChannel').set('phone')
        yield* controller.field('contact.phone').blur()
        yield* Effect.sleep('20 millis')

        const sPhone: any = yield* controller.getState
        expect(sPhone.errors?.contact?.phone).toBe('当首选渠道为电话时，请填写手机号')

        yield* controller.field('contact.phone').set('13800000000')
        yield* controller.field('contact.phone').blur()
        yield* Effect.sleep('20 millis')

        const sPhoneOk: any = yield* controller.getState
        expect(sPhoneOk.errors?.contact?.phone).toBeUndefined()

        // submit: full validation (including list scope / item scope / $self).
        let invalid = 0
        yield* controller.controller.handleSubmit({
          onValid: () => Effect.void,
          onInvalid: () =>
            Effect.sync(() => {
              invalid += 1
            }),
        })

        const s1: any = yield* controller.getState
        expect(invalid).toBe(1)

        expect(s1.errors?.contact?.email).toBe('请填写邮箱')
        expect(s1.errors?.profile?.security?.password).toBe('密码至少 8 位')
        expect(s1.errors?.profile?.security?.$self).toBe('两次密码不一致')

        const rows1 = getRows(s1)
        expect(rows1[0]?.quantity).toBe('数量必须 > 0')
        expect(rows1[1]?.price).toBe('价格不能为负')
        expect(rows1[0]?.warehouseId).toBe('仓库选择需跨行互斥（当前重复）')
        expect(rows1[1]?.warehouseId).toBe('仓库选择需跨行互斥（当前重复）')
        expect(rows1[0]?.$rowId).toBe(s1.items?.[0]?.id)
        expect(rows1[1]?.$rowId).toBe(s1.items?.[1]?.id)

        // swap: row-level errors should move with rowId, not drift to the wrong row.
        yield* controller.fieldArray('items').swap(0, 1)
        yield* Effect.sleep('20 millis')

        const s2: any = yield* controller.getState
        const idx2 = indexById(s2.items ?? [])
        const rows2 = getRows(s2)

        const i0 = idx2.get('row-0')!
        const i1 = idx2.get('row-1')!
        expect(rows2[i0]?.$rowId).toBe('row-0')
        expect(rows2[i0]?.quantity).toBe('数量必须 > 0')
        expect(rows2[i1]?.$rowId).toBe('row-1')
        expect(rows2[i1]?.price).toBe('价格不能为负')

        // Empty list: submit writes $list; after appending a row it should be cleared.
        yield* controller.fieldArray('items').remove(0)
        yield* controller.fieldArray('items').remove(0)
        yield* Effect.sleep('20 millis')

        yield* controller.controller.handleSubmit({
          onValid: () => Effect.void,
          onInvalid: () => Effect.void,
        })

        const s3: any = yield* controller.getState
        expect(s3.items?.length ?? 0).toBe(0)
        expect(s3.errors?.items?.$list).toBe('至少一行')

        yield* controller.fieldArray('items').append({
          id: 'row-new',
          warehouseId: 'WH-001',
          quantity: 1,
          price: 0,
        })
        yield* Effect.sleep('20 millis')

        const s4: any = yield* controller.getState
        expect(s4.errors?.items?.$list).toBeUndefined()
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
