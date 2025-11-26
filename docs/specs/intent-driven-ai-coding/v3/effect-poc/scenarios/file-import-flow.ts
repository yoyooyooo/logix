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
import { Store, Logic } from '../shared/logix-v3-core'
import {
  FileImportPatternError,
  FileUploadService,
  ImportService,
  runUploadAndStartImportPattern,
  runPollImportStatusPattern,
} from '../patterns/file-import-flow'

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

const ImportActionSchema = Schema.Union(
  Schema.Struct({
    _tag: Schema.Literal('import/start'),
    payload: Schema.Struct({
      fileName: Schema.String,
      fileSize: Schema.Number,
    }),
  }),
  Schema.Struct({ _tag: Schema.Literal('import/reset') }),
)

export type ImportShape = Store.Shape<typeof ImportStateSchema, typeof ImportActionSchema>
export type ImportState = Store.StateOf<ImportShape>
export type ImportAction = Store.ActionOf<ImportShape>

// ---------------------------------------------------------------------------
// Logic：监听 import/start / import/reset，驱动整个导入流程
// ---------------------------------------------------------------------------

export const FileImportLogic = Logic.make<
  ImportShape,
  FileUploadService | ImportService
>(({ state, flow, control }) =>
  Effect.gen(function* () {
    const { read, update } = state

    const start$ = flow.fromAction(
      (a): a is {
        _tag: 'import/start'
        payload: { fileName: string; fileSize: number }
      } => a._tag === 'import/start',
    )
    const reset$ = flow.fromAction((a): a is { _tag: 'import/reset' } => a._tag === 'import/reset')

    const handleStart = (action: {
      _tag: 'import/start'
      payload: { fileName: string; fileSize: number }
    }) =>
      Effect.gen(function* () {
        const fileName = action.payload.fileName
        const fileSize = action.payload.fileSize

        // 1. 标记为 uploading
        yield* update((prev) => ({
          ...prev,
          fileName,
          fileSize,
          status: 'uploading' as const,
          errorMessage: undefined,
        }))

        // 2. 上传 + 启动导入任务
        const taskId = yield* control.tryCatch({
          try: runUploadAndStartImportPattern({ fileName, fileSize }),
          catch: (err: FileImportPatternError) =>
            Effect.gen(function* () {
              yield* update((prev) => ({
                ...prev,
                status: 'error' as const,
                errorMessage: err.reason,
              }))
              return ''
            }),
        })

        if (!taskId) {
          return
        }

        // 3. 写入 taskId，并标记为 importing
        yield* update((prev) => ({
          ...prev,
          taskId,
          status: 'importing' as const,
        }))

        // 4. 后台轮询任务状态
        const finalStatus = yield* control.tryCatch({
          try: runPollImportStatusPattern({ taskId }),
          catch: (err: FileImportPatternError) =>
            Effect.gen(function* () {
              yield* update((prev) => ({
                ...prev,
                status: 'error' as const,
                errorMessage: err.reason,
              }))
              return 'FAILED' as const
            }),
        })

        // 5. 根据最终状态更新 UI
        if (finalStatus === 'SUCCESS') {
          yield* update((prev) => ({
            ...prev,
            status: 'done' as const,
          }))
        } else {
          yield* update((prev) => ({
            ...prev,
            status: 'error' as const,
            errorMessage: prev.errorMessage ?? '导入失败',
          }))
        }
      })

    const handleReset = update((prev) => ({
      ...prev,
      taskId: undefined,
      status: 'idle' as const,
      errorMessage: undefined,
    }))

    yield* Effect.all([
      // 这里直接使用 Stream.runForEach 将 Action 传入 Effect，
      // 并发控制由 handleStart 内部的状态机负责；其他场景中仍由 flow.runExhaust 演示并发语义。
      start$.pipe(Stream.runForEach(handleStart)),
      reset$.pipe(flow.run(handleReset)),
    ])
  }),
)

// ---------------------------------------------------------------------------
// Store：组合 State / Action / Logic
// ---------------------------------------------------------------------------

const ImportStateLayer = Store.State.make(ImportStateSchema, {
  fileName: '',
  fileSize: 0,
  taskId: undefined,
  status: 'idle' as const,
  errorMessage: undefined,
})

const ImportActionLayer = Store.Actions.make(ImportActionSchema)

export const FileImportStore = Store.make<ImportShape>(
  ImportStateLayer,
  ImportActionLayer,
  FileImportLogic,
)
