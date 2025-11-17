import { Config, Effect, Option } from 'effect'
import { Pool } from 'pg'

import { makeBetterAuth } from './better-auth.js'

export interface SeedAdminInput {
  readonly databaseUrl: string
  readonly secret: string
  readonly baseURL: string
  readonly email: string
  readonly password: string
  readonly name: string
  readonly runMigrations?: boolean
}

export type SeedAdminResult = 'created' | 'updated'

export const seedAdmin = async (input: SeedAdminInput): Promise<SeedAdminResult> => {
  const pool = new Pool({
    connectionString: input.databaseUrl,
    options: '-csearch_path=auth',
    max: 1,
  })

  try {
    await pool.query('create schema if not exists auth')

    const auth = makeBetterAuth({ pool, secret: input.secret, baseURL: input.baseURL })
    const ctx = await auth.$context

    if (input.runMigrations !== false) {
      await ctx.runMigrations()
    }

    await pool.query(
      `create unique index if not exists auth_user_email_lower_uniq
      on auth."user" (lower(email))`,
    )

    const email = input.email.trim().toLowerCase()
    const existing = await ctx.internalAdapter.findUserByEmail(email)

    if (!existing) {
      await auth.api.createUser({
        body: { email, password: input.password, name: input.name, role: 'admin' },
      })
      return 'created'
    }

    const userId = existing.user.id

    await ctx.internalAdapter.updateUser(userId, {
      name: input.name,
      role: 'admin',
      banned: false,
      banReason: null,
      banExpires: null,
    } as any)

    const hashedPassword = await ctx.password.hash(input.password)
    await ctx.internalAdapter.updatePassword(userId, hashedPassword)
    return 'updated'
  } finally {
    await pool.end()
  }
}

const parseBool = (raw: string): boolean => {
  const v = raw.trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes' || v === 'on'
}

export const seedAdminIfEnabled = Effect.gen(function* () {
  const enabledOpt = yield* Config.option(Config.string('LOGIX_GALAXY_AUTO_SEED_ADMIN')).pipe(
    Effect.catchAll(() => Effect.succeed(Option.none())),
  )
  const enabled = Option.isSome(enabledOpt) && parseBool(enabledOpt.value)
  if (!enabled) return

  const databaseUrl = yield* Config.string('DATABASE_URL')
  const secret = yield* Config.string('BETTER_AUTH_SECRET')
  const baseURL = yield* Config.string('BETTER_AUTH_URL')
  const email = yield* Config.string('ADMIN_EMAIL')
  const password = yield* Config.string('ADMIN_PASSWORD')
  const nameOpt = yield* Config.option(Config.string('ADMIN_NAME')).pipe(Effect.catchAll(() => Effect.succeed(Option.none())))
  const name = Option.getOrElse(nameOpt, () => 'Admin')

  yield* Effect.tryPromise({
    try: () =>
      seedAdmin({
        databaseUrl,
        secret,
        baseURL,
        email,
        password,
        name,
        runMigrations: true,
      }),
    catch: (cause) => cause,
  }).pipe(Effect.asVoid)
})
