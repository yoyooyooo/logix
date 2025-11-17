import type { SqlClient } from '@effect/sql/SqlClient'
import { Effect, Layer, Option } from 'effect'

import { Db } from '../db/db.js'
import { AuthEventTable } from './auth-event.table.js'
import { AuthEventRepo, type AuthEventRepoService } from './auth-event.repo.js'

interface AuthEventRow {
  readonly eventId: number
  readonly eventType: string
  readonly actorUserId: string | null
  readonly subjectUserId: string | null
  readonly identifier: string | null
  readonly createdAt: string
}

export const AuthEventRepoLive: Layer.Layer<AuthEventRepo, never, Db | AuthEventTable> = Layer.effect(
  AuthEventRepo,
  Effect.gen(function* () {
    const db = yield* Db
    yield* AuthEventTable
    const withSql = <A, E>(f: (sql: SqlClient) => Effect.Effect<A, E>) => db.sql.pipe(Effect.flatMap(f))

    const write: AuthEventRepoService['write'] = (input) =>
      withSql((sql) =>
        db
          .run(
            sql`
              insert into auth_events (event_type, actor_user_id, subject_user_id, identifier, ip, user_agent, detail)
              values (
                ${input.eventType},
                ${input.actorUserId ?? null},
                ${input.subjectUserId ?? null},
                ${input.identifier ?? null},
                ${input.ip ?? null},
                ${input.userAgent ?? null},
                ${JSON.stringify(input.detail ?? {})}
              )
            `,
          )
          .pipe(Effect.asVoid),
      )

    const list: AuthEventRepoService['list'] = (query) =>
      withSql((sql) =>
        Effect.gen(function* () {
          const clauses: Array<string | ReturnType<typeof sql.literal>> = []
          if (query.from) clauses.push(sql`created_at >= ${query.from}::timestamptz`)
          if (query.to) clauses.push(sql`created_at <= ${query.to}::timestamptz`)
          if (query.subjectUserId) clauses.push(sql`subject_user_id = ${query.subjectUserId}`)
          if (query.actorUserId) clauses.push(sql`actor_user_id = ${query.actorUserId}`)
          if (query.identifier) clauses.push(sql`lower(identifier) = lower(${query.identifier})`)

          const rows = yield* db.run(
            sql<AuthEventRow>`
              select
                event_id::int as "eventId",
                event_type as "eventType",
                actor_user_id as "actorUserId",
                subject_user_id as "subjectUserId",
                identifier,
                created_at::text as "createdAt"
              from auth_events
              where ${sql.and(clauses)}
              order by event_id desc
              limit 200
            `,
          )

          return rows.map((r) => ({
            eventId: r.eventId,
            eventType: r.eventType as any,
            actorUserId: Option.getOrNull(Option.fromNullable(r.actorUserId)),
            subjectUserId: Option.getOrNull(Option.fromNullable(r.subjectUserId)),
            identifier: Option.getOrNull(Option.fromNullable(r.identifier)),
            createdAt: r.createdAt,
          }))
        }),
      )

    return { write, list } satisfies AuthEventRepoService
  }),
)
