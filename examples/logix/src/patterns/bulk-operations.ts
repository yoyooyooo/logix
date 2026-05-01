/**
 * @pattern 批量操作通用模式 (Bulk Operations Pattern)
 * @description
 *   将“Selection + BulkOperationService + NotificationService”的批量处理逻辑
 *   抽离为可复用的 `(input) => Effect` 资产。
 */

import { Data, Effect, Layer, ServiceMap } from 'effect'

// ---------------------------------------------------------------------------
// 错误建模：BulkOperationPatternError
// ---------------------------------------------------------------------------

export class BulkOperationPatternError extends Data.TaggedError('BulkOperationPatternError')<{
  readonly operation: string
  readonly reason: string
}> {}

// ---------------------------------------------------------------------------
// Services：Selection / BulkOperation / Notification（可在多场景复用）
// ---------------------------------------------------------------------------

export class SelectionService extends ServiceMap.Service<
  SelectionService,
  { readonly getSelectedIds: () => Effect.Effect<ReadonlyArray<string>> }
>()('SelectionService') {}

export const SelectionServiceLive = Layer.effect(
  SelectionService,
  Effect.gen(function* () {
    const getSelectedIds = () =>
      Effect.gen(function* () {
        return ['id-1', 'id-2']
      })

    return {
      getSelectedIds,
    }
  }),
)

export class BulkOperationService extends ServiceMap.Service<
  BulkOperationService,
  { readonly applyToMany: (input: { ids: ReadonlyArray<string>; operation: string }) => Effect.Effect<void> }
>()('BulkOperationService') {}

export const BulkOperationServiceLive = Layer.effect(
  BulkOperationService,
  Effect.gen(function* () {
    const applyToMany = (input: { ids: ReadonlyArray<string>; operation: string }) =>
      Effect.gen(function* () {
        console.log('[BulkOperationService] apply', input.operation, 'to', input.ids)
      })

    return {
      applyToMany,
    }
  }),
)

export class NotificationService extends ServiceMap.Service<
  NotificationService,
  { readonly info: (message: string) => Effect.Effect<void>; readonly error: (message: string) => Effect.Effect<void> }
>()('NotificationService') {}

export const NotificationServiceLive = Layer.effect(
  NotificationService,
  Effect.gen(function* () {
    const info = (message: string) =>
      Effect.sync(() => {
        console.log('[Notification] info:', message)
      })

    const error = (message: string) =>
      Effect.sync(() => {
        console.error('[Notification] error:', message)
      })

    return {
      info,
      error,
    }
  }),
)

// ---------------------------------------------------------------------------
// Pattern：封装批量操作的长逻辑
// ---------------------------------------------------------------------------

export interface BulkOperationPatternInput {
  operation: string
  emptyMessage?: string
}

/**
 * runBulkOperationPattern
 *
 * - 读取 SelectionService 中的选中项；
 * - 为空时通过 NotificationService 提示用户；
 * - 非空时调用 BulkOperationService.applyToMany，并返回作用条数。
 */
export const runBulkOperationPattern = (input: BulkOperationPatternInput) =>
  Effect.gen(function* () {
    const selection = yield* Effect.service(SelectionService).pipe(Effect.orDie)
    const bulk = yield* Effect.service(BulkOperationService).pipe(Effect.orDie)
    const notify = yield* Effect.service(NotificationService).pipe(Effect.orDie)

    const ids = yield* selection.getSelectedIds()

    if (ids.length === 0) {
      yield* notify.info(input.emptyMessage ?? '请先选择记录')
      return 0
    }

    // 示例：当 operation 为 "fail" 时模拟批量操作失败，映射为领域错误。
    if (input.operation === 'fail') {
      return yield* Effect.fail(
        new BulkOperationPatternError({
          operation: input.operation,
          reason: 'Simulated bulk operation failure for demo',
        }),
      )
    }

    yield* bulk.applyToMany({ ids: Array.from(ids), operation: input.operation })
    return ids.length
  })
