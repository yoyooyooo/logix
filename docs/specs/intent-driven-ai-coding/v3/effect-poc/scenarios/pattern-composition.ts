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
import { Logix, Logic } from '../shared/logix-v3-core'
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

const CompositionActionMap = {
  'combo/run': Schema.Void,
  'combo/reset': Schema.Void,
}

export type CompositionShape = Logix.Shape<typeof CompositionStateSchema, typeof CompositionActionMap>
export type CompositionState = Logix.StateOf<CompositionShape>
export type CompositionAction = Logix.ActionOf<CompositionShape>

// ---------------------------------------------------------------------------
// Module：定义组合场景模块
// ---------------------------------------------------------------------------

export const CompositionModule = Logix.Module('CompositionModule', {
  state: CompositionStateSchema,
  actions: CompositionActionMap,
})

// ---------------------------------------------------------------------------
// Logic：一次操作串联两个 Pattern（Bulk + Import）（通过 Module.logic 注入 $）
// ---------------------------------------------------------------------------

export const CompositionLogic = CompositionModule.logic<
  SelectionService | BulkOperationService | NotificationService | FileUploadService | ImportService
>(($: Logic.BoundApi<CompositionShape, SelectionService | BulkOperationService | NotificationService | FileUploadService | ImportService>) =>
  Effect.gen(function* () {
    const handleRun = Effect.gen(function* () {
      // 标记为 running
      yield* $.state.update((prev: CompositionState) => ({
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
      yield* $.state.update((prev: CompositionState) => ({
        ...prev,
        lastBulkCount: bulkCount,
        lastImportTaskId: taskId,
        status: 'done',
      }))
    })

    const handleReset = $.state.update((prev: CompositionState) => ({
      ...prev,
      lastBulkCount: 0,
      lastImportTaskId: undefined,
      status: 'idle',
    }))

    yield* $.onAction('combo/run').runExhaust(handleRun)
    yield* $.onAction('combo/reset').run(handleReset)
  }),
)

// ---------------------------------------------------------------------------
// Live：组合 State / Action / Logic
// ---------------------------------------------------------------------------

export const CompositionLive = CompositionModule.live(
  {
    lastBulkCount: 0,
    lastImportTaskId: undefined,
    status: 'idle',
  },
  CompositionLogic,
)
