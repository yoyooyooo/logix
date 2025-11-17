import { Effect, Layer } from 'effect'

import { Db, DbError } from '../db/db.js'
import { AuthEventTable, type AuthEventTableService } from './auth-event.table.js'

const isDbDisabled = (e: DbError): boolean => e.reason === 'disabled'

export const AuthEventTableLive: Layer.Layer<AuthEventTable, never, Db> = Layer.effect(
  AuthEventTable,
  Effect.gen(function* () {
    const db = yield* Db

    const ensure = yield* Effect.cached(
      Effect.gen(function* () {
        yield* db
          .query(
            `create table if not exists auth_events (
              event_id bigint generated always as identity primary key,
              event_type text not null check (
                event_type in (
                  'login_succeeded',
                  'login_failed',
                  'logout',
                  'user_created',
                  'user_disabled',
                  'user_enabled',
                  'password_reset'
                )
              ),
              actor_user_id text,
              subject_user_id text,
              identifier text,
              created_at timestamptz not null default now(),
              ip inet,
              user_agent text,
              detail jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object')
            )`,
          )
          .pipe(Effect.asVoid)

        yield* db.query('create index if not exists auth_events_created_at_idx on auth_events (created_at)').pipe(Effect.asVoid)
        yield* db
          .query('create index if not exists auth_events_event_type_created_at_idx on auth_events (event_type, created_at)')
          .pipe(Effect.asVoid)
        yield* db
          .query('create index if not exists auth_events_actor_user_id_created_at_idx on auth_events (actor_user_id, created_at)')
          .pipe(Effect.asVoid)
        yield* db
          .query(
            'create index if not exists auth_events_subject_user_id_created_at_idx on auth_events (subject_user_id, created_at)',
          )
          .pipe(Effect.asVoid)
        yield* db
          .query(
            'create index if not exists auth_events_identifier_lower_created_at_idx on auth_events (lower(identifier), created_at)',
          )
          .pipe(Effect.asVoid)
      }).pipe(Effect.catchIf(isDbDisabled, () => Effect.void)),
    )

    yield* ensure.pipe(
      Effect.catchAll((e) =>
        Effect.logWarning('auth_events table init failed').pipe(
          Effect.annotateLogs({ error: e }),
        ),
      ),
    )

    return { ensure } satisfies AuthEventTableService
  }),
)

