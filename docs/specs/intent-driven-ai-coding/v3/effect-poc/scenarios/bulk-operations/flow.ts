import type { Effect } from '../../effect-poc/shared/effect-types'
import type { BulkEnv } from './env'

export const bulkOperationFlow =
  (operation: string): Effect<BulkEnv, never, void> =>
  async env => {
    const ids = await env.SelectionService.getSelectedIds()
    env.logger.info('bulkOperation.start', { operation, count: ids.length })
    if (!ids.length) {
      env.NotificationService?.info?.('请先选择记录') // 可选扩展：在 BasePlatformEnv 中增加通知
      return
    }
    await env.BulkOperationService.applyToMany({ ids, operation })
    env.logger.info('bulkOperation.done', { operation })
  }

