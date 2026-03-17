import { HttpApiBuilder } from 'effect/unstable/httpapi'
import { Effect, Option } from 'effect'

import { EffectApi } from '../app/effect-api.js'
import { DbError } from '../db/db.js'
import { TodoRepo } from './todo.repo.js'

const toServiceUnavailable = (e: DbError): { readonly _tag: 'ServiceUnavailableError'; readonly message: string } => ({
  _tag: 'ServiceUnavailableError',
  message: e.reason === 'disabled' ? 'DATABASE_URL is not set' : 'Database error',
})

export const TodoLive = HttpApiBuilder.group(EffectApi, 'Todo', Effect.fn(function* (handlers) {
  return handlers
    .handle('todoCreate', ({ payload }) =>
      Effect.gen(function* () {
        const repo = yield* Effect.service(TodoRepo)
        return yield* repo.create(payload).pipe(Effect.mapError(toServiceUnavailable))
      }),
    )
    .handle('todoList', () =>
      Effect.gen(function* () {
        const repo = yield* Effect.service(TodoRepo)
        return yield* repo.list.pipe(Effect.mapError(toServiceUnavailable))
      }),
    )
    .handle('todoGet', ({ params }) =>
      Effect.gen(function* () {
        const repo = yield* Effect.service(TodoRepo)
        const todoOpt = yield* repo.get(params.id).pipe(Effect.mapError(toServiceUnavailable))
        return yield* Option.match(todoOpt, {
          onNone: () => Effect.fail({ _tag: 'NotFoundError', message: 'Todo not found' } as const),
          onSome: Effect.succeed,
        })
      }),
    )
    .handle('todoUpdate', ({ params, payload }) =>
      Effect.gen(function* () {
        const repo = yield* Effect.service(TodoRepo)
        const todoOpt = yield* repo.update(params.id, payload).pipe(Effect.mapError(toServiceUnavailable))
        return yield* Option.match(todoOpt, {
          onNone: () => Effect.fail({ _tag: 'NotFoundError', message: 'Todo not found' } as const),
          onSome: Effect.succeed,
        })
      }),
    )
    .handle('todoDelete', ({ params }) =>
      Effect.gen(function* () {
        const repo = yield* Effect.service(TodoRepo)
        const ok = yield* repo.remove(params.id).pipe(Effect.mapError(toServiceUnavailable))
        if (!ok) {
          return yield* Effect.fail({ _tag: 'NotFoundError', message: 'Todo not found' } as const)
        }
        return undefined as void
      }),
    )
}))
