import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import { readFileSync } from 'node:fs'
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

describe('Form source authoring', () => {
  it('does not expose manual as a day-one source trigger', () => {
    const ValuesSchema = Schema.Struct({
      profileId: Schema.String,
      profileResource: Schema.Unknown,
    })

    if (false) {
      Form.make(
        'Form.Source.ManualTriggerBoundary',
        {
          values: ValuesSchema,
          initialValues: {
            profileId: 'u1',
            profileResource: Resource.Snapshot.idle(),
          },
        },
        (form) => {
          form.field('profileResource').source({
            resource: { id: 'user/profile' },
            deps: ['profileId'],
            key: (profileId) => (profileId ? { userId: profileId } : undefined),
            // @ts-expect-error manual source refresh is not part of the day-one Form source trigger surface.
            triggers: ['manual'],
          })
        },
      )
    }

    expect(true).toBe(true)
  })

  it('keeps source scheduling on one internal path while source.ts stays thin', () => {
    const sourceBarrel = readFileSync(
      new URL('../../../logix-core/src/internal/field-kernel/source.ts', import.meta.url),
      'utf8',
    )
    const sourceImpl = readFileSync(
      new URL('../../../logix-core/src/internal/field-kernel/source.impl.ts', import.meta.url),
      'utf8',
    )
    const installSource = readFileSync(new URL('../../src/internal/form/install.ts', import.meta.url), 'utf8')

    expect(sourceBarrel.trim()).toBe("export * from './source.impl.js'")
    expect(sourceImpl).toMatch(/const recordSourceSnapshotPhase =/)
    expect(sourceImpl).toMatch(/const writeSourceSnapshotIfCurrentKeyHash =/)
    expect(installSource).toMatch(/const refreshArraySourcesAndMaybeValidate =/)
  })

  it.effect('supports field(path).source(...) as a public define route', () =>
    Effect.gen(function* () {
      const KeySchema = Schema.Struct({
        userId: Schema.String,
      })

      const ProfileSchema = Schema.Struct({
        name: Schema.String,
      })

      const ValuesSchema = Schema.Struct({
        profileId: Schema.String,
        profileResource: Schema.Unknown,
      })

      const profileResource = Resource.make({
        id: 'user/profile',
        keySchema: KeySchema,
        load: ({ userId }) => Effect.succeed({ name: `resource:${userId}` }),
      })

      const form = Form.make(
        'Form.Source.Authoring',
        {
          values: ValuesSchema,
          initialValues: {
            profileId: 'u1',
            profileResource: Resource.Snapshot.idle(),
          },
        },
        (form) => {
          form.field('profileResource').source({
            resource: profileResource,
            deps: ['profileId'],
            key: (profileId) => (profileId ? { userId: profileId } : undefined),
            triggers: ['onMount', 'onKeyChange'],
          })
        },
      )

      const runtime = Logix.Runtime.make(form, {
        layer: Resource.layer([profileResource]) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any

        yield* waitForAsync

        const mountedState: any = yield* handle.getState
        expect(mountedState.profileResource?.status).toBe('success')
        expect(mountedState.profileResource?.data?.name).toBe('resource:u1')
        expect(typeof mountedState.profileResource?.keyHash).toBe('string')

        yield* handle.field('profileId').set('u2')
        yield* waitForAsync

        const refreshedState: any = yield* handle.getState
        expect(refreshedState.profileResource?.status).toBe('success')
        expect(refreshedState.profileResource?.data?.name).toBe('resource:u2')
        expect(refreshedState.profileResource?.keyHash).not.toBe(mountedState.profileResource?.keyHash)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
