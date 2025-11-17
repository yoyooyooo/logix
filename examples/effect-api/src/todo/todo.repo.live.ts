import { Effect, Layer, Option } from 'effect'

import { Db } from '../db/db.js'
import type { Todo, TodoCreateInput, TodoUpdateInput } from './todo.model.js'
import { TodoRepo, type TodoRepoService } from './todo.repo.js'

interface TodoRow {
  readonly id: number
  readonly title: string
  readonly completed: boolean
  readonly createdAt: string
}

const toTodo = (row: TodoRow): Todo => ({
  id: row.id,
  title: row.title,
  completed: row.completed,
  createdAt: row.createdAt,
})

export const TodoRepoLive: Layer.Layer<TodoRepo, never, Db> = Layer.effect(
  TodoRepo,
  Effect.gen(function* () {
    const db = yield* Db

    const ensureTable = yield* Effect.once(
      db
        .query(
          `create table if not exists todos (
            id serial primary key,
            title text not null,
            completed boolean not null default false,
            created_at timestamptz not null default now()
          )`,
        )
        .pipe(Effect.asVoid),
    )

    const create: TodoRepoService['create'] = (input: TodoCreateInput) =>
      ensureTable.pipe(
        Effect.zipRight(
          db
            .query<TodoRow>(
              `insert into todos (title, completed)
              values ($1, $2)
              returning id, title, completed, created_at::text as "createdAt"`,
              [input.title, input.completed ?? false],
            )
            .pipe(
              Effect.flatMap((rows) =>
                rows[0] ? Effect.succeed(toTodo(rows[0])) : Effect.dieMessage('insert should return one row'),
              ),
            ),
        ),
      )

    const get: TodoRepoService['get'] = (id: number) =>
      ensureTable.pipe(
        Effect.zipRight(
          db
            .query<TodoRow>(
              `select id, title, completed, created_at::text as "createdAt"
              from todos
              where id = $1`,
              [id],
            )
            .pipe(Effect.map((rows) => Option.fromNullable(rows[0]).pipe(Option.map(toTodo)))),
        ),
      )

    const list: TodoRepoService['list'] = ensureTable.pipe(
      Effect.zipRight(
        db
          .query<TodoRow>(
            `select id, title, completed, created_at::text as "createdAt"
            from todos
            order by id asc`,
          )
          .pipe(Effect.map((rows) => rows.map(toTodo))),
      ),
    )

    const update: TodoRepoService['update'] = (id: number, patch: TodoUpdateInput) =>
      ensureTable.pipe(
        Effect.zipRight(
          db
            .query<TodoRow>(
              `update todos
              set
                title = coalesce($2, title),
                completed = coalesce($3, completed)
              where id = $1
              returning id, title, completed, created_at::text as "createdAt"`,
              [id, patch.title ?? null, patch.completed ?? null],
            )
            .pipe(Effect.map((rows) => Option.fromNullable(rows[0]).pipe(Option.map(toTodo)))),
        ),
      )

    const remove: TodoRepoService['remove'] = (id: number) =>
      ensureTable.pipe(
        Effect.zipRight(
          db
            .query<{ readonly id: number }>(
              `delete from todos
              where id = $1
              returning id`,
              [id],
            )
            .pipe(Effect.map((rows) => rows.length > 0)),
        ),
      )

    return { create, get, list, update, remove } satisfies TodoRepoService
  }),
)
