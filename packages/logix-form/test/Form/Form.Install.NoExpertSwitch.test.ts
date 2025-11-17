import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import * as Logix from '@logix/core'
import { makeFormModule } from '../fixtures/listScopeCheck.js'

describe('Form.install (no expert switch)', () => {
  it.scoped('onChange should refresh list-scope checks without listValidateOnChange', () =>
    Effect.gen(function* () {
      const form = makeFormModule({
        rowCount: 3,
        validateOn: ['onChange'],
        reValidateOn: ['onChange'],
      })

      const runtime = Logix.Runtime.make(form, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* form.tag
        const controller = form.controller.make(rt)

        // Initial: no errors
        const s0: any = yield* controller.getState
        expect((s0.errors?.items?.rows ?? [])[0]).toBeUndefined()

        // Create duplicates: rows 0/1 should be marked invalid immediately (no listValidateOnChange switch needed).
        yield* controller.field('items.0.warehouseId').set('WH-DUP')
        yield* controller.field('items.1.warehouseId').set('WH-DUP')
        yield* Effect.sleep('20 millis')

        const s1: any = yield* controller.getState
        const rows1: any[] = s1.errors?.items?.rows ?? []
        expect(rows1[0]?.warehouseId).toBe('仓库选择需跨行互斥（当前重复）')
        expect(rows1[1]?.warehouseId).toBe('仓库选择需跨行互斥（当前重复）')
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
