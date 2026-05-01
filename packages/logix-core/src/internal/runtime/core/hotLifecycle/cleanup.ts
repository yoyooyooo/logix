import { Effect } from 'effect'
import type { HotLifecycleCleanupResult } from './types.js'

type CleanupState =
  | { readonly status: 'pending' }
  | { readonly status: 'running' }
  | { readonly status: 'done'; readonly result: HotLifecycleCleanupResult }

const errorToString = (error: unknown): string =>
  error instanceof Error ? error.message : typeof error === 'string' ? error : String(error)

export const createHotLifecycleCleanupCoordinator = (args: {
  readonly cleanupId: string
  readonly cleanup: () => Effect.Effect<void, never, never>
}): {
  readonly run: () => Effect.Effect<HotLifecycleCleanupResult, never, never>
} => {
  let state: CleanupState = { status: 'pending' }

  return {
    run: () =>
      Effect.gen(function* () {
        if (state.status === 'done') {
          return {
            ...state.result,
            idempotent: true,
          }
        }

        if (state.status === 'running') {
          return {
            cleanupId: args.cleanupId,
            status: 'closed',
            idempotent: true,
            errors: [],
          } satisfies HotLifecycleCleanupResult
        }

        state = { status: 'running' }
        const exit = yield* Effect.exit(args.cleanup())
        if (exit._tag === 'Success') {
          const result: HotLifecycleCleanupResult = {
            cleanupId: args.cleanupId,
            status: 'closed',
            idempotent: false,
            errors: [],
          }
          state = { status: 'done', result }
          return result
        }

        const result: HotLifecycleCleanupResult = {
          cleanupId: args.cleanupId,
          status: 'failed',
          idempotent: false,
          errors: [errorToString(exit.cause)],
        }
        state = { status: 'done', result }
        return result
      }),
  }
}
