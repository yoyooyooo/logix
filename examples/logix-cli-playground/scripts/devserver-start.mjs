import { spawnSync } from 'node:child_process'

const args = ['--port', '0', '--shutdownAfterMs', '120000', '--stateFile', '.logix/out/devserver.state.json']
const run = spawnSync('logix-devserver', args, {
  cwd: process.cwd(),
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
})

const stdout = run.stdout ?? ''
const stderr = run.stderr ?? ''

if (stdout.length > 0) process.stdout.write(stdout)
if (stderr.length > 0) process.stderr.write(stderr)

if ((run.status ?? 1) === 0) {
  process.exit(0)
}

const lines = stdout
  .split(/\r?\n/u)
  .map((line) => line.trim())
  .filter((line) => line.length > 0)

let reasonCode = ''
const lastLine = lines.at(-1)
if (lastLine) {
  try {
    const parsed = JSON.parse(lastLine)
    reasonCode = parsed.error?.code ?? ''
  } catch {
    reasonCode = ''
  }
}

if (reasonCode === 'CLI_NOT_IMPLEMENTED') {
  process.stdout.write(
    '[logix-cli-playground] logix-devserver is currently unavailable in this build (CLI_NOT_IMPLEMENTED), skip as non-failure path.\n',
  )
  process.exit(0)
}

process.exit(run.status ?? 1)
