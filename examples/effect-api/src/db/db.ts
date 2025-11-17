import { Context, Data, Effect } from 'effect'

export class DbError extends Data.TaggedError('DbError')<{
  readonly reason: 'disabled' | 'query'
  readonly message: string
  readonly cause?: unknown
}> {}

export interface DbService {
  readonly ping: Effect.Effect<void, DbError>
  readonly query: <Row extends object = Record<string, unknown>>(
    sql: string,
    params?: ReadonlyArray<unknown>,
  ) => Effect.Effect<ReadonlyArray<Row>, DbError>
}

export class Db extends Context.Tag('Db')<Db, DbService>() {}
