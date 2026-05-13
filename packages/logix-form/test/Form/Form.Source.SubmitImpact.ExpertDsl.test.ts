import { describe, expect, it } from '@effect/vitest'
import { Duration, Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '../../src/index.js'
import * as Resource from '../../../logix-core/src/Resource.js'
import { materializeExtendedHandle } from '../support/form-harness.js'

const waitForLoading = Effect.promise(
  () =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, 5)
    }),
)

describe('Form source submitImpact via expert dsl', () => {
  it.effect('collects observe policy from field fragments into submit truth', () =>
    Effect.gen(function* () {
      const KeySchema = Schema.Struct({
        userId: Schema.String,
      })

      const ValuesSchema = Schema.Struct({
        profileId: Schema.String,
        profileResource: Schema.Unknown,
      })

      const profileResource = Resource.make({
        id: 'user/profile.submit-impact.dsl',
        keySchema: KeySchema,
        load: ({ userId }) => Effect.sleep(Duration.millis(50)).pipe(Effect.as({ name: `resource:${userId}` })),
      })

      const form = Form.make(
        'Form.Source.SubmitImpact.ExpertDsl',
        {
          values: ValuesSchema,
          initialValues: {
            profileId: 'u1',
            profileResource: Resource.Snapshot.idle(),
          },
        },
        (form) => {
          const z = form.dsl as any
          form.rules(
            z.schema(
              z.object({
                profileResource: z.source({
                  resource: profileResource.id,
                  deps: ['profileId'],
                  key: (profileId: string) => (profileId ? { userId: profileId } : undefined),
                  triggers: ['onMount'],
                  submitImpact: 'observe',
                }),
              }),
            ),
          )
          form.submit()
        },
      )

      const runtime = Logix.Runtime.make(form, {
        layer: Resource.layer([profileResource]) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any

        yield* waitForLoading

        const loadingState: any = yield* handle.getState
        expect(loadingState.profileResource?.status).toBe('loading')

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

        const submittedState: any = yield* handle.getState
        expect(validCount).toBe(1)
        expect(invalidCount).toBe(0)
        expect(submittedState.$form.submitAttempt.blockingBasis).toBe('none')
        expect(submittedState.$form.submitAttempt.pendingCount).toBe(0)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
