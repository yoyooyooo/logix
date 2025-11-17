import { Context, Effect } from 'effect'

import type { DbError } from '../db/db.js'

export interface AuthEventTableService {
  readonly ensure: Effect.Effect<void, DbError>
}

export class AuthEventTable extends Context.Tag('AuthEventTable')<AuthEventTable, AuthEventTableService>() {}

