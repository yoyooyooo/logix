import { HttpApiBuilder } from '@effect/platform'
import { Effect, Option } from 'effect'

import { EffectApi } from '../app/effect-api.js'
import { DbError } from '../db/db.js'
import { TodoRepo } from './todo.repo.js'

const toServiceUnavailable = (e: DbError): { readonly _tag: 'ServiceUnavailableError'; readonly message: string } => ({
  _tag: 'ServiceUnavailableError',
  message: e.reason === 'disabled' ? 'DATABASE_URL is not set' : 'Database error',
})

export const TodoLive = HttpApiBuilder.group(EffectApi, 'Todo', (handlers) =>
  handlers
    .handle('todoCreate', ({ payload }) =>
      Effect.gen(function* () {
        const repo = yield* TodoRepo
        return yield* repo.create(payload).pipe(Effect.mapError(toServiceUnavailable))
      }),
    )
    .handle('todoList', () =>
      Effect.gen(function* () {
        const repo = yield* TodoRepo
        return yield* repo.list.pipe(Effect.mapError(toServiceUnavailable))
      }),
    )
    .handle('todoGet', ({ path }) =>
      Effect.gen(function* () {
        const repo = yield* TodoRepo
        const todoOpt = yield* repo.get(path.id).pipe(Effect.mapError(toServiceUnavailable))
        return yield* Option.match(todoOpt, {
          onNone: () => Effect.fail({ _tag: 'NotFoundError', message: 'Todo not found' } as const),
          onSome: Effect.succeed,
        })
      }),
    )
    .handle('todoUpdate', ({ path, payload }) =>
      Effect.gen(function* () {
        const repo = yield* TodoRepo
        const todoOpt = yield* repo.update(path.id, payload).pipe(Effect.mapError(toServiceUnavailable))
        return yield* Option.match(todoOpt, {
          onNone: () => Effect.fail({ _tag: 'NotFoundError', message: 'Todo not found' } as const),
          onSome: Effect.succeed,
        })
      }),
    )
    .handle('todoDelete', ({ path }) =>
      Effect.gen(function* () {
        const repo = yield* TodoRepo
        const ok = yield* repo.remove(path.id).pipe(Effect.mapError(toServiceUnavailable))
        if (!ok) {
          return yield* Effect.fail({ _tag: 'NotFoundError', message: 'Todo not found' } as const)
        }
      }),
    ),
)
