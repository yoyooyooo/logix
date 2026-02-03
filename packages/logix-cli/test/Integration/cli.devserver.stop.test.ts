import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'

import { beforeAll, describe, expect, it } from 'vitest'

import { ensureCliBuilt } from '../helpers/ensureCliBuilt.js'

const execFileAsync = promisify(execFile)

const execFileStdoutAllowFailure = async (
  file: string,
  args: ReadonlyArray<string>,
  opts: Parameters<typeof execFileAsync>[2],
): Promise<{ readonly stdout: string; readonly exitCode: number }> => {
  try {
    const { stdout } = await execFileAsync(file, args, opts)
    return { stdout, exitCode: 0 }
  } catch (e: any) {
    const stdout = typeof e?.stdout === 'string' ? e.stdout : ''
    const exitCode = typeof e?.code === 'number' ? e.code : 1
    return { stdout, exitCode }
  }
}

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

const waitExit = async (child: ReturnType<typeof spawn>, timeoutMs: number): Promise<number | null> =>
  child.exitCode !== null
    ? child.exitCode
    : new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error(`timeout waiting child exit (${timeoutMs}ms)`)), timeoutMs)
        child.once('exit', (code) => {
          clearTimeout(t)
          resolve(code)
        })
      })

const waitForFileMissing = async (file: string, timeoutMs: number): Promise<void> => {
  const startedAt = Date.now()
  for (;;) {
    try {
      await fs.stat(file)
    } catch {
      return
    }
    if (Date.now() - startedAt > timeoutMs) throw new Error(`timeout waiting file missing: ${file}`)
    await new Promise((r) => setTimeout(r, 50))
  }
}

describe('logix-devserver (dist/bin) stop + auth', () => {
  beforeAll(async () => {
    const cliRoot = path.resolve(__dirname, '..', '..')
    await ensureCliBuilt(cliRoot)
  }, 120_000)

  it(
    'stop should request dev.stop via stateFile, exit process and delete stateFile',
    async () => {
      const cliRoot = path.resolve(__dirname, '..', '..')
      const workspaceRoot = path.resolve(cliRoot, '..', '..')

      const stateDir = await fs.mkdtemp(path.join(os.tmpdir(), 'intent-flow-logix-devserver-stop-'))
      const stateFile = path.join(stateDir, 'devserver.state.json')

      const child = spawn(
        process.execPath,
        [path.join(cliRoot, 'dist/bin/logix-devserver.js'), '--port', '0', '--shutdownAfterMs', '60000', '--stateFile', stateFile],
        { cwd: workspaceRoot, stdio: ['ignore', 'pipe', 'pipe'] },
      )

      try {
        const startedLine = await readFirstLine(child.stdout!)
        const started = JSON.parse(startedLine) as any
        expect(started?.kind).toBe('DevServerStarted')
        expect(started?.stateFile).toBe(stateFile)

        await fs.stat(stateFile)

        const { stdout: stopStdout } = await execFileAsync(
          process.execPath,
          [path.join(cliRoot, 'dist/bin/logix-devserver.js'), 'stop', '--stateFile', stateFile],
          { cwd: workspaceRoot, timeout: 60_000, maxBuffer: 10_000_000 },
        )
        const stop = JSON.parse(stopStdout.trim())
        expect(stop?.kind).toBe('DevServerStopResult')
        expect(stop?.ok).toBe(true)

        const exitCode = await waitExit(child, 30_000)
        expect(exitCode).toBe(0)

        await waitForFileMissing(stateFile, 5_000)
      } finally {
        child.kill('SIGTERM')
        await waitExit(child, 5_000).catch(() => null)
      }
    },
    120_000,
  )

  it(
    'token auth: missing token -> ERR_UNAUTHORIZED; token -> ok',
    async () => {
      const cliRoot = path.resolve(__dirname, '..', '..')
      const workspaceRoot = path.resolve(cliRoot, '..', '..')

      const stateDir = await fs.mkdtemp(path.join(os.tmpdir(), 'intent-flow-logix-devserver-auth-'))
      const stateFile = path.join(stateDir, 'devserver.state.json')
      const token = 'secret-token-1'

      const child = spawn(
        process.execPath,
        [
          path.join(cliRoot, 'dist/bin/logix-devserver.js'),
          '--port',
          '0',
          '--shutdownAfterMs',
          '60000',
          '--stateFile',
          stateFile,
          '--token',
          token,
        ],
        { cwd: workspaceRoot, stdio: ['ignore', 'pipe', 'pipe'] },
      )

      try {
        const startedLine = await readFirstLine(child.stdout!)
        const started = JSON.parse(startedLine) as any
        expect(started?.kind).toBe('DevServerStarted')
        expect(typeof started?.url).toBe('string')

        const dummyStateDir = await fs.mkdtemp(path.join(os.tmpdir(), 'intent-flow-logix-devserver-auth-dummy-'))
        const dummyStateFile = path.join(dummyStateDir, 'nope.state.json')

        const { stdout: unauthStdout, exitCode: unauthExitCode } = await execFileStdoutAllowFailure(
          process.execPath,
          [
            path.join(cliRoot, 'dist/bin/logix-devserver.js'),
            'call',
            '--url',
            started.url,
            '--stateFile',
            dummyStateFile,
            '--requestId',
            'auth-missing-token',
            '--method',
            'dev.info',
          ],
          {
            cwd: workspaceRoot,
            timeout: 60_000,
            maxBuffer: 10_000_000,
            env: { ...process.env, LOGIX_DEVSERVER_TOKEN: '' },
          },
        )
        const unauth = JSON.parse(unauthStdout.trim())
        expect(unauth?.type).toBe('response')
        expect(unauth?.ok).toBe(false)
        expect(unauth?.error?.code).toBe('ERR_UNAUTHORIZED')
        expect(unauthExitCode).toBe(1)

        const { stdout: authStdout } = await execFileAsync(
          process.execPath,
          [
            path.join(cliRoot, 'dist/bin/logix-devserver.js'),
            'call',
            '--url',
            started.url,
            '--stateFile',
            dummyStateFile,
            '--requestId',
            'auth-with-token',
            '--method',
            'dev.info',
            '--token',
            token,
          ],
          {
            cwd: workspaceRoot,
            timeout: 60_000,
            maxBuffer: 10_000_000,
            env: { ...process.env, LOGIX_DEVSERVER_TOKEN: '' },
          },
        )
        const auth = JSON.parse(authStdout.trim())
        expect(auth?.type).toBe('response')
        expect(auth?.ok).toBe(true)
      } finally {
        try {
          await execFileAsync(
            process.execPath,
            [path.join(cliRoot, 'dist/bin/logix-devserver.js'), 'stop', '--stateFile', stateFile],
            { cwd: workspaceRoot, timeout: 60_000, maxBuffer: 10_000_000 },
          )
        } catch {
          // ignore
        }

        child.kill('SIGTERM')
        await waitExit(child, 10_000).catch(() => null)
      }
    },
    120_000,
  )
})
