import './src/env/load-env.js'

import { betterAuth } from 'better-auth'
import { admin } from 'better-auth/plugins/admin'
import { bearer } from 'better-auth/plugins/bearer'
import { Pool } from 'pg'

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
    options: '-csearch_path=auth',
  }),
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
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
