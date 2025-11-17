import type { BasePlatformEnv } from '../../effect-poc/shared/effect-types'

export interface BulkOperationService {
  applyToMany: (input: { ids: string[]; operation: string }) => Promise<void>
}

export interface SelectionService {
  getSelectedIds: () => Promise<string[]>
}

export interface BulkEnv extends BasePlatformEnv {
  BulkOperationService: BulkOperationService
  SelectionService: SelectionService
}

