import { Effect, Layer, Option } from 'effect'

import { Db } from '../db/db.js'
import type { Todo, TodoCreateInput, TodoUpdateInput } from './todo.model.js'
import { TodoRepo, type TodoRepoService } from './todo.repo.js'
import { TodoTable } from './todo.table.js'

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

export const TodoRepoLive: Layer.Layer<TodoRepo, never, Db | TodoTable> = Layer.effect(
  TodoRepo,
  Effect.gen(function* () {
    const db = yield* Db
    yield* TodoTable

    const run = <Row extends object = Record<string, unknown>>(strings: TemplateStringsArray, ...args: Array<any>) =>
      db.sql.pipe(Effect.flatMap((sql) => db.run(sql<Row>(strings, ...args))))

    const create: TodoRepoService['create'] = (input: TodoCreateInput) =>
      run<TodoRow>`
        insert into todos (title, completed)
        values (${input.title}, ${input.completed ?? false})
        returning id, title, completed, created_at::text as "createdAt"
      `.pipe(
        Effect.flatMap((rows) => rows[0] ? Effect.succeed(toTodo(rows[0])) : Effect.dieMessage('insert should return one row')),
      )

    const get: TodoRepoService['get'] = (id: number) =>
      run<TodoRow>`
        select id, title, completed, created_at::text as "createdAt"
        from todos
        where id = ${id}
      `.pipe(Effect.map((rows) => Option.fromNullable(rows[0]).pipe(Option.map(toTodo))))

    const list: TodoRepoService['list'] = run<TodoRow>`
      select id, title, completed, created_at::text as "createdAt"
      from todos
      order by id asc
    `.pipe(Effect.map((rows) => rows.map(toTodo)))

    const update: TodoRepoService['update'] = (id: number, patch: TodoUpdateInput) =>
      run<TodoRow>`
        update todos
        set
          title = coalesce(${patch.title ?? null}, title),
          completed = coalesce(${patch.completed ?? null}, completed)
        where id = ${id}
        returning id, title, completed, created_at::text as "createdAt"
      `.pipe(Effect.map((rows) => Option.fromNullable(rows[0]).pipe(Option.map(toTodo))))

    const remove: TodoRepoService['remove'] = (id: number) =>
      run<{ readonly id: number }>`
        delete from todos
        where id = ${id}
        returning id
      `.pipe(Effect.map((rows) => rows.length > 0))

    return { create, get, list, update, remove } satisfies TodoRepoService
  }),
)
