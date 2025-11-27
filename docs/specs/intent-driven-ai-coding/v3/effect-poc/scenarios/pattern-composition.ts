/**
 * @scenario Pattern 组合复用示例 (Pattern Composition Demo)
 * @description
 *   演示在单个 Logic 中组合复用两个独立的 pattern-style Effect：
 *   - 批量操作 Pattern：runBulkOperationPattern（Selection + BulkOperation + Notification）；
 *   - 文件导入 Pattern：runUploadAndStartImportPattern（FileUpload + ImportService）。
 *
 * 目标：
 *   - 验证多个 `(input) => Effect` Pattern 在类型层面（E / R）可以自然组合；
 *   - 展示在真实场景中“一次操作串联多个 Pattern”时，Logix/Effect-ts 的写法。
 */

import { Effect, Schema } from 'effect'
import { Store, Logic } from '../shared/logix-v3-core'
import {
  runBulkOperationPattern,
  SelectionService,
  BulkOperationService,
  NotificationService,
} from '../patterns/bulk-operations'
import { runUploadAndStartImportPattern, FileUploadService, ImportService } from '../patterns/file-import-flow'

// ---------------------------------------------------------------------------
// Schema → Shape：组合场景的 State / Action
// ---------------------------------------------------------------------------

const CompositionStateSchema = Schema.Struct({
  lastBulkCount: Schema.Number,
  lastImportTaskId: Schema.optional(Schema.String),
  status: Schema.Literal('idle', 'running', 'done'),
})

const CompositionActionSchema = Schema.Union(
  Schema.Struct({ _tag: Schema.Literal('combo/run') }),
  Schema.Struct({ _tag: Schema.Literal('combo/reset') }),
)

export type CompositionShape = Store.Shape<typeof CompositionStateSchema, typeof CompositionActionSchema>
export type CompositionState = Store.StateOf<CompositionShape>
export type CompositionAction = Store.ActionOf<CompositionShape>

// ---------------------------------------------------------------------------
// Logic：一次操作串联两个 Pattern（Bulk + Import）
// ---------------------------------------------------------------------------

const $ = Logic.forShape<
  CompositionShape,
  SelectionService | BulkOperationService | NotificationService | FileUploadService | ImportService
>()

export const CompositionLogic = Logic.make<
  CompositionShape,
  SelectionService | BulkOperationService | NotificationService | FileUploadService | ImportService
>(
  Effect.gen(function* () {
    const run$ = $.flow.fromAction((a): a is { _tag: 'combo/run' } => a._tag === 'combo/run')
    const reset$ = $.flow.fromAction((a): a is { _tag: 'combo/reset' } => a._tag === 'combo/reset')

    const handleRun = Effect.gen(function* () {
      // 标记为 running
      yield* $.state.update((prev) => ({
        ...prev,
        status: 'running',
      }))

      // 使用两个独立的 Pattern：
      // - 先执行批量操作（例如批量归档），记录作用条数；
      // - 再启动一次导入任务，记录 taskId。
      const bulkCount = yield* runBulkOperationPattern({ operation: 'archive' })

      const taskId = yield* runUploadAndStartImportPattern({
        fileName: 'demo.csv',
        fileSize: 123,
      })

      // 更新组合场景的 State
      yield* $.state.update((prev) => ({
        ...prev,
        lastBulkCount: bulkCount,
        lastImportTaskId: taskId,
        status: 'done',
      }))
    })

    const handleReset = $.state.update((prev) => ({
      ...prev,
      lastBulkCount: 0,
      lastImportTaskId: undefined,
      status: 'idle',
    }))

    yield* Effect.all([
      run$.pipe($.flow.run(handleRun)),
      reset$.pipe($.flow.run(handleReset)),
    ])
  }),
)

// ---------------------------------------------------------------------------
// Store：组合 State / Action / Logic
// ---------------------------------------------------------------------------

const CompositionStateLayer = Store.State.make(CompositionStateSchema, {
  lastBulkCount: 0,
  lastImportTaskId: undefined,
  status: 'idle',
})

const CompositionActionLayer = Store.Actions.make(CompositionActionSchema)

export const CompositionStore = Store.make<CompositionShape>(
  CompositionStateLayer,
  CompositionActionLayer,
  CompositionLogic,
)
