import * as Effect from 'effect/Effect'
import type { BasePlatformEnv, Fx } from '../shared/base'

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

export const exportOrdersFlow: Fx<OrderExportEnv, never, void> = Effect.gen(function* () {
  const env = yield* Effect.context<OrderExportEnv>()

  const filters = yield* Effect.promise(() => env.FilterService.getCurrentFilters())
  const tableState = yield* Effect.promise(() => env.TableUiStateService.getCurrentState())

  env.logger.info('exportOrdersFlow.start', {
    filters,
    columns: tableState.visibleColumns,
  })

  yield* Effect.promise(() =>
    env.ExportService.submitExportTask({
      filters,
      columns: tableState.visibleColumns,
    }),
  )

  env.logger.info('exportOrdersFlow.done', {})
})

