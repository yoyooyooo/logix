import '../src/env/load-env.js'

import { Pool } from 'pg'

const requireEnv = (name: string): string => {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing env: ${name}`)
  }
  return value
}

const databaseUrl = requireEnv('DATABASE_URL')

const pool = new Pool({ connectionString: databaseUrl, max: 1 })

try {
  await pool.query('create schema if not exists auth')
  // eslint-disable-next-line no-console
  console.log('ok')
} finally {
  await pool.end()
}
