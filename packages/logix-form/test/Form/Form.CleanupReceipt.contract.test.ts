import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '../../src/index.js'
import { cleanupReceiptPath } from '../../src/internal/form/arrays.js'
import { makeCleanupSubjectRef } from '../../src/internal/form/rowid.js'
import { materializeExtendedHandle } from '../support/form-harness.js'

const waitForAsync = Effect.promise(
  () =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, 20)
    }),
)

const hasLiveEntries = (entries: ReadonlyArray<unknown> | undefined): boolean =>
  Array.isArray(entries)
    ? entries.some((entry) => {
        if (entry === undefined || entry === null) return false
        if (typeof entry !== 'object') return true
        return Object.keys(entry as Record<string, unknown>).length > 0
      })
    : false

describe('Form cleanup receipt contract', () => {
  it('centralizes cleanup receipt authority helpers', () => {
    expect(cleanupReceiptPath('items')).toBe('ui.$cleanup.items')
    expect(makeCleanupSubjectRef('items')).toEqual({
      kind: 'cleanup',
      id: 'items',
    })
  })

  it.effect('writes and clears list-root cleanup receipt across structural edits', () =>
    Effect.gen(function* () {
      const RowSchema = Schema.Struct({
        id: Schema.String,
        sku: Schema.String,
      })

      const ValuesSchema = Schema.Struct({
        items: Schema.Array(RowSchema),
      })

      const form = Form.make(
        'Form.CleanupReceipt.Contract',
        {
          values: ValuesSchema,
          initialValues: {
            items: [
              { id: 'row-1', sku: 'A' },
              { id: 'row-2', sku: 'B' },
            ],
          },
        },
        (form) => {
          form.list('items', {
            identity: { mode: 'trackBy', trackBy: 'id' },
          })
        },
      )

      const runtime = Logix.Runtime.make(form, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any

        let state: any = yield* handle.getState
        expect(state.ui?.$cleanup?.items).toBeUndefined()

        yield* handle.fieldArray('items').remove(1)

        state = yield* handle.getState
        expect(state.ui?.$cleanup?.items).toEqual({
          kind: 'cleanup',
          cause: 'remove',
          reasonSlotId: 'cleanup:items',
          sourceRef: 'ui.$cleanup.items',
          subjectRef: {
            kind: 'cleanup',
            id: 'items',
          },
        })

        yield* handle.fieldArray('items').append({ id: 'row-3', sku: 'C' })

        state = yield* handle.getState
        expect(state.ui?.$cleanup?.items).toBeUndefined()

        yield* handle.fieldArray('items').replace([{ id: 'row-x', sku: 'X' }])

        state = yield* handle.getState
        expect(state.ui?.$cleanup?.items).toEqual({
          kind: 'cleanup',
          cause: 'replace',
          reasonSlotId: 'cleanup:items',
          sourceRef: 'ui.$cleanup.items',
          subjectRef: {
            kind: 'cleanup',
            id: 'items',
          },
        })
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  it.effect('removes the last row by retiring live heads and leaving only cleanup receipt evidence', () =>
    Effect.gen(function* () {
      const RowSchema = Schema.Struct({
        id: Schema.String,
        sku: Schema.String,
      })

      const ValuesSchema = Schema.Struct({
        items: Schema.Array(RowSchema),
      })

      const form = Form.make(
        'Form.CleanupReceipt.Contract.ActiveExit',
        {
          values: ValuesSchema,
          initialValues: {
            items: [{ id: 'row-1', sku: 'A' }],
          },
        },
        (form) => {
          form.list('items', {
            identity: { mode: 'trackBy', trackBy: 'id' },
          })
        },
      )

      const runtime = Logix.Runtime.make(form, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any

        yield* handle.field('items.0.sku').set('A-1')
        yield* handle.field('items.0.sku').blur()
        yield* handle.dispatch({
          _tag: 'setValue',
          payload: {
            path: 'errors.items.rows',
            value: [{ $rowId: 'row-1', sku: 'dup' }],
          },
        } as any)
        yield* handle.dispatch({
          _tag: 'setValue',
          payload: {
            path: 'errors.$manual.items.rows',
            value: [{ sku: 'manual-row-error' }],
          },
        } as any)
        yield* waitForAsync

        const beforeRemove: any = yield* handle.getState
        expect(beforeRemove.ui?.items?.[0]?.sku).toEqual({
          dirty: true,
          touched: true,
        })
        expect(beforeRemove.errors?.items?.rows?.[0]).toEqual({
          $rowId: 'row-1',
          sku: 'dup',
        })
        expect(beforeRemove.errors?.$manual?.items?.rows?.[0]).toEqual({
          sku: 'manual-row-error',
        })

        yield* handle.fieldArray('items').remove(0)
        yield* waitForAsync

        const afterRemove: any = yield* handle.getState
        expect(afterRemove.items).toEqual([])
        expect(afterRemove.ui?.$cleanup?.items).toEqual({
          kind: 'cleanup',
          cause: 'remove',
          reasonSlotId: 'cleanup:items',
          sourceRef: 'ui.$cleanup.items',
          subjectRef: {
            kind: 'cleanup',
            id: 'items',
          },
        })
        expect(hasLiveEntries(afterRemove.ui?.items)).toBe(false)
        expect(hasLiveEntries(afterRemove.errors?.items?.rows)).toBe(false)
        expect(hasLiveEntries(afterRemove.errors?.$manual?.items?.rows)).toBe(false)
        expect(afterRemove.$form?.errorCount).toBe(0)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  it.effect('replaces a roster by retiring previous live heads before the new roster continues', () =>
    Effect.gen(function* () {
      const RowSchema = Schema.Struct({
        id: Schema.String,
        sku: Schema.String,
      })

      const ValuesSchema = Schema.Struct({
        items: Schema.Array(RowSchema),
      })

      const form = Form.make(
        'Form.CleanupReceipt.Contract.ReplaceRetirement',
        {
          values: ValuesSchema,
          initialValues: {
            items: [
              { id: 'row-0', sku: 'A' },
              { id: 'row-1', sku: 'B' },
            ],
          },
        },
        (form) => {
          form.list('items', {
            identity: { mode: 'trackBy', trackBy: 'id' },
          })
        },
      )

      const runtime = Logix.Runtime.make(form, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any

        yield* handle.dispatch({
          _tag: 'setValue',
          payload: {
            path: 'ui.items',
            value: [{ sku: { dirty: true, touched: true } }, { sku: { dirty: true } }],
          },
        } as any)
        yield* handle.dispatch({
          _tag: 'setValue',
          payload: {
            path: 'errors.items.rows',
            value: [{ $rowId: 'row-0', sku: 'dup' }, { $rowId: 'row-1', sku: 'dup' }],
          },
        } as any)
        yield* handle.dispatch({
          _tag: 'setValue',
          payload: {
            path: 'errors.$manual.items.rows',
            value: [{ sku: 'manual-a' }, { sku: 'manual-b' }],
          },
        } as any)
        yield* waitForAsync

        const beforeReplace: any = yield* handle.getState
        const oldRowIds = (beforeReplace.errors?.items?.rows ?? []).map((row: any) => String(row?.$rowId ?? ''))

        expect(oldRowIds).toEqual(['row-0', 'row-1'])
        expect(beforeReplace.ui?.items?.[0]?.sku).toEqual({ dirty: true, touched: true })
        expect(beforeReplace.ui?.items?.[1]?.sku).toEqual({ dirty: true })
        expect(beforeReplace.errors?.$manual?.items?.rows?.[0]).toEqual({
          sku: 'manual-a',
        })
        expect(beforeReplace.errors?.$manual?.items?.rows?.[1]).toEqual({
          sku: 'manual-b',
        })

        yield* handle.fieldArray('items').replace([{ id: 'row-x', sku: 'X' }])
        yield* waitForAsync

        const afterReplace: any = yield* handle.getState
        expect(afterReplace.items).toEqual([{ id: 'row-x', sku: 'X' }])
        expect(afterReplace.ui?.$cleanup?.items).toEqual({
          kind: 'cleanup',
          cause: 'replace',
          reasonSlotId: 'cleanup:items',
          sourceRef: 'ui.$cleanup.items',
          subjectRef: {
            kind: 'cleanup',
            id: 'items',
          },
        })
        expect(hasLiveEntries(afterReplace.ui?.items)).toBe(false)
        expect(hasLiveEntries(afterReplace.errors?.items?.rows)).toBe(false)
        expect(hasLiveEntries(afterReplace.errors?.$manual?.items?.rows)).toBe(false)
        expect(JSON.stringify(afterReplace.errors?.items ?? {})).not.toContain(oldRowIds[0] ?? 'row-0')
        expect(JSON.stringify(afterReplace.errors?.items ?? {})).not.toContain(oldRowIds[1] ?? 'row-1')
        expect(afterReplace.$form?.errorCount).toBe(0)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
