import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import * as Logix from '@logixjs/core'
import { makeFormModule } from '../fixtures/listScopeCheck.js'

describe('Form list-scope reValidate gate (submitCount)', () => {
  it.scoped('pre-submit skips auto validate; post-submit re-validates onChange', () =>
    Effect.gen(function* () {
      const form = makeFormModule({
        rowCount: 3,
        validateOn: ['onSubmit'],
        reValidateOn: ['onChange'],
      })

      const runtime = Logix.Runtime.make(form, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* form.tag
        const controller = form.controller.make(rt)

        // Pre-submit: `onChange` does not auto-validate (no cross-row errors).
        yield* controller.field('items.0.warehouseId').set('WH-DUP')
        yield* controller.field('items.1.warehouseId').set('WH-DUP')
        yield* Effect.sleep('20 millis')

        const s1: any = yield* controller.getState
        const rows1: any[] = s1.errors?.items?.rows ?? []
        expect(rows1[0]).toBeUndefined()
        expect(rows1[1]).toBeUndefined()
        expect(s1.$form.submitCount).toBe(0)

        // Submit: root validate must run full validation, produce cross-row errors, and increment submitCount.
        let invalid = 0
        yield* controller.controller.handleSubmit({
          onValid: () => Effect.void,
          onInvalid: () =>
            Effect.sync(() => {
              invalid += 1
            }),
        })

        const s2: any = yield* controller.getState
        const rows2: any[] = s2.errors?.items?.rows ?? []
        expect(invalid).toBe(1)
        expect(s2.$form.submitCount).toBe(1)
        expect(rows2[0]?.warehouseId).toBe('仓库选择需跨行互斥（当前重复）')
        expect(rows2[1]?.warehouseId).toBe('仓库选择需跨行互斥（当前重复）')

        // Post-submit: with reValidateOn=["onChange"], errors should be cleared automatically after duplication is removed.
        yield* controller.field('items.1.warehouseId').set('WH-001')
        yield* Effect.sleep('20 millis')

        const s3: any = yield* controller.getState
        const rows3: any[] = s3.errors?.items?.rows ?? []
        expect(rows3[0]).toBeUndefined()
        expect(rows3[1]).toBeUndefined()
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
