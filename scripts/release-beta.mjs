import { existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const rawArgs = process.argv.slice(2)
const args = rawArgs[0] === '--' ? rawArgs.slice(1) : rawArgs
const prePath = new URL('../.changeset/pre.json', import.meta.url)

let inPreMode = false
if (existsSync(prePath)) {
  try {
    const pre = JSON.parse(readFileSync(prePath, 'utf8'))
    inPreMode = pre?.mode === 'pre'
  } catch {
    inPreMode = false
  }
}

const commandArgs = inPreMode ? ['publish', ...args] : ['publish', '--tag', 'beta', ...args]
const result = spawnSync('changeset', commandArgs, {
  stdio: 'inherit',
  shell: true,
  env: process.env,
})

process.exit(result.status ?? 1)
