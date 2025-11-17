import { Effect, Layer, Option } from 'effect'
import { Pool } from 'pg'

import { Db, DbError, type DbService } from './db.js'

const databaseUrl = Effect.sync(() => process.env.DATABASE_URL)

export const DbLive: Layer.Layer<Db, never, never> = Layer.scoped(
  Db,
  Effect.gen(function* () {
    const urlOpt = Option.fromNullable(yield* databaseUrl)
    if (Option.isNone(urlOpt)) {
      const disabled = new DbError({
        reason: 'disabled',
        message: 'DATABASE_URL is not set',
      })
      return {
        ping: Effect.fail(disabled),
        query: () => Effect.fail(disabled),
      } satisfies DbService
    }

    const pool = yield* Effect.acquireRelease(
      Effect.sync(() => new Pool({ connectionString: urlOpt.value })),
      (p) => Effect.promise(() => p.end()).pipe(Effect.orDie),
    )

    const query: DbService['query'] = (sql, params = []) =>
      Effect.tryPromise({
        try: () => pool.query(sql, params as any[]).then((r) => r.rows as ReadonlyArray<any>),
        catch: (cause) =>
          new DbError({
            reason: 'query',
            message: 'Postgres query failed',
            cause,
          }),
      })

    const ping: DbService['ping'] = query('select 1').pipe(Effect.asVoid)

    return { ping, query } satisfies DbService
  }),
)
