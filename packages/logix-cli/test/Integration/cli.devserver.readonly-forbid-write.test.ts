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

describe('logix-devserver (101) readOnly forbids --mode write', () => {
  it(
    'should return ERR_FORBIDDEN for dev.run(argv contains --mode write) when allowWrite is not enabled',
    async () => {
      const cliRoot = path.resolve(__dirname, '..', '..')
      const workspaceRoot = path.resolve(cliRoot, '..', '..')
      const repoRoot = path.join(workspaceRoot, 'examples/logix-cli-playground')

      await ensureCliBuilt(cliRoot)

      const stateDir = await fs.mkdtemp(path.join(os.tmpdir(), 'intent-flow-logix-devserver-readonly-'))
      const stateFile = path.join(stateDir, 'devserver.state.json')

      const child = spawn(
        process.execPath,
        [path.join(cliRoot, 'dist/bin/logix-devserver.js'), '--port', '0', '--shutdownAfterMs', '20000', '--stateFile', stateFile],
        { cwd: workspaceRoot, stdio: ['ignore', 'pipe', 'pipe'] },
      )

      try {
        const startedLine = await readFirstLine(child.stdout!)
        const started = JSON.parse(startedLine) as any
        expect(started?.kind).toBe('DevServerStarted')
        expect(typeof started?.url).toBe('string')

        const { stdout: infoStdout } = await execFileAsync(
          process.execPath,
          [
            path.join(cliRoot, 'dist/bin/logix-devserver.js'),
            'call',
            '--url',
            started.url,
            '--requestId',
            'devserver-readonly-info',
            '--method',
            'dev.info',
          ],
          { cwd: workspaceRoot, timeout: 60_000, maxBuffer: 10_000_000 },
        )
        const info = JSON.parse(infoStdout.trim())
        expect(info?.ok).toBe(true)
        expect(info?.result?.capabilities?.write).toBe(false)

        const { stdout: runStdout } = await execFileAsync(
          process.execPath,
          [
            path.join(cliRoot, 'dist/bin/logix-devserver.js'),
            'call',
            '--url',
            started.url,
            '--requestId',
            'devserver-readonly-run',
            '--method',
            'dev.run',
            '--',
            'anchor',
            'autofill',
            '--mode',
            'write',
            '--repoRoot',
            repoRoot,
          ],
          { cwd: workspaceRoot, timeout: 60_000, maxBuffer: 10_000_000 },
        ).catch((err: any) => {
          // Spec 095: ok:false -> exit code=1, but stdout still contains the machine-readable response.
          expect(err?.code).toBe(1)
          return { stdout: String(err?.stdout ?? '') }
        })
        const resp = JSON.parse(runStdout.trim())
        expect(resp?.ok).toBe(false)
        expect(resp?.error?.code).toBe('ERR_FORBIDDEN')
      } finally {
        child.kill('SIGTERM')
        await waitExit(child)
      }
    },
    120_000,
  )
})
