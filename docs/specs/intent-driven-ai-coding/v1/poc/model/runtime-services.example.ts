// 示例：与 services.md / Pattern.provides 对齐的运行时 Service 接口与简单实现。
// 仅用于说明 FilterService / TableUiStateService / ExportService 在 TS 里的形态。

// ---- Service 接口定义（契约层） ----

export interface FilterService<Filters> {
  getCurrentFilters: () => Filters
  setFilters: (patch: Partial<Filters>) => void
  resetFilters: () => void
}

export interface TableUiState {
  page: number
  pageSize: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface TableUiStateService {
  getCurrentState: () => TableUiState
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  setSort: (by: string, order: 'asc' | 'desc') => void
}

export interface ExportService<Filters> {
  submitExportTask(args: { filters: Filters; columns: string[] }): Promise<void>
}

// ---- 简化实现（示例，用普通闭包代替 Zustand） ----

type TaskFilters = {
  status?: string
  createdAtFrom?: Date
  createdAtTo?: Date
}

let filtersState: TaskFilters = {}

export const inMemoryFilterService: FilterService<TaskFilters> = {
  getCurrentFilters: () => filtersState,
  setFilters: (patch) => {
    filtersState = { ...filtersState, ...patch }
  },
  resetFilters: () => {
    filtersState = {}
  },
}

let tableState: TableUiState = {
  page: 1,
  pageSize: 20,
}

export const inMemoryTableUiStateService: TableUiStateService = {
  getCurrentState: () => tableState,
  setPage: (page) => {
    tableState = { ...tableState, page }
  },
  setPageSize: (pageSize) => {
    tableState = { ...tableState, pageSize }
  },
  setSort: (by, order) => {
    tableState = { ...tableState, sortBy: by, sortOrder: order }
  },
}

export const consoleExportService: ExportService<TaskFilters> = {
  async submitExportTask({ filters, columns }) {
    // 真正工程里这里会发 HTTP 请求，这里仅打印示意
    // eslint-disable-next-line no-console
    console.log('submitExportTask', { filters, columns })
  },
}

// ---- Service Registry 与极简 Flow 执行示例 ----

export const serviceRegistry = {
  FilterService: inMemoryFilterService,
  TableUiStateService: inMemoryTableUiStateService,
  ExportService: consoleExportService,
} as const

type ServiceId = keyof typeof serviceRegistry

export type FlowStepCall = {
  call: `${ServiceId}.${string}`
  as?: string
  params?: Record<string, unknown>
}

export interface FlowDefinition {
  id: string
  pipeline: FlowStepCall[]
}

export async function runFlow(flow: FlowDefinition): Promise<Record<string, unknown>> {
  const ctx: Record<string, unknown> = {}

  for (const step of flow.pipeline) {
    const [serviceId, method] = step.call.split('.') as [ServiceId, string]
    const service = serviceRegistry[serviceId] as any
    const fn = service[method]
    if (typeof fn !== 'function') {
      throw new Error(`Service method not found: ${step.call}`)
    }
    const resolvedParams = step.params ?? {}
    const result = await fn(resolvedParams)
    if (step.as) {
      ctx[step.as] = result
    }
  }

  return ctx
}

