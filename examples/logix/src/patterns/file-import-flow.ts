/**
 * @pattern 文件导入通用模式 (File Import Flow Pattern)
 * @description
 *   将“上传文件 + 启动导入任务 + 轮询状态”的关键步骤抽离为可复用 Pattern：
 *   - runUploadAndStartImportPattern：上传文件并启动导入任务，返回 taskId；
 *   - runPollImportStatusPattern：根据 taskId 轮询任务状态，返回最终结果。
 */

import { Data, Duration, Effect, Layer, ServiceMap } from 'effect'

// ---------------------------------------------------------------------------
// 错误建模：FileImportPatternError
// ---------------------------------------------------------------------------

export class FileImportPatternError extends Data.TaggedError('FileImportPatternError')<{
  readonly stage: 'upload' | 'start' | 'poll'
  readonly reason: string
}> {}

// ---------------------------------------------------------------------------
// Services：文件上传与导入任务
// ---------------------------------------------------------------------------

export class FileUploadService extends ServiceMap.Service<
  FileUploadService,
  { readonly upload: (input: { name: string; size: number }) => Effect.Effect<{ fileId: string }> }
>()('FileUploadService') {}

export const FileUploadServiceLive = Layer.effect(
  FileUploadService,
  Effect.gen(function* () {
    const upload = (input: { name: string; size: number }) =>
      Effect.gen(function* () {
        console.log('[FileUploadService] upload', input.name, input.size)
        return { fileId: `file-${Date.now()}` }
      })

    return {
      upload,
    }
  }),
)

export class ImportService extends ServiceMap.Service<
  ImportService,
  {
    readonly startImport: (input: { fileId: string }) => Effect.Effect<{ taskId: string }>
    readonly getImportStatus: (input: { taskId: string }) => Effect.Effect<{ status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' }>
  }
>()('ImportService') {}

export const ImportServiceLive = Layer.effect(
  ImportService,
  Effect.gen(function* () {
    const startImport = (input: { fileId: string }) =>
      Effect.gen(function* () {
        console.log('[ImportService] startImport', input.fileId)
        return { taskId: `task-${Date.now()}` }
      })

    type ImportStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED'

    const getImportStatus = (input: { taskId: string }) =>
      Effect.gen(function* () {
        console.log('[ImportService] getImportStatus', input.taskId)
        return { status: 'SUCCESS' as ImportStatus }
      })

    return {
      startImport,
      getImportStatus,
    }
  }),
)

// ---------------------------------------------------------------------------
// Pattern 1：上传文件并启动导入任务，返回 taskId
// ---------------------------------------------------------------------------

export interface UploadAndStartInput {
  fileName: string
  fileSize: number
}

export const runUploadAndStartImportPattern = (input: UploadAndStartInput) =>
  Effect.gen(function* () {
    const uploader = yield* Effect.service(FileUploadService).pipe(Effect.orDie)
    const importer = yield* Effect.service(ImportService).pipe(Effect.orDie)

    // 示例：当文件名为 "fail" 时模拟上传阶段失败，映射为领域错误。
    if (input.fileName === 'fail') {
      return yield* Effect.fail(
        new FileImportPatternError({
          stage: 'upload',
          reason: 'Simulated upload failure for demo',
        }),
      )
    }

    const { fileId } = yield* uploader.upload({ name: input.fileName, size: input.fileSize })
    const { taskId } = yield* importer.startImport({ fileId })

    return taskId
  })

// ---------------------------------------------------------------------------
// Pattern 2：轮询导入任务状态，直到结束
// ---------------------------------------------------------------------------

export interface PollImportStatusInput {
  taskId: string
}

export const runPollImportStatusPattern = (input: PollImportStatusInput) =>
  Effect.gen(function* () {
    const importer = yield* Effect.service(ImportService).pipe(Effect.orDie)

    // 示例：当 taskId 为 "fail" 时模拟轮询阶段失败。
    if (input.taskId === 'fail') {
      return yield* Effect.fail(
        new FileImportPatternError({
          stage: 'poll',
          reason: 'Simulated import failure for demo',
        }),
      )
    }

    let status = yield* importer.getImportStatus({ taskId: input.taskId })

    // 这里简化轮询逻辑：成功即退出；真实项目中应增加重试/超时/取消等策略。
    while (status.status === 'PENDING' || status.status === 'RUNNING') {
      yield* Effect.sleep(Duration.seconds(1))
      status = yield* importer.getImportStatus({ taskId: input.taskId })
    }

    return status.status as 'SUCCESS' | 'FAILED'
  })
