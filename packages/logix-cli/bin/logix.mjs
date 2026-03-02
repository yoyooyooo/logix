#!/usr/bin/env node

import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const binDir = path.dirname(fileURLToPath(import.meta.url))
const distEntry = path.resolve(binDir, '../dist/bin/logix.js')

if (!existsSync(distEntry)) {
  console.error('[logix-cli] Missing dist/bin/logix.js. Run "pnpm -C packages/logix-cli build" first.')
  process.exit(1)
}

await import(pathToFileURL(distEntry).href)
