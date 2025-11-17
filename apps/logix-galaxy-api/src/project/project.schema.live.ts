import { Config, Context, Effect, Layer, Option } from 'effect'

import { Db, DbError } from '../db/db.js'

export interface ProjectSchemaService {
  readonly ready: Effect.Effect<void, DbError>
}

export class ProjectSchema extends Context.Tag('ProjectSchema')<ProjectSchema, ProjectSchemaService>() {}

const isDbDisabled = (e: DbError): boolean => e.reason === 'disabled'

const shouldAutoMigrate = Effect.gen(function* () {
  const rawOpt = yield* Config.option(Config.string('LOGIX_GALAXY_AUTO_MIGRATE_PROJECT_RBAC')).pipe(
    Effect.catchAll(() => Effect.succeed(Option.none())),
  )
  return Option.getOrElse(rawOpt, () => '1') !== '0'
})

export const ProjectSchemaLive: Layer.Layer<ProjectSchema, never, Db> = Layer.effect(
  ProjectSchema,
  Effect.gen(function* () {
    const db = yield* Db
    const autoMigrate = yield* shouldAutoMigrate

    const ready = yield* Effect.once(
      autoMigrate
        ? Effect.gen(function* () {
            const sql = yield* db.sql

            yield* db.run(
              sql`
                create table if not exists projects (
                  project_id bigint generated always as identity primary key,
                  name text not null check (length(btrim(name)) between 1 and 120),
                  created_by_user_id text not null references auth."user"(id),
                  created_at timestamptz not null default now(),
                  updated_at timestamptz not null default now()
                )
              `,
            ).pipe(Effect.asVoid)

            yield* db
              .run(
                sql`
                  create unique index if not exists projects_created_by_user_id_name_lower_uniq
                    on projects (created_by_user_id, lower(btrim(name)))
                `,
              )
              .pipe(Effect.asVoid)
            yield* db
              .run(sql`create index if not exists projects_created_by_user_id_idx on projects (created_by_user_id)`)
              .pipe(Effect.asVoid)
            yield* db.run(sql`create index if not exists projects_created_at_idx on projects (created_at)`).pipe(Effect.asVoid)

            yield* db.run(
              sql`
                create table if not exists project_members (
                  project_id bigint not null references projects(project_id) on delete cascade,
                  user_id text not null references auth."user"(id),
                  direct_role text not null check (direct_role in ('owner', 'admin', 'member', 'viewer')),
                  created_by_user_id text not null references auth."user"(id),
                  created_at timestamptz not null default now(),

                  primary key (project_id, user_id)
                )
              `,
            ).pipe(Effect.asVoid)

            yield* db.run(sql`create index if not exists project_members_user_id_idx on project_members (user_id)`).pipe(Effect.asVoid)
            yield* db
              .run(
                sql`
                  create index if not exists project_members_project_id_direct_role_idx
                    on project_members (project_id, direct_role)
                `,
              )
              .pipe(Effect.asVoid)

            yield* db.run(
              sql`
                create table if not exists project_groups (
                  group_id bigint generated always as identity primary key,
                  project_id bigint not null references projects(project_id) on delete cascade,
                  name text not null check (length(btrim(name)) between 1 and 120),
                  role_key text not null check (role_key in ('owner', 'admin', 'member', 'viewer')),
                  created_by_user_id text not null references auth."user"(id),
                  created_at timestamptz not null default now()
                )
              `,
            ).pipe(Effect.asVoid)

            yield* db
              .run(
                sql`
                  create unique index if not exists project_groups_project_id_group_id_uniq
                    on project_groups (project_id, group_id)
                `,
              )
              .pipe(Effect.asVoid)
            yield* db
              .run(
                sql`
                  create unique index if not exists project_groups_project_id_name_lower_uniq
                    on project_groups (project_id, lower(btrim(name)))
                `,
              )
              .pipe(Effect.asVoid)
            yield* db.run(sql`create index if not exists project_groups_project_id_idx on project_groups (project_id)`).pipe(Effect.asVoid)

            yield* db.run(
              sql`
                create table if not exists project_group_members (
                  project_id bigint not null,
                  group_id bigint not null,
                  user_id text not null,
                  created_by_user_id text not null references auth."user"(id),
                  created_at timestamptz not null default now(),

                  primary key (group_id, user_id),
                  foreign key (project_id, group_id) references project_groups(project_id, group_id) on delete cascade,
                  foreign key (project_id, user_id) references project_members(project_id, user_id) on delete cascade,
                  foreign key (user_id) references auth."user"(id)
                )
              `,
            ).pipe(Effect.asVoid)

            yield* db
              .run(
                sql`
                  create index if not exists project_group_members_project_id_user_id_idx
                    on project_group_members (project_id, user_id)
                `,
              )
              .pipe(Effect.asVoid)
            yield* db.run(sql`create index if not exists project_group_members_user_id_idx on project_group_members (user_id)`).pipe(Effect.asVoid)

            yield* db.run(
              sql`
                create table if not exists project_audit_events (
                  event_id bigint generated always as identity primary key,
                  project_id bigint not null references projects(project_id) on delete cascade,
                  event_type text not null check (
                    event_type in (
                      'project_created',
                      'member_added',
                      'member_removed',
                      'member_role_changed',
                      'group_created',
                      'group_deleted',
                      'group_member_added',
                      'group_member_removed',
                      'group_role_changed'
                    )
                  ),
                  actor_user_id text,
                  subject_user_id text,
                  subject_group_id bigint,
                  created_at timestamptz not null default now(),
                  detail jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object')
                )
              `,
            ).pipe(Effect.asVoid)

            yield* db.run(sql`create index if not exists project_audit_events_created_at_idx on project_audit_events (created_at)`).pipe(Effect.asVoid)
            yield* db
              .run(
                sql`
                  create index if not exists project_audit_events_project_id_created_at_idx
                    on project_audit_events (project_id, created_at)
                `,
              )
              .pipe(Effect.asVoid)
            yield* db
              .run(
                sql`
                  create index if not exists project_audit_events_event_type_created_at_idx
                    on project_audit_events (event_type, created_at)
                `,
              )
              .pipe(Effect.asVoid)
            yield* db
              .run(
                sql`
                  create index if not exists project_audit_events_actor_user_id_created_at_idx
                    on project_audit_events (actor_user_id, created_at)
                `,
              )
              .pipe(Effect.asVoid)
            yield* db
              .run(
                sql`
                  create index if not exists project_audit_events_subject_user_id_created_at_idx
                    on project_audit_events (subject_user_id, created_at)
                `,
              )
              .pipe(Effect.asVoid)
            yield* db
              .run(
                sql`
                  create index if not exists project_audit_events_subject_group_id_created_at_idx
                    on project_audit_events (subject_group_id, created_at)
                `,
              )
              .pipe(Effect.asVoid)
          })
        : Effect.void,
    )

    yield* ready.pipe(
      Effect.catchIf(isDbDisabled, () => Effect.void),
      Effect.catchAll((e) =>
        Effect.logWarning('project schema init failed').pipe(
          Effect.annotateLogs({ error: e }),
        ),
      ),
    )

    return { ready } satisfies ProjectSchemaService
  }),
)
