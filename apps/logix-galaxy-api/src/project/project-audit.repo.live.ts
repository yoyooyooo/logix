import type { SqlClient } from '@effect/sql/SqlClient'
import { Effect, Layer, Option } from 'effect'

import { Db } from '../db/db.js'
import { ProjectAuditRepo, type ProjectAuditRepoService } from './project-audit.repo.js'
import { ProjectSchema } from './project.schema.live.js'

interface ProjectAuditEventRow {
  readonly eventId: number
  readonly projectId: number
  readonly eventType: string
  readonly actorUserId: string | null
  readonly subjectUserId: string | null
  readonly subjectGroupId: number | null
  readonly createdAt: string
  readonly detail: Record<string, unknown>
}

export const ProjectAuditRepoLive: Layer.Layer<ProjectAuditRepo, never, Db | ProjectSchema> = Layer.effect(
  ProjectAuditRepo,
  Effect.gen(function* () {
    const db = yield* Db
    const withSql = <A, E>(f: (sql: SqlClient) => Effect.Effect<A, E>) => db.sql.pipe(Effect.flatMap(f))
    const schema = yield* ProjectSchema

    const ensureReady = schema.ready

    const write: ProjectAuditRepoService['write'] = (input) =>
      ensureReady.pipe(
        Effect.zipRight(
          withSql((sql) =>
            db
              .run(
                sql`
                  insert into project_audit_events (
                    project_id,
                    event_type,
                    actor_user_id,
                    subject_user_id,
                    subject_group_id,
                    detail
                  ) values (
                    ${input.projectId},
                    ${input.eventType},
                    ${input.actorUserId ?? null},
                    ${input.subjectUserId ?? null},
                    ${input.subjectGroupId ?? null},
                    ${JSON.stringify(input.detail ?? {})}
                  )
                `,
              )
              .pipe(Effect.asVoid),
          ),
        ),
      )

    const list: ProjectAuditRepoService['list'] = (query) =>
      ensureReady.pipe(
        Effect.zipRight(
          withSql((sql) =>
            Effect.gen(function* () {
              const clauses: Array<string | ReturnType<typeof sql.literal>> = [sql`project_id = ${query.projectId}`]
              if (query.from) clauses.push(sql`created_at >= ${query.from}::timestamptz`)
              if (query.to) clauses.push(sql`created_at < ${query.to}::timestamptz`)
              if (query.eventType) clauses.push(sql`event_type = ${query.eventType}`)
              if (query.actorUserId) clauses.push(sql`actor_user_id = ${query.actorUserId}`)
              if (query.subjectUserId) clauses.push(sql`subject_user_id = ${query.subjectUserId}`)
              if (query.subjectGroupId !== undefined)
                clauses.push(sql`subject_group_id = ${query.subjectGroupId}::bigint`)

              const rows = yield* db.run(
                sql<ProjectAuditEventRow>`
                  select
                    event_id::int as "eventId",
                    project_id::int as "projectId",
                    event_type as "eventType",
                    actor_user_id as "actorUserId",
                    subject_user_id as "subjectUserId",
                    subject_group_id::int as "subjectGroupId",
                    created_at::text as "createdAt",
                    detail as "detail"
                  from project_audit_events
                  where ${sql.and(clauses)}
                  order by event_id desc
                  limit 200
                `,
              )

              return rows.map((r) => ({
                eventId: r.eventId,
                projectId: r.projectId,
                eventType: r.eventType as any,
                actorUserId: Option.getOrNull(Option.fromNullable(r.actorUserId)),
                subjectUserId: Option.getOrNull(Option.fromNullable(r.subjectUserId)),
                subjectGroupId: Option.getOrNull(Option.fromNullable(r.subjectGroupId)),
                createdAt: r.createdAt,
                detail: r.detail ?? {},
              }))
            }),
          ),
        ),
      )

    return { write, list } satisfies ProjectAuditRepoService
  }),
)
