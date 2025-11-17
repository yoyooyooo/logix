import { Context, Effect } from 'effect'

import type { DbError } from '../db/db.js'

export interface TodoTableService {
  readonly ensure: Effect.Effect<void, DbError>
}

export class TodoTable extends Context.Tag('TodoTable')<TodoTable, TodoTableService>() {}

