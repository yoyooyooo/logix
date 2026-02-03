import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

import { describe, expect, it } from 'vitest'

import { ensureCliBuilt } from '../helpers/ensureCliBuilt.js'

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

describe('logix-devserver (101) state file permissions', () => {
  it(
    'should write state file with 0600 on unix (best-effort)',
    async () => {
      if (process.platform === 'win32') return

      const cliRoot = path.resolve(__dirname, '..', '..')
      const workspaceRoot = path.resolve(cliRoot, '..', '..')

      await ensureCliBuilt(cliRoot)

      const stateDir = await fs.mkdtemp(path.join(os.tmpdir(), 'intent-flow-logix-devserver-perm-'))
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

        const stat = await fs.stat(stateFile)
        expect(stat.isFile()).toBe(true)
        expect(stat.mode & 0o777).toBe(0o600)
      } finally {
        child.kill('SIGTERM')
        await waitExit(child)
      }
    },
    120_000,
  )
})

