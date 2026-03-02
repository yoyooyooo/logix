import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)

const consumeOption = (name) => {
  const index = args.indexOf(name)
  if (index < 0) return undefined
  const value = args[index + 1]
  if (!value || value.startsWith('--')) {
    throw new Error(`missing value for ${name}`)
  }
  args.splice(index, 2)
  return value
}

const expectedReason = consumeOption('--reason')
const expectedExitRaw = consumeOption('--exit') ?? '2'
const separator = args.indexOf('--')
if (!expectedReason) {
  throw new Error('missing --reason <REASON_CODE>')
}
if (separator < 0) {
  throw new Error('missing -- separator before command')
}

const expectedExit = Number(expectedExitRaw)
if (!Number.isInteger(expectedExit)) {
  throw new Error(`invalid --exit: ${expectedExitRaw}`)
}

const command = args.slice(separator + 1)
if (command.length === 0) {
  throw new Error('empty command after --')
}

const run = spawnSync(command[0], command.slice(1), {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: ['ignore', 'pipe', 'pipe'],
})

if (run.stdout) process.stdout.write(run.stdout)
if (run.stderr) process.stderr.write(run.stderr)
if (run.error) throw run.error

const lines = (run.stdout ?? '')
  .split(/\r?\n/u)
  .map((line) => line.trim())
  .filter((line) => line.length > 0)

let reasonCode = ''
for (let i = lines.length - 1; i >= 0; i -= 1) {
  try {
    const parsed = JSON.parse(lines[i])
    reasonCode = parsed.reasonCode ?? parsed.error?.code ?? ''
    if (reasonCode) break
  } catch {
    continue
  }
}

const exitCode = run.status ?? 1
if (exitCode === expectedExit && reasonCode === expectedReason) {
  process.stdout.write(
    `[logix-cli-playground] accepted expected violation (exit=${expectedExit}, reason=${expectedReason}).\n`,
  )
  process.exit(0)
}

process.stderr.write(
  `[logix-cli-playground] unexpected result: exit=${exitCode}, reason=${reasonCode || '<empty>'}, expected exit=${expectedExit}, reason=${expectedReason}.\n`,
)
process.exit(exitCode === 0 ? 1 : exitCode)
