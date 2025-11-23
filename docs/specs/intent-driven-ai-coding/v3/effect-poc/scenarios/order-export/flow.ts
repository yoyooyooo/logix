import type { Effect } from '../../effect-poc/shared/effect-types'
import type { OrderExportEnv } from './env'

// 对应 v2 FlowIntent/FlowDslV2 中的 exportOrders 流程：
// - 读取当前筛选与可见列
// - 调用 ExportService 提交导出任务
// - 记录日志（通过 BasePlatformEnv.logger）

export const exportOrdersFlow: Effect<OrderExportEnv, never, void> = async env => {
  const filters = await env.FilterService.getCurrentFilters()
  const tableState = await env.TableUiStateService.getCurrentState()

  env.logger.info('exportOrdersFlow.start', {
    filters,
    columns: tableState.visibleColumns,
  })

  await env.ExportService.submitExportTask({
    filters,
    columns: tableState.visibleColumns,
  })

  env.logger.info('exportOrdersFlow.done', {})
}

