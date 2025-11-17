import { betterAuth } from 'better-auth'
import { admin } from 'better-auth/plugins/admin'
import { bearer } from 'better-auth/plugins/bearer'
import type { Pool } from 'pg'

export interface BetterAuthConfig {
  readonly pool: Pool
  readonly secret: string
  readonly baseURL: string
}

export const makeBetterAuth = (config: BetterAuthConfig) =>
  betterAuth({
    database: config.pool,
    secret: config.secret,
    baseURL: config.baseURL,
    telemetry: { enabled: false },
    rateLimit: { enabled: false },
    security: { csrf: { disabled: true } },
    emailAndPassword: { enabled: true, autoSignIn: false },
    plugins: [
      bearer(),
      admin({
        defaultRole: 'user',
        adminRoles: ['admin'],
      }),
    ],
  })
