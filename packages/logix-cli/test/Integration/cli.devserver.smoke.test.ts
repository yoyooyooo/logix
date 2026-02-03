import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { execFile } from 'node:child_process'
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

describe('logix-devserver (dist/bin) smoke', () => {
  it(
    'should start devserver and run `dev.run` for anchor.index (injectRunId)',
    async () => {
      const cliRoot = path.resolve(__dirname, '..', '..')
      const workspaceRoot = path.resolve(cliRoot, '..', '..')
      const repoRoot = path.join(workspaceRoot, 'examples/logix-cli-playground')

      await ensureCliBuilt(cliRoot)

      const stateDir = await fs.mkdtemp(path.join(os.tmpdir(), 'intent-flow-logix-devserver-smoke-'))
      const stateFile = path.join(stateDir, 'devserver.state.json')

      const child = spawn(
        process.execPath,
        [
          path.join(cliRoot, 'dist/bin/logix-devserver.js'),
          '--port',
          '0',
          '--shutdownAfterMs',
          '20000',
          '--stateFile',
          stateFile,
        ],
        { cwd: workspaceRoot, stdio: ['ignore', 'pipe', 'pipe'] },
      )

      try {
        const startedLine = await readFirstLine(child.stdout!)
        const started = JSON.parse(startedLine) as any
        expect(started?.kind).toBe('DevServerStarted')
        expect(typeof started?.url).toBe('string')
        expect(typeof started?.stateFile).toBe('string')

        const requestId = 'devserver-smoke-1'
        const { stdout: infoStdout } = await execFileAsync(
          process.execPath,
          [
            path.join(cliRoot, 'dist/bin/logix-devserver.js'),
            'call',
            '--url',
            started.url,
            '--requestId',
            'devserver-smoke-info',
            '--method',
            'dev.info',
          ],
          { cwd: workspaceRoot, timeout: 60_000, maxBuffer: 10_000_000 },
        )
        const info = JSON.parse(infoStdout.trim())
        expect(info?.type).toBe('response')
        expect(info?.ok).toBe(true)
        expect(info?.requestId).toBe('devserver-smoke-info')
        expect(info?.result?.protocol).toBe('intent-flow.devserver.v1')
        expect(typeof info?.result?.version).toBe('string')

        const { stdout: infoFromStateStdout } = await execFileAsync(
          process.execPath,
          [
            path.join(cliRoot, 'dist/bin/logix-devserver.js'),
            'call',
            '--stateFile',
            started.stateFile,
            '--requestId',
            'devserver-smoke-info-state',
            '--method',
            'dev.info',
          ],
          { cwd: workspaceRoot, timeout: 60_000, maxBuffer: 10_000_000 },
        )
        const info2 = JSON.parse(infoFromStateStdout.trim())
        expect(info2?.ok).toBe(true)
        expect(info2?.requestId).toBe('devserver-smoke-info-state')

        const { stdout: statusStdout } = await execFileAsync(
          process.execPath,
          [path.join(cliRoot, 'dist/bin/logix-devserver.js'), 'status', '--stateFile', started.stateFile],
          { cwd: workspaceRoot, timeout: 60_000, maxBuffer: 10_000_000 },
        )
        const status = JSON.parse(statusStdout.trim())
        expect(status?.kind).toBe('DevServerStatus')
        expect(status?.ok).toBe(true)

        const { stdout: runStdout } = await execFileAsync(
          process.execPath,
          [
            path.join(cliRoot, 'dist/bin/logix-devserver.js'),
            'call',
            '--url',
            started.url,
            '--requestId',
            requestId,
            '--method',
            'dev.run',
            '--',
            'anchor',
            'index',
            '--repoRoot',
            repoRoot,
          ],
          { cwd: workspaceRoot, timeout: 60_000, maxBuffer: 10_000_000 },
        )
        const resp = JSON.parse(runStdout.trim())
        expect(resp?.type).toBe('response')
        expect(resp?.ok).toBe(true)
        expect(resp?.requestId).toBe(requestId)

        const outcome = resp?.result?.outcome
        expect(outcome?.kind).toBe('result')
        expect(outcome?.result?.kind).toBe('CommandResult')
        expect(outcome?.result?.command).toBe('anchor.index')
        expect(outcome?.result?.runId).toBe(requestId)
      } finally {
        child.kill('SIGTERM')
        await waitExit(child)
      }
    },
    120_000,
  )
})
