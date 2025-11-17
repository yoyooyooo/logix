import * as Effect from 'effect/Effect'
import type { BasePlatformEnv, Fx } from '../shared/base'

export interface BulkOperationService {
  applyToMany: (input: { ids: string[]; operation: string }) => Promise<void>
}

export interface SelectionService {
  getSelectedIds: () => Promise<string[]>
}

export interface NotificationService {
  info?: (msg: string) => void
}

export interface BulkEnv extends BasePlatformEnv {
  BulkOperationService: BulkOperationService
  SelectionService: SelectionService
  NotificationService?: NotificationService
}

export const bulkOperationFlow =
  (operation: string): Fx<BulkEnv, never, void> =>
  Effect.gen(function* () {
    const env = yield* Effect.context<BulkEnv>()
    const ids = yield* Effect.promise(() => env.SelectionService.getSelectedIds())
    env.logger.info('bulkOperation.start', { operation, count: ids.length })
    if (!ids.length) {
      env.NotificationService?.info?.('请先选择记录')
      return
    }
    yield* Effect.promise(() =>
      env.BulkOperationService.applyToMany({
        ids,
        operation,
      }),
    )
    env.logger.info('bulkOperation.done', { operation })
  })

