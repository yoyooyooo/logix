import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import * as Logix from '@logixjs/core'
import { makeFormModule } from '../fixtures/listScopeCheck.js'
import { materializeExtendedHandle } from '../support/form-harness.js'

const waitForAsync = Effect.promise(
  () =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, 20)
    }),
)

describe('Form.install (no expert switch)', () => {
  it.effect('onChange should refresh list-scope checks without listValidateOnChange', () =>
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
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any
        yield* waitForAsync

        // Initial: no errors
        const s0: any = yield* handle.getState
        expect((s0.errors?.items?.rows ?? [])[0]).toBeUndefined()

        // Create duplicates: rows 0/1 should be marked invalid immediately (no listValidateOnChange switch needed).
        yield* handle.field('items.0.warehouseId').set('WH-DUP')
        yield* handle.field('items.1.warehouseId').set('WH-DUP')
        yield* waitForAsync

        const s1: any = yield* handle.getState
        const rows1: any[] = s1.errors?.items?.rows ?? []
        expect(rows1[0]?.warehouseId).toBe('仓库选择需跨行互斥（当前重复）')
        expect(rows1[1]?.warehouseId).toBe('仓库选择需跨行互斥（当前重复）')
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
