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
import { Store, Logic } from '../shared/logix-v3-core'
import {
  BulkOperationPatternError,
  SelectionService,
  BulkOperationService,
  NotificationService,
  runBulkOperationPattern,
} from '../patterns/bulk-operations'

// ---------------------------------------------------------------------------
// Schema → Shape：批量操作的 State / Action
// ---------------------------------------------------------------------------

const BulkStateSchema = Schema.Struct({
  operation: Schema.String,
  lastCount: Schema.Number,
  lastMessage: Schema.optional(Schema.String),
})

const BulkActionSchema = Schema.Union(
  Schema.Struct({ _tag: Schema.Literal('bulk/run') }),
  Schema.Struct({ _tag: Schema.Literal('bulk/resetMessage') }),
)

export type BulkShape = Store.Shape<typeof BulkStateSchema, typeof BulkActionSchema>
export type BulkState = Store.StateOf<BulkShape>
export type BulkAction = Store.ActionOf<BulkShape>

// ---------------------------------------------------------------------------
// Logic：监听 bulk/run，触发 Pattern，并更新本地 State
// ---------------------------------------------------------------------------

const $ = Logic.forShape<BulkShape, SelectionService | BulkOperationService | NotificationService>()

export const BulkLogic = Logic.make<BulkShape, SelectionService | BulkOperationService | NotificationService>(
  Effect.gen(function* () {
    const run$ = $.flow.fromAction((a): a is { _tag: 'bulk/run' } => a._tag === 'bulk/run')
    const resetMessage$ = $.flow.fromAction(
      (a): a is { _tag: 'bulk/resetMessage' } => a._tag === 'bulk/resetMessage',
    )

    const handleRun = Effect.gen(function* () {
      const current = yield* $.state.read

      const count = yield* $.control.tryCatch({
          try: runBulkOperationPattern({ operation: current.operation }),
          catch: (err: BulkOperationPatternError) =>
            Effect.gen(function* () {
              const notify = yield* $.services(NotificationService)
              yield* notify.error(err.reason)
              return 0
            }),
        })

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

    yield* Effect.all([
      run$.pipe($.flow.runExhaust(handleRun)),
      resetMessage$.pipe($.flow.run(handleReset)),
    ])
  }),
)

// ---------------------------------------------------------------------------
// Store：组合 State / Action / Logic
// ---------------------------------------------------------------------------

const BulkStateLayer = Store.State.make(BulkStateSchema, {
  operation: 'archive',
  lastCount: 0,
  lastMessage: undefined,
})

const BulkActionLayer = Store.Actions.make(BulkActionSchema)

export const BulkStore = Store.make<BulkShape>(BulkStateLayer, BulkActionLayer, BulkLogic)
