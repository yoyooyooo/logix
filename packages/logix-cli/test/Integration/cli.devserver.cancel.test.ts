import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'

import { describe, expect, it } from 'vitest'
import WebSocket from 'ws'

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

const openWs = async (url: string): Promise<WebSocket> =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    ws.once('open', () => resolve(ws))
    ws.once('error', (e) => reject(e))
  })

describe('logix-devserver (protocol) cancel', () => {
  it(
    'should cancel an in-flight dev.runChecks request via dev.cancel',
    async () => {
      const cliRoot = path.resolve(__dirname, '..', '..')
      const workspaceRoot = path.resolve(cliRoot, '..', '..')

      await ensureCliBuilt(cliRoot)

      const stateDir = await fs.mkdtemp(path.join(os.tmpdir(), 'intent-flow-logix-devserver-cancel-'))
      const stateFile = path.join(stateDir, 'devserver.state.json')

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
        ],
        { cwd: workspaceRoot, stdio: ['ignore', 'pipe', 'pipe'] },
      )

      try {
        const startedLine = await readFirstLine(child.stdout!)
        const started = JSON.parse(startedLine) as any
        expect(started?.kind).toBe('DevServerStarted')
        expect(typeof started?.url).toBe('string')

        const wsRun = await openWs(started.url)
        const wsCancel = await openWs(started.url)

        const runRequestId = 'cancel-me-1'
        const cancelRequestId = 'cancel-req-1'

        const gotStartedEvent = new Promise<void>((resolve, reject) => {
          const t = setTimeout(() => reject(new Error('timeout waiting check.started')), 10_000)
          wsRun.on('message', (data) => {
            const text = typeof data === 'string' ? data : Buffer.from(data as any).toString('utf8')
            const msg = JSON.parse(text) as any
            if (msg?.type === 'event' && msg?.requestId === runRequestId && msg?.event?.kind === 'dev.event.check.started') {
              clearTimeout(t)
              resolve()
            }
          })
        })

        const gotRunResponse = new Promise<any>((resolve, reject) => {
          const t = setTimeout(() => reject(new Error('timeout waiting runChecks response')), 30_000)
          wsRun.on('message', (data) => {
            const text = typeof data === 'string' ? data : Buffer.from(data as any).toString('utf8')
            const msg = JSON.parse(text) as any
            if (msg?.type === 'response' && msg?.requestId === runRequestId) {
              clearTimeout(t)
              resolve(msg)
            }
          })
        })

        const gotCancelResponse = new Promise<any>((resolve, reject) => {
          const t = setTimeout(() => reject(new Error('timeout waiting cancel response')), 10_000)
          wsCancel.on('message', (data) => {
            const text = typeof data === 'string' ? data : Buffer.from(data as any).toString('utf8')
            const msg = JSON.parse(text) as any
            if (msg?.type === 'response' && msg?.requestId === cancelRequestId) {
              clearTimeout(t)
              resolve(msg)
            }
          })
        })

        wsRun.send(
          JSON.stringify({
            protocol: 'intent-flow.devserver.v1',
            type: 'request',
            requestId: runRequestId,
            method: 'dev.runChecks',
            params: { checks: ['test'], timeoutMs: 120_000 },
          }),
        )

        await gotStartedEvent

        wsCancel.send(
          JSON.stringify({
            protocol: 'intent-flow.devserver.v1',
            type: 'request',
            requestId: cancelRequestId,
            method: 'dev.cancel',
            params: { targetRequestId: runRequestId },
          }),
        )

        const cancelResp = await gotCancelResponse
        expect(cancelResp?.ok).toBe(true)

        const runResp = await gotRunResponse
        expect(runResp?.ok).toBe(false)
        expect(runResp?.error?.code).toBe('ERR_CANCELLED')

        wsRun.close()
        wsCancel.close()
      } finally {
        child.kill('SIGTERM')
        await waitExit(child)
      }
    },
    120_000,
  )
})
