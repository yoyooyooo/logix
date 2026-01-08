/**
 * @scenario 文件导入流程 (File Import Flow)
 * @description 演示典型的“上传文件 → 启动导入任务 → 轮询状态并更新 UI”的两阶段长流程。
 *
 * 场景：
 *   - 用户触发 `import/start` Action，传入文件元信息（name/size）；
 *   - 系统调用 FileUploadService.upload 获取 fileId，再调用 ImportService.startImport 获取 taskId；
 *   - 将 taskId 写入状态，并启动后台轮询任务 PollImportStatus，直到任务结束；
 *   - UI 通过 State 的 `status` 字段展示导入过程（idle/uploading/importing/done/error）。
 */

import { Effect, Schema, Stream } from 'effect'
import * as Logix from '@logixjs/core'
import {
  FileImportPatternError,
  FileUploadService,
  ImportService,
  runUploadAndStartImportPattern,
  runPollImportStatusPattern,
} from '../patterns/file-import-flow.js'

// ---------------------------------------------------------------------------
// Schema → Shape：文件导入流程的 State / Action
// ---------------------------------------------------------------------------

const ImportStateSchema = Schema.Struct({
  fileName: Schema.String,
  fileSize: Schema.Number,
  taskId: Schema.optional(Schema.String),
  status: Schema.Literal('idle', 'uploading', 'importing', 'done', 'error'),
  errorMessage: Schema.optional(Schema.String),
})

const ImportActionMap = {
  'import/start': Schema.Struct({
    fileName: Schema.String,
    fileSize: Schema.Number,
  }),
  'import/reset': Schema.Void,
}

export type ImportShape = Logix.Shape<typeof ImportStateSchema, typeof ImportActionMap>
export type ImportState = Logix.StateOf<ImportShape>
export type ImportAction = Logix.ActionOf<ImportShape>

// ---------------------------------------------------------------------------
// Module：定义文件导入模块
// ---------------------------------------------------------------------------

export const FileImportDef = Logix.Module.make('FileImportModule', {
  state: ImportStateSchema,
  actions: ImportActionMap,
})

// ---------------------------------------------------------------------------
// Logic：监听 import/start / import/reset，驱动整个导入流程（通过 Module.logic 注入 $）
// ---------------------------------------------------------------------------

export const FileImportLogic = FileImportDef.logic<FileUploadService | ImportService>(($) =>
  Effect.gen(function* () {
    type StartAction = Extract<ImportAction, { _tag: 'import/start' }>

    const handleStart = (action: StartAction) =>
      Logix.Logic.of<ImportShape, FileUploadService | ImportService>(
        Effect.gen(function* () {
          const fileName = action.payload.fileName
          const fileSize = action.payload.fileSize

          // 1. 标记为 uploading
          yield* $.state.update((prev) => ({
            ...prev,
            fileName,
            fileSize,
            status: 'uploading',
            errorMessage: undefined,
          }))

          // 2. 上传 + 启动导入任务
          const taskId = yield* runUploadAndStartImportPattern({ fileName, fileSize }).pipe(
            Effect.catchTag('FileImportPatternError', (err: FileImportPatternError) =>
              Effect.gen(function* () {
                yield* $.state.update((prev) => ({
                  ...prev,
                  status: 'error',
                  errorMessage: err.reason,
                }))
                return ''
              }),
            ),
          )

          if (!taskId) {
            return
          }

          // 3. 写入 taskId，并标记为 importing
          yield* $.state.update((prev) => ({
            ...prev,
            taskId,
            status: 'importing',
          }))

          // 4. 后台轮询任务状态
          const finalStatus = yield* runPollImportStatusPattern({ taskId }).pipe(
            Effect.catchTag('FileImportPatternError', (err: FileImportPatternError) =>
              Effect.gen(function* () {
                yield* $.state.update((prev) => ({
                  ...prev,
                  status: 'error',
                  errorMessage: err.reason,
                }))
                return 'FAILED' as const
              }),
            ),
          )

          // 5. 根据最终状态更新 UI（演示使用 $.match 表达结构化分支）
          yield* $.match(finalStatus)
            .with(
              (s) => s === 'SUCCESS',
              () =>
                $.state.update((prev) => ({
                  ...prev,
                  status: 'done',
                })),
            )
            .otherwise(() =>
              $.state.update((prev) => ({
                ...prev,
                status: 'error',
                errorMessage: prev.errorMessage ?? '导入失败',
              })),
            )
        }),
      )

    const handleReset = $.state.update((prev) => ({
      ...prev,
      taskId: undefined,
      status: 'idle',
      errorMessage: undefined,
    }))

    yield* $.onAction('import/start').runExhaust(handleStart)
    yield* $.onAction('import/reset').run(handleReset)
  }).pipe(
    // 收敛错误通道到 never，确保作为 ModuleLogic 使用时类型安全
    Effect.catchAll(() => Effect.void),
  ),
)

// ---------------------------------------------------------------------------
// Impl / Live：组合初始 State 与 Logic，生成运行时实现
// ---------------------------------------------------------------------------

export const FileImportModule = FileImportDef.implement<FileUploadService | ImportService>({
  initial: {
    fileName: '',
    fileSize: 0,
    taskId: undefined,
    status: 'idle',
    errorMessage: undefined,
  },
  logics: [FileImportLogic],
})

export const FileImportImpl = FileImportModule.impl
export const FileImportLive = FileImportImpl.layer
