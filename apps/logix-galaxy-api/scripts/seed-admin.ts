import { APIError } from 'better-auth/api'

import '../src/env/load-env.js'
import { seedAdmin } from '../src/auth/seed-admin.js'

const requireEnv = (name: string): string => {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing env: ${name}`)
  }
  return value
}

const databaseUrl = requireEnv('DATABASE_URL')
const secret = requireEnv('BETTER_AUTH_SECRET')
const baseURL = requireEnv('BETTER_AUTH_URL')

const email = requireEnv('ADMIN_EMAIL').trim().toLowerCase()
const password = requireEnv('ADMIN_PASSWORD')
const name = (process.env.ADMIN_NAME ?? 'Admin').trim()

try {
  await seedAdmin({
    databaseUrl,
    secret,
    baseURL,
    email,
    password,
    name,
    runMigrations: true,
  })

  // eslint-disable-next-line no-console
  console.log('ok')
} catch (e) {
  if (e instanceof APIError) {
    // eslint-disable-next-line no-console
    console.error(`APIError ${e.statusCode}: ${e.message}`)
  } else {
    // eslint-disable-next-line no-console
    console.error(e)
  }
  process.exitCode = 1
}
