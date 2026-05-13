import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '../../src/index.js'
import * as Resource from '../../../logix-core/src/Resource.js'
import { materializeExtendedHandle } from '../support/form-harness.js'

const waitForAsync = Effect.promise(
  () =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, 50)
    }),
)

describe('Form required source/companion owner witnesses', () => {
  it.effect('covers country -> province remote candidates through source plus companion only', () =>
    Effect.gen(function* () {
      const ProvinceKeySchema = Schema.Struct({
        countryId: Schema.String,
      })

      const ValuesSchema = Schema.Struct({
        countryId: Schema.String,
        provinceId: Schema.String,
        provinceResource: Schema.Unknown,
      })

      const provincesByCountry = Resource.make({
        id: 'witness/country-province/provinces',
        keySchema: ProvinceKeySchema,
        load: ({ countryId }) =>
          Effect.succeed([
            { code: `${countryId}-01`, name: 'Province 01' },
            { code: `${countryId}-02`, name: 'Province 02' },
          ]),
      })

      const form = Form.make(
        'Form.RequiredWitness.CountryProvinceCandidates',
        {
          values: ValuesSchema,
          initialValues: {
            countryId: 'CN',
            provinceId: '',
            provinceResource: Resource.Snapshot.idle(),
          },
        },
        (form) => {
          form.field('provinceResource').source({
            resource: provincesByCountry,
            deps: ['countryId'],
            key: (countryId) => (countryId ? { countryId } : undefined),
            triggers: ['onMount', 'onKeyChange'],
            submitImpact: 'observe',
          })
          form.field('provinceResource').companion({
            deps: ['countryId'],
            lower: (ctx) => {
              const source = ctx.source as any
              if (source?.status !== 'success') {
                return {
                  availability: { kind: ctx.deps.countryId ? 'disabled' : 'hidden' },
                  candidates: { items: [] },
                }
              }
              return {
                availability: { kind: 'interactive' },
                candidates: {
                  items: source.data,
                  keepCurrent: true,
                  project: { value: 'code', label: 'name' },
                },
              }
            },
          })
        },
      )

      const runtime = Logix.Runtime.make(form, {
        layer: Resource.layer([provincesByCountry]) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any

        yield* waitForAsync

        const mountedState: any = yield* handle.getState
        expect(mountedState.provinceResource?.status).toBe('success')
        expect(mountedState.provinceResource?.data?.[0]?.code).toBe('CN-01')
        expect(mountedState.ui?.provinceResource?.$companion).toMatchObject({
          availability: { kind: 'interactive' },
          candidates: {
            keepCurrent: true,
            project: { value: 'code', label: 'name' },
          },
        })
        expect(mountedState.errors?.provinceResource).toBeUndefined()

        yield* handle.field('countryId').set('US')
        yield* waitForAsync

        const refreshedState: any = yield* handle.getState
        expect(refreshedState.provinceResource?.status).toBe('success')
        expect(refreshedState.provinceResource?.data?.[0]?.code).toBe('US-01')
        expect(refreshedState.errors?.provinceResource).toBeUndefined()
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  it.effect('covers invite/username uniqueness without rule-owned remote fetch', () =>
    Effect.gen(function* () {
      const UniquenessKeySchema = Schema.Struct({
        username: Schema.String,
        inviteCode: Schema.String,
      })

      const ValuesSchema = Schema.Struct({
        username: Schema.String,
        inviteCode: Schema.String,
        uniquenessResource: Schema.Unknown,
      })

      const uniqueness = Resource.make({
        id: 'witness/invite-username/uniqueness',
        keySchema: UniquenessKeySchema,
        load: ({ username, inviteCode }) =>
          Effect.succeed({
            usernameAvailable: username !== 'taken',
            inviteValid: inviteCode !== 'bad-invite',
          }),
      })

      const form = Form.make(
        'Form.RequiredWitness.InviteUsernameUniqueness',
        {
          values: ValuesSchema,
          validateOn: ['onSubmit'],
          initialValues: {
            username: 'taken',
            inviteCode: 'bad-invite',
            uniquenessResource: Resource.Snapshot.idle(),
          },
        },
        (form) => {
          form.field('uniquenessResource').source({
            resource: uniqueness,
            deps: ['username', 'inviteCode'],
            key: (username, inviteCode) =>
              username && inviteCode ? { username: String(username), inviteCode: String(inviteCode) } : undefined,
            triggers: ['onMount', 'onKeyChange'],
            submitImpact: 'block',
          })
          form.field('username').rule({
            deps: ['uniquenessResource'],
            validate: (_value: unknown, ctx: any) => {
              const receipt = ctx.state?.uniquenessResource as any
              if (receipt?.status !== 'success') return undefined
              if (receipt.data?.usernameAvailable === false) return 'username-taken'
              if (receipt.data?.inviteValid === false) return 'invite-invalid'
              return undefined
            },
          })
          form.submit()
        },
      )

      const runtime = Logix.Runtime.make(form, {
        layer: Resource.layer([uniqueness]) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any

        yield* waitForAsync

        const loadedState: any = yield* handle.getState
        expect(loadedState.uniquenessResource?.status).toBe('success')
        expect(loadedState.errors?.uniquenessResource).toBeUndefined()

        let validCount = 0
        let invalidCount = 0
        yield* handle.submit({
          onValid: () =>
            Effect.sync(() => {
              validCount += 1
            }),
          onInvalid: () =>
            Effect.sync(() => {
              invalidCount += 1
            }),
        })

        const invalidState: any = yield* handle.getState
        expect(validCount).toBe(0)
        expect(invalidCount).toBe(1)
        expect(invalidState.errors?.username).toBe('username-taken')
        expect(invalidState.$form.submitAttempt.blockingBasis).toBe('error')
        expect(invalidState.$form.submitAttempt.summary.evidence.family).toBe('error')

        yield* handle.field('username').set('available')
        yield* handle.field('inviteCode').set('ok-invite')
        yield* waitForAsync
        yield* handle.submit()

        const validState: any = yield* handle.getState
        expect(validState.uniquenessResource?.status).toBe('success')
        expect(validState.uniquenessResource?.data).toEqual({ usernameAvailable: true, inviteValid: true })
        expect(validState.errors?.username).toBeUndefined()
        expect(validState.$form.submitAttempt.blockingBasis).toBe('none')
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  it.effect('covers row-local sku / quote lookup with row owner identity', () =>
    Effect.gen(function* () {
      const QuoteKeySchema = Schema.Struct({
        sku: Schema.String,
      })

      const RowSchema = Schema.Struct({
        id: Schema.String,
        sku: Schema.String,
        quoteResource: Schema.Unknown,
      })

      const ValuesSchema = Schema.Struct({
        items: Schema.Array(RowSchema),
      })

      const quoteLookup = Resource.make({
        id: 'witness/row-local-sku-quote/lookup',
        keySchema: QuoteKeySchema,
        load: ({ sku }) => Effect.succeed({ sku, quote: `quote:${sku}` }),
      })

      const form = Form.make(
        'Form.RequiredWitness.RowLocalSkuQuoteLookup',
        {
          values: ValuesSchema,
          initialValues: {
            items: [
              { id: 'row-1', sku: 'SKU-1', quoteResource: Resource.Snapshot.idle() },
              { id: 'row-2', sku: 'SKU-2', quoteResource: Resource.Snapshot.idle() },
            ],
          },
        },
        (form) => {
          form.list('items', {
            identity: { mode: 'trackBy', trackBy: 'id' },
          })
          form.field('items.quoteResource').source({
            resource: quoteLookup,
            deps: ['items.sku'],
            key: (sku) => (sku ? { sku: String(sku) } : undefined),
            triggers: ['onMount', 'onKeyChange'],
            submitImpact: 'observe',
          })
        },
      )

      const runtime = Logix.Runtime.make(form, {
        layer: Resource.layer([quoteLookup]) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any

        yield* waitForAsync

        const mountedState: any = yield* handle.getState
        expect(mountedState.items?.[0]?.quoteResource?.data).toEqual({ sku: 'SKU-1', quote: 'quote:SKU-1' })
        expect(mountedState.items?.[1]?.quoteResource?.data).toEqual({ sku: 'SKU-2', quote: 'quote:SKU-2' })

        yield* handle.fieldArray('items').swap(0, 1)
        yield* waitForAsync

        const swappedState: any = yield* handle.getState
        expect(swappedState.items?.[0]?.id).toBe('row-2')
        expect(swappedState.items?.[0]?.quoteResource?.data?.sku).toBe('SKU-2')
        expect(swappedState.items?.[1]?.id).toBe('row-1')
        expect(swappedState.items?.[1]?.quoteResource?.data?.sku).toBe('SKU-1')
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

})
