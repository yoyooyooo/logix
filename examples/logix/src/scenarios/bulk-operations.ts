/**
 * @scenario 批量操作 (Bulk Operations)
 * @description 演示 Selection + 批量服务调用 + 空集提示 的典型场景。
 *
 * 场景：
 *   - SelectionService 提供当前选中记录的 id 列表；
 *   - 用户触发 `bulk/run` Action，执行指定 operation；
 *   - 当没有选中项时，通过 NotificationService 提示用户；
 *   - 当有选中项时，调用 BulkOperationService.applyToMany，并在本地记录最后一次操作的信息。
 */

import { Effect, Schema } from 'effect'
import { Logix } from '@logix/core'
import {
  BulkOperationPatternError,
  SelectionService,
  BulkOperationService,
  NotificationService,
  runBulkOperationPattern,
} from '../patterns/bulk-operations.js'

// ---------------------------------------------------------------------------
// Schema → Shape：批量操作的 State / Action
// ---------------------------------------------------------------------------

const BulkStateSchema = Schema.Struct({
  operation: Schema.String,
  lastCount: Schema.Number,
  lastMessage: Schema.optional(Schema.String),
})

const BulkActionMap = {
  'bulk/run': Schema.Void,
  'bulk/resetMessage': Schema.Void,
}

export type BulkShape = Logix.Shape<typeof BulkStateSchema, typeof BulkActionMap>
export type BulkState = Logix.StateOf<BulkShape>
export type BulkAction = Logix.ActionOf<BulkShape>

// ---------------------------------------------------------------------------
// Module：定义批量操作模块
// ---------------------------------------------------------------------------

export const BulkModule = Logix.Module('BulkModule', {
  state: BulkStateSchema,
  actions: BulkActionMap,
})

// ---------------------------------------------------------------------------
// Logic：监听 bulk/run，触发 Pattern，并更新本地 State（通过 Module.logic 注入 $）
// ---------------------------------------------------------------------------

export const BulkLogic = BulkModule.logic<
  SelectionService | BulkOperationService | NotificationService
>(($: Logix.BoundApi<
  BulkShape,
  SelectionService | BulkOperationService | NotificationService
>) =>
  Effect.gen(function* () {
    const handleRun = Effect.gen(function* () {
      const current = yield* $.state.read

      const count = yield* runBulkOperationPattern({ operation: current.operation }).pipe(
        Effect.catchTag('BulkOperationPatternError', (err: BulkOperationPatternError) =>
          Effect.gen(function* () {
            const notify = yield* $.use(NotificationService)
            yield* notify.error(err.reason)
            return 0
          }),
        ),
      )

      yield* $.state.update((prev) => ({
          ...prev,
          lastCount: count,
          lastMessage: count > 0 ? `本次 ${prev.operation} 作用于 ${count} 条记录` : prev.lastMessage,
        }))
    })

    const handleReset = $.state.update((prev) => ({
        ...prev,
        lastMessage: undefined,
      }))

    yield* $.onAction('bulk/run').runExhaust(handleRun)
    yield* $.onAction('bulk/resetMessage').run(handleReset)
  }),
)

// ---------------------------------------------------------------------------
// Impl / Live：组合 State / Action / Logic
// ---------------------------------------------------------------------------

export const BulkImpl = BulkModule.make<SelectionService | BulkOperationService | NotificationService>({
  initial: {
    operation: 'archive',
    lastCount: 0,
    lastMessage: undefined,
  },
  logics: [BulkLogic],
})

export const BulkLive = BulkImpl.layer
