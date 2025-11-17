import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../../../..')

const child = spawn(
  'pnpm',
  ['-C', repoRoot, 'exec', 'tsx', '.codex/skills/logix-perf-evidence/scripts/bench.useModule.ts'],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      ITERS: '5000',
    },
  },
)

child.on('exit', (code) => {
  process.exit(code ?? 1)
})
