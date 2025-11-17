import type { BasePlatformEnv } from '../../effect-poc/shared/effect-types'

export interface LongTaskService {
  startTask: (payload: Record<string, unknown>) => Promise<{ taskId: string }>
  getStatus: (taskId: string) => Promise<{ status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' }>
}

export interface LongTaskEnv extends BasePlatformEnv {
  LongTaskService: LongTaskService
}

