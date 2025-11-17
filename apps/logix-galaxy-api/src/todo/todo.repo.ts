import { Context, Effect, Option } from 'effect'

import { DbError } from '../db/db.js'
import type { Todo, TodoCreateInput, TodoUpdateInput } from './todo.model.js'

export interface TodoRepoService {
  readonly create: (input: TodoCreateInput) => Effect.Effect<Todo, DbError>
  readonly get: (id: number) => Effect.Effect<Option.Option<Todo>, DbError>
  readonly list: Effect.Effect<ReadonlyArray<Todo>, DbError>
  readonly update: (id: number, patch: TodoUpdateInput) => Effect.Effect<Option.Option<Todo>, DbError>
  readonly remove: (id: number) => Effect.Effect<boolean, DbError>
}

export class TodoRepo extends Context.Tag('TodoRepo')<TodoRepo, TodoRepoService>() {}
