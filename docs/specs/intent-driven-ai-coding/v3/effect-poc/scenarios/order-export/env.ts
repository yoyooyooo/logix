import type { BasePlatformEnv } from '../../effect-poc/shared/effect-types'

export interface FilterService {
  getCurrentFilters: () => Promise<Record<string, unknown>>
}

export interface TableUiStateService {
  getCurrentState: () => Promise<{ visibleColumns: string[] }>
}

export interface ExportService {
  submitExportTask: (input: {
    filters: Record<string, unknown>
    columns: string[]
  }) => Promise<void>
}

export interface OrderExportEnv extends BasePlatformEnv {
  FilterService: FilterService
  TableUiStateService: TableUiStateService
  ExportService: ExportService
}

