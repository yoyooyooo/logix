import { spawn } from 'node:child_process'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

const defaultFiles = ['test/browser/browser-environment-smoke.test.tsx']

const main = async (): Promise<void> => {
  const files = process.argv.slice(2)
  const targets = files.length > 0 ? files : defaultFiles

  const child = spawn(
    'pnpm',
    ['-C', 'packages/logix-react', 'test', '--', '--project', 'browser', '--maxWorkers', '1', ...targets],
    {
      stdio: 'inherit',
      shell: false,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        ...(process.env.VITE_LOGIX_PERF_HARD_GATES ? {} : { VITE_LOGIX_PERF_HARD_GATES: 'off' }),
      },
    },
  )

  const exitCode: number = await new Promise((resolve) => {
    child.on('close', (code) => resolve(code ?? 1))
  })

  process.exitCode = exitCode
}

const isEntrypoint = process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href

if (isEntrypoint) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
