import type { BasePlatformEnv } from '../../effect-poc/shared/effect-types'

export interface UploadResult {
  fileId: string
}

export interface ImportTask {
  taskId: string
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED'
}

export interface FileUploadService {
  upload: (file: File) => Promise<UploadResult>
}

export interface ImportService {
  startImport: (fileId: string) => Promise<{ taskId: string }>
  getImportStatus: (taskId: string) => Promise<ImportTask>
}

export interface FileImportEnv extends BasePlatformEnv {
  FileUploadService: FileUploadService
  ImportService: ImportService
}

