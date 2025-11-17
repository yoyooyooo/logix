import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = fileURLToPath(new URL('../../', import.meta.url))
const envLocalPath = path.join(appRoot, '.env.local')

const result = dotenv.config({ path: envLocalPath, override: false })
if (result.error && (result.error as NodeJS.ErrnoException).code !== 'ENOENT') {
  throw result.error
}

