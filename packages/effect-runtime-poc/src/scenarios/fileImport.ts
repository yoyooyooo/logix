import * as Effect from 'effect/Effect'
import type { BasePlatformEnv, Fx } from '../shared/base'

export interface UploadResult {
  fileId: string
}

export interface ImportTask {
  taskId: string
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED'
}

// 使用自定义 UploadFile 避免直接依赖 DOM File 类型
export interface UploadFile {
  name: string
  size: number
  // 可按需扩展为更接近 File 的结构
  raw: unknown
}

export interface FileUploadService {
  upload: (file: UploadFile) => Promise<UploadResult>
}

export interface ImportService {
  startImport: (fileId: string) => Promise<{ taskId: string }>
  getImportStatus: (taskId: string) => Promise<ImportTask>
}

export interface FileImportEnv extends BasePlatformEnv {
  FileUploadService: FileUploadService
  ImportService: ImportService
}

// 上传文件并启动导入任务：不包含轮询逻辑，仅返回 taskId。
export const uploadAndStartImportFlow =
  (file: UploadFile): Fx<FileImportEnv, never, { taskId: string }> =>
  Effect.gen(function* () {
    const env = yield* Effect.context<FileImportEnv>()
    env.logger.info('fileImport.upload.start', { name: file.name, size: file.size })
    const { fileId } = yield* Effect.promise(() => env.FileUploadService.upload(file))
    env.logger.info('fileImport.upload.done', { fileId })

    const { taskId } = yield* Effect.promise(() =>
      env.ImportService.startImport(fileId),
    )
    env.logger.info('fileImport.import.start', { taskId })

    return { taskId }
  })

// 轮询导入任务状态：与 longTask 场景类似，可重用策略。
export const pollImportStatusFlow =
  (taskId: string): Fx<FileImportEnv, never, ImportTask> =>
  Effect.gen(function* () {
    const env = yield* Effect.context<FileImportEnv>()

    env.logger.info('fileImport.poll.start', { taskId })
    let status = yield* Effect.promise(() =>
      env.ImportService.getImportStatus(taskId),
    )
    while (status.status === 'PENDING' || status.status === 'RUNNING') {
      yield* Effect.async<void>(resume => {
        const id = setTimeout(() => {
          clearTimeout(id)
          resume(Effect.succeed(undefined))
        }, 1000)
      })
      status = yield* Effect.promise(() =>
        env.ImportService.getImportStatus(taskId),
      )
    }
    env.logger.info('fileImport.poll.done', { taskId, status: status.status })
    return status
  })

