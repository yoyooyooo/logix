import { HttpApiBuilder } from '@effect/platform'
import { Effect } from 'effect'

import { EffectApi } from '../app/effect-api.js'
import { Db, DbError } from '../db/db.js'

const getDbStatus = Effect.gen(function* () {
  const db = yield* Db
  return yield* db.ping.pipe(
    Effect.as('ok' as const),
    Effect.catchIf(
      (e): e is DbError => e._tag === 'DbError' && e.reason === 'disabled',
      () => Effect.succeed('disabled' as const),
    ),
    Effect.catchAll(() => Effect.succeed('down' as const)),
  )
})

export const HealthLive = HttpApiBuilder.group(EffectApi, 'Health', (handlers) =>
  handlers
    .handle('health', () =>
      Effect.gen(function* () {
        const dbStatus = yield* getDbStatus
        return { ok: dbStatus !== 'down', db: dbStatus }
      }),
    )
    .handle('healthProbe', ({ path }) =>
      Effect.gen(function* () {
        const dbStatus = yield* getDbStatus
        return { ok: dbStatus !== 'down', db: dbStatus, probe: path.probe }
      }),
    ),
)
