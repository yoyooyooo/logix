import type { Effect } from '../../effect-poc/shared/effect-types'
import type { FileImportEnv, ImportTask } from './env'

// 上传文件并启动导入任务：不包含轮询逻辑，仅返回 taskId。
export const uploadAndStartImportFlow =
  (file: File): Effect<FileImportEnv, never, { taskId: string }> =>
  async env => {
    env.logger.info('fileImport.upload.start', { name: file.name, size: file.size })
    const { fileId } = await env.FileUploadService.upload(file)
    env.logger.info('fileImport.upload.done', { fileId })

    const { taskId } = await env.ImportService.startImport(fileId)
    env.logger.info('fileImport.import.start', { taskId })

    return { taskId }
  }

// 轮询导入任务状态：与 long-task-polling 场景类似，可重用策略。
export const pollImportStatusFlow =
  (taskId: string): Effect<FileImportEnv, never, ImportTask> =>
  async env => {
    env.logger.info('fileImport.poll.start', { taskId })
    let status = await env.ImportService.getImportStatus(taskId)
    while (status.status === 'PENDING' || status.status === 'RUNNING') {
      await new Promise(r => setTimeout(r, 1000))
      status = await env.ImportService.getImportStatus(taskId)
    }
    env.logger.info('fileImport.poll.done', { taskId, status: status.status })
    return status
  }

