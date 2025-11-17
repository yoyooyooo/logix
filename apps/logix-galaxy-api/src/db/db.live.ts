import { PgClient } from '@effect/sql-pg'
import * as Reactivity from '@effect/experimental/Reactivity'
import { Config, Effect, Layer, Option, Redacted, Scope } from 'effect'

import { Db, DbError, type DbService } from './db.js'

export const DbLive: Layer.Layer<Db, never, never> = Layer.scoped(
  Db,
  Effect.gen(function* () {
    const urlOpt = yield* Config.option(Config.string('DATABASE_URL')).pipe(
      Effect.catchAll(() => Effect.succeed(Option.none())),
    )
    if (Option.isNone(urlOpt)) {
      const disabled = new DbError({
        reason: 'disabled',
        message: 'DATABASE_URL is not set',
      })
      const failDisabled = <A>(_: any): Effect.Effect<A, DbError> => Effect.fail(disabled)
      return {
        sql: failDisabled(undefined),
        run: () => failDisabled(undefined),
        ping: failDisabled(undefined),
        query: () => failDisabled(undefined),
      } satisfies DbService
    }

    const layerScope = yield* Effect.scope

    const getClient = yield* Effect.cached(
      PgClient.make({
        url: Redacted.make(urlOpt.value),
      }).pipe(
        Effect.provide(Reactivity.layer),
        Scope.extend(layerScope),
      ),
    )

    const toQueryError = (cause: unknown) =>
      new DbError({
        reason: 'query',
        message: 'Postgres query failed',
        cause,
      })

    const sql: DbService['sql'] = getClient.pipe(Effect.mapError(toQueryError))

    const run: DbService['run'] = (effect) => effect.pipe(Effect.mapError(toQueryError))

    const query: DbService['query'] = <Row extends object = Record<string, unknown>>(
      sqlText: string,
      params: ReadonlyArray<unknown> = [],
    ) =>
      sql.pipe(
        Effect.flatMap((client) => run(client.unsafe<Row>(sqlText, params))),
      )

    const ping: DbService['ping'] = query('select 1').pipe(Effect.asVoid)

    return { sql, run, ping, query } satisfies DbService
  }),
)
