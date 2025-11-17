import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import * as Logix from '@logix/core'
import { makeFormModule } from '../fixtures/listScopeCheck.js'

describe('Form list-scope uniqueWarehouse (onChange, no submit)', () => {
  it.scoped('writes cross-row errors into $list/rows[] and keeps them in sync', () =>
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
        const rows0: any[] = s0.errors?.items?.rows ?? []
        expect(rows0[0]).toBeUndefined()
        expect(rows0[1]).toBeUndefined()

        // Empty values: do not participate in cross-row conflicts (requiredness is expressed by a separate rule).
        yield* controller.field('items.0.warehouseId').set('')
        yield* controller.field('items.1.warehouseId').set('')
        yield* Effect.sleep('20 millis')

        const sEmpty: any = yield* controller.getState
        const rowsEmpty: any[] = sEmpty.errors?.items?.rows ?? []
        expect(rowsEmpty[0]).toBeUndefined()
        expect(rowsEmpty[1]).toBeUndefined()

        // Create duplicates: rows 0/1 should be marked invalid immediately (no submit required).
        yield* controller.field('items.0.warehouseId').set('WH-DUP')
        yield* controller.field('items.1.warehouseId').set('WH-DUP')
        yield* Effect.sleep('20 millis')

        const s1: any = yield* controller.getState
        const rows1: any[] = s1.errors?.items?.rows ?? []
        expect(rows1[0]?.warehouseId).toBe('仓库选择需跨行互斥（当前重复）')
        expect(rows1[1]?.warehouseId).toBe('仓库选择需跨行互斥（当前重复）')
        expect(rows1[0]?.$rowId).toBe(s1.items?.[0]?.id)
        expect(rows1[1]?.$rowId).toBe(s1.items?.[1]?.id)

        // Remove duplication: after row 1 becomes unique again, both errors should be cleared in sync.
        yield* controller.field('items.1.warehouseId').set('WH-001')
        yield* Effect.sleep('20 millis')

        const s2: any = yield* controller.getState
        const rows2: any[] = s2.errors?.items?.rows ?? []
        expect(rows2[0]).toBeUndefined()
        expect(rows2[1]).toBeUndefined()
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
