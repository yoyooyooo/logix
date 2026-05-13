import { spawnSync } from 'node:child_process'

type Task = {
  readonly label: string
  readonly command: ReadonlyArray<string>
}

type TaskResult = {
  readonly label: string
  readonly durationMs: number
}

const hasFlag = (flag: string): boolean => process.argv.slice(2).includes(flag)

const runTask = (task: Task): TaskResult => {
  const [cmd, ...args] = task.command
  const startedAt = Date.now()
  const run = spawnSync(cmd, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
  })
  const durationMs = Date.now() - startedAt

  if (run.status !== 0) {
    throw new Error(`[ci:preflight] ${task.label} failed (code=${String(run.status)})`)
  }

  return {
    label: task.label,
    durationMs,
  }
}

const formatSeconds = (durationMs: number): string => (durationMs / 1000).toFixed(1)

const main = (): void => {
  const includeTinyCollect = hasFlag('--with-tiny-collect')

  const tasks: Task[] = [
    {
      label: 'decision-smoke',
      command: ['pnpm', '-C', 'packages/logix-perf-evidence', 'run', 'ci:decision-smoke'],
    },
    {
      label: 'replay',
      command: ['pnpm', '-C', 'packages/logix-perf-evidence', 'run', 'ci:replay'],
    },
  ]

  if (includeTinyCollect) {
    tasks.push({
      label: 'tiny-collect',
      command: ['pnpm', '-C', 'packages/logix-perf-evidence', 'run', 'ci:tiny-collect'],
    })
  }

  const startedAt = Date.now()
  const outputs = tasks.map(runTask)
  const totalMs = Date.now() - startedAt

  // eslint-disable-next-line no-console
  console.log('[logix-perf] preflight summary:')
  for (const output of outputs) {
    // eslint-disable-next-line no-console
    console.log(`- ${output.label}: ${formatSeconds(output.durationMs)}s`)
  }
  // eslint-disable-next-line no-console
  console.log(`- total: ${formatSeconds(totalMs)}s`)
  // eslint-disable-next-line no-console
  console.log('[logix-perf] preflight passed')
}

try {
  main()
} catch (error) {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
