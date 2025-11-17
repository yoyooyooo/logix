import { Effect, Layer } from 'effect'

import { Db, DbError } from '../db/db.js'
import { TodoTable, type TodoTableService } from './todo.table.js'

const isDbDisabled = (e: DbError): boolean => e.reason === 'disabled'

export const TodoTableLive: Layer.Layer<TodoTable, never, Db> = Layer.effect(
  TodoTable,
  Effect.gen(function* () {
    const db = yield* Db

    const ensure = yield* Effect.cached(
      db
        .query(
          `create table if not exists todos (
            id serial primary key,
            title text not null,
            completed boolean not null default false,
            created_at timestamptz not null default now()
          )`,
        )
        .pipe(
          Effect.asVoid,
          Effect.catchIf(isDbDisabled, () => Effect.void),
        ),
    )

    yield* ensure.pipe(
      Effect.catchAll((e) => Effect.logWarning('todo table init failed').pipe(Effect.annotateLogs({ error: e }))),
    )

    return { ensure } satisfies TodoTableService
  }),
)
