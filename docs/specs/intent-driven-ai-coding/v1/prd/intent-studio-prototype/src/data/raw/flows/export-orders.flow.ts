export interface ExportOrdersEnv {
  FilterService: {
    getCurrentFilters: () => Promise<Record<string, unknown>>
  }
  TableUiStateService: {
    getCurrentState: () => Promise<{ visibleColumns: string[]; [key: string]: unknown }>
  }
  ExportService: {
    submitExportTask: (payload: {
      filters: Record<string, unknown>
      columns: string[]
    }) => Promise<void>
  }
}

export async function exportOrdersFlow(env: ExportOrdersEnv) {
  const filters = await env.FilterService.getCurrentFilters()
  const tableState = await env.TableUiStateService.getCurrentState()

  await env.ExportService.submitExportTask({
    filters,
    columns: tableState.visibleColumns,
  })
}
