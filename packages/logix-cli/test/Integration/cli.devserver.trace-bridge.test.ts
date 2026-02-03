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

describe('logix-devserver (102) trace bridge', () => {
  it(
    'should emit dev.event.trace.* events when dev.run params.trace is enabled',
    async () => {
      const cliRoot = path.resolve(__dirname, '..', '..')
      const workspaceRoot = path.resolve(cliRoot, '..', '..')

      await ensureCliBuilt(cliRoot)

      const stateDir = await fs.mkdtemp(path.join(os.tmpdir(), 'intent-flow-logix-devserver-trace-'))
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

        const entry = path.resolve(__dirname, '../fixtures/BasicModule.ts#AppRoot')

        const { stdout } = await execFileAsync(
          process.execPath,
          [
            path.join(cliRoot, 'dist/bin/logix-devserver.js'),
            'call',
            '--url',
            started.url,
            '--requestId',
            'devserver-trace-1',
            '--method',
            'dev.run',
            '--includeEvents',
            '--trace',
            '--traceMaxBytes',
            '4096',
            '--traceChunkBytes',
            '256',
            '--',
            'trialrun',
            '--entry',
            entry,
            '--diagnosticsLevel',
            'off',
            '--timeout',
            '2000',
            '--includeTrace',
          ],
          { cwd: workspaceRoot, timeout: 120_000, maxBuffer: 10_000_000 },
        )

        const resp = JSON.parse(stdout.trim()) as any
        expect(resp?.ok).toBe(true)
        expect(resp?.result?.outcome?.kind).toBe('result')
        expect(Array.isArray(resp?.events)).toBe(true)

        const kinds = (resp.events as any[]).map((e) => e?.event?.kind).filter(Boolean)
        expect(kinds).toContain('dev.event.trace.started')
        expect(kinds).toContain('dev.event.trace.finished')

        const finished = (resp.events as any[]).find((e) => e?.event?.kind === 'dev.event.trace.finished')
        expect(finished?.event?.payload?.available).toBe(true)
      } finally {
        child.kill('SIGTERM')
        await waitExit(child)
      }
    },
    180_000,
  )
})

