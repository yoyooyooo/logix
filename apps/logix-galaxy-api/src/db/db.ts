import { Context, Data, Effect } from 'effect'
import type { SqlClient } from '@effect/sql/SqlClient'
import type { SqlError } from '@effect/sql/SqlError'

export class DbError extends Data.TaggedError('DbError')<{
  readonly reason: 'disabled' | 'query'
  readonly message: string
  readonly cause?: unknown
}> {}

export interface DbService {
  readonly sql: Effect.Effect<SqlClient, DbError>
  readonly run: <Row extends object = Record<string, unknown>>(
    sql: Effect.Effect<ReadonlyArray<Row>, SqlError>,
  ) => Effect.Effect<ReadonlyArray<Row>, DbError>
  readonly ping: Effect.Effect<void, DbError>
  readonly query: <Row extends object = Record<string, unknown>>(
    sql: string,
    params?: ReadonlyArray<unknown>,
  ) => Effect.Effect<ReadonlyArray<Row>, DbError>
}

export class Db extends Context.Tag('Db')<Db, DbService>() {}
