import { spawn, type ChildProcess } from 'node:child_process'

function spawnPnpm(args: ReadonlyArray<string>): ChildProcess {
  const isWin = process.platform === 'win32'
  const command = isWin ? 'pnpm.cmd' : 'pnpm'
  return spawn(command, args, { stdio: 'inherit' })
}

const children: ChildProcess[] = []
let shuttingDown = false

function shutdown(code: number): void {
  if (shuttingDown) return
  shuttingDown = true

  for (const child of children) {
    child.kill('SIGINT')
  }

  setTimeout(() => {
    for (const child of children) {
      child.kill('SIGKILL')
    }
    process.exit(code)
  }, 1500).unref()
}

process.on('SIGINT', () => shutdown(130))
process.on('SIGTERM', () => shutdown(143))

const backend = spawnPnpm(['-C', 'apps/speckit-kanban-api', 'dev'])
children.push(backend)

backend.on('exit', (code) => {
  shutdown(typeof code === 'number' ? code : 1)
})

const frontend = spawnPnpm(['-C', 'packages/speckit-kit', 'dev:ui', '--', '--open'])
children.push(frontend)

frontend.on('exit', (code) => {
  shutdown(typeof code === 'number' ? code : 1)
})
