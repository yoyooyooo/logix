/**
 * @scenario 批量归档 + 确认 + 通知 (Batch Archive Flow)
 * @description
 *   演示一条典型 ToB 业务链路在 Logix/Pattern 下的表达：
 *   - 用户在列表页点击“批量归档”；
 *   - 系统检查是否有选中项；
 *   - 弹出确认交互（Confirm Pattern）；
 *   - 调用批量归档 Service（Module Service）；
 *   - 根据结果发送通知（Notification Pattern）并触发列表刷新 Action。
 *
 *   该场景对应文档中的 L0–L3 资产链路示例，用作 IntentRule ↔ Code 的金标样板。
 */

import { Context, Effect, Schema, Data } from 'effect'
import { Logix } from '@logix/core'
import {
  ConfirmServiceTag,
  type ConfirmService,
  runConfirmAndThenPattern,
} from '../patterns/confirm.js'
import {
  NotificationServiceTag,
  type NotificationService,
  runNotifyOnResultPattern,
} from '../patterns/notification.js'

// ---------------------------------------------------------------------------
// Module Service 契约：ArchiveService（Tag-only）
// ---------------------------------------------------------------------------

export interface ArchiveService {
  archiveMany: (ids: ReadonlyArray<string>) => Effect.Effect<void, ArchiveError>
}

export class ArchiveError extends Data.TaggedError('ArchiveError')<{
  readonly message: string
}> {}

export class ArchiveServiceTag extends Context.Tag('@svc/ArchiveService')<
  ArchiveServiceTag,
  ArchiveService
>() {}

// ---------------------------------------------------------------------------
// Schema → Shape：列表页的简化 State / Action
// ---------------------------------------------------------------------------

const BatchArchiveStateSchema = Schema.Struct({
  selectedIds: Schema.Array(Schema.String),
  isArchiving: Schema.Boolean,
})

const BatchArchiveActionMap = {
  'batch/archive': Schema.Void,
  'list/refresh': Schema.Void,
}

export type BatchArchiveShape = Logix.Shape<typeof BatchArchiveStateSchema, typeof BatchArchiveActionMap>
export type BatchArchiveState = Logix.StateOf<BatchArchiveShape>
export type BatchArchiveAction = Logix.ActionOf<BatchArchiveShape>

// ---------------------------------------------------------------------------
// Module：定义批量归档模块
// ---------------------------------------------------------------------------

export const BatchArchiveModule = Logix.Module('BatchArchiveModule', {
  state: BatchArchiveStateSchema,
  actions: BatchArchiveActionMap,
})

// ---------------------------------------------------------------------------
// Logic：监听 batch/archive，组合 Guard + Confirm + Service + Notify（通过 Module.logic 注入 $）
// ---------------------------------------------------------------------------

export const BatchArchiveLogic = BatchArchiveModule.logic<
  ConfirmServiceTag | ArchiveServiceTag | NotificationServiceTag
>(($: Logix.BoundApi<
  BatchArchiveShape,
  ConfirmServiceTag | ArchiveServiceTag | NotificationServiceTag
>) =>
  Effect.gen(function* () {
    const handleArchive = Effect.gen(function* () {
      const s = yield* $.state.read
      const ids = s.selectedIds
      const archiveSvc = yield* $.use(ArchiveServiceTag)

      // Guard：没有选中项则直接返回
      if (ids.length === 0) {
        const notify = yield* $.use(NotificationServiceTag)
        yield* notify.info('请选择至少一条记录再执行批量归档')
        return
      }

      // 使用 Confirm Pattern 包裹核心业务 Effect
      const archiveEffect = Effect.gen(function* () {
        yield* $.state.update((prev: BatchArchiveState) => ({ ...prev, isArchiving: true }))

        const result = yield* Effect.either(archiveSvc.archiveMany(ids))

        yield* $.state.update((prev: BatchArchiveState) => ({ ...prev, isArchiving: false }))

        if (result._tag === 'Right') {
          yield* runNotifyOnResultPattern({
            kind: 'success',
            message: `归档成功：${ids.length} 条记录`,
          })
          // 触发列表刷新 Action
          // 使用新的智能 Dispatcher API
          yield* $.actions['list/refresh']()
        } else {
          yield* runNotifyOnResultPattern({
            kind: 'failure',
            message: (result.left as ArchiveError).message,
          })
        }
      })

      yield* runConfirmAndThenPattern({
        message: `确定要归档选中的 ${ids.length} 条记录吗？`,
        effect: archiveEffect,
      })
    })

    yield* $.onAction('batch/archive').runExhaust(handleArchive)
  }).pipe(
    // 收敛错误通道，方便作为 ModuleLogic 使用
    Effect.catchAll(() => Effect.void),
  ),
)

// ---------------------------------------------------------------------------
// Impl / Live：组合 State / Action / Logic，并提供一个 PoC 级运行入口
// ---------------------------------------------------------------------------

export const BatchArchiveImpl = BatchArchiveModule.make<
  ConfirmServiceTag | ArchiveServiceTag | NotificationServiceTag
>({
  initial: {
    selectedIds: ['id-1', 'id-2'],
    isArchiving: false,
  },
  logics: [BatchArchiveLogic],
})

export const BatchArchiveLive = BatchArchiveImpl.layer
