import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'

import { describe, expect, it } from 'vitest'

import { ensureCliBuilt } from '../helpers/ensureCliBuilt.js'

const execFileAsync = promisify(execFile)

const readFirstLine = async (stream: NodeJS.ReadableStream): Promise<string> => {
  stream.setEncoding('utf8')
  return new Promise((resolve, reject) => {
    let buf = ''
    const onData = (chunk: string) => {
      buf += chunk
      const idx = buf.indexOf('\n')
      if (idx >= 0) {
        cleanup()
        resolve(buf.slice(0, idx).trim())
      }
    }
    const onError = (err: unknown) => {
      cleanup()
      reject(err)
    }
    const onEnd = () => {
      cleanup()
      reject(new Error('stdout ended before first line'))
    }
    const cleanup = () => {
      stream.off('data', onData)
      stream.off('error', onError)
      stream.off('end', onEnd)
    }

    stream.on('data', onData)
    stream.on('error', onError)
    stream.on('end', onEnd)
  })
}

const waitExit = async (child: ReturnType<typeof spawn>): Promise<number | null> =>
  new Promise((resolve) => child.once('exit', (code) => resolve(code)))

describe('logix-devserver (100) workspace snapshot', () => {
  it(
    'should return repoRoot/cwd/packageManager and cliConfig discovery',
    async () => {
      const cliRoot = path.resolve(__dirname, '..', '..')
      const workspaceRoot = path.resolve(cliRoot, '..', '..')
      const cwdForServer = path.join(workspaceRoot, 'examples/logix-cli-playground')

      await ensureCliBuilt(cliRoot)

      const stateDir = await fs.mkdtemp(path.join(os.tmpdir(), 'intent-flow-logix-devserver-snapshot-'))
      const stateFile = path.join(stateDir, 'devserver.state.json')

      const child = spawn(
        process.execPath,
        [path.join(cliRoot, 'dist/bin/logix-devserver.js'), '--port', '0', '--shutdownAfterMs', '20000', '--stateFile', stateFile],
        { cwd: cwdForServer, stdio: ['ignore', 'pipe', 'pipe'] },
      )

      try {
        const startedLine = await readFirstLine(child.stdout!)
        const started = JSON.parse(startedLine) as any
        expect(started?.kind).toBe('DevServerStarted')
        expect(typeof started?.url).toBe('string')

        const { stdout } = await execFileAsync(
          process.execPath,
          [
            path.join(cliRoot, 'dist/bin/logix-devserver.js'),
            'call',
            '--url',
            started.url,
            '--requestId',
            'devserver-snapshot-1',
            '--method',
            'dev.workspace.snapshot',
          ],
          { cwd: workspaceRoot, timeout: 60_000, maxBuffer: 10_000_000 },
        )

        const resp = JSON.parse(stdout.trim()) as any
        expect(resp?.ok).toBe(true)
        expect(resp?.result?.repoRoot).toBe(workspaceRoot)
        expect(resp?.result?.cwd).toBe(cwdForServer)
        expect(resp?.result?.packageManager).toBe('pnpm')
        expect(resp?.result?.devserver?.protocol).toBe('intent-flow.devserver.v1')
        expect(typeof resp?.result?.devserver?.version).toBe('string')

        expect(resp?.result?.cliConfig?.found).toBe(true)
        expect(resp?.result?.cliConfig?.ok).toBe(true)
        expect(typeof resp?.result?.cliConfig?.path).toBe('string')
        expect(resp?.result?.cliConfig?.path).toContain('logix.cli.json')
        expect(resp?.result?.cliConfig?.profiles).toContain('trace')
        expect(resp?.result?.cliConfig?.config?.schemaVersion).toBe(1)
      } finally {
        child.kill('SIGTERM')
        await waitExit(child)
      }
    },
    120_000,
  )
})

