import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const bin = path.resolve(here, '..', 'dist', 'bin', 'logix.js')
if (!fs.existsSync(bin)) {
  console.error(`[logix-cli] missing built bin: ${bin}`)
  console.error('[logix-cli] run: pnpm -C packages/logix-cli build')
  process.exitCode = 1
  process.exit(1)
}

const t0 = process.hrtime.bigint()
const r = spawnSync(process.execPath, [bin, '--help'], { stdio: 'ignore' })
const ms = Number(process.hrtime.bigint() - t0) / 1e6

process.stdout.write(`${ms.toFixed(2)}\n`)
process.exitCode = typeof r.status === 'number' ? r.status : 1
