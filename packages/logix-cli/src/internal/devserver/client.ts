import WebSocket from 'ws'

import { DEVSERVER_PROTOCOL_V1, type DevServerEvent, type DevServerRequest, type DevServerResponse } from './protocol.js'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asDevServerEvent = (value: unknown): DevServerEvent | undefined => {
  if (!isRecord(value)) return undefined
  if (value.protocol !== DEVSERVER_PROTOCOL_V1) return undefined
  if (value.type !== 'event') return undefined
  if (typeof value.requestId !== 'string' || value.requestId.trim().length === 0) return undefined
  if (!isRecord(value.event) || typeof value.event.kind !== 'string') return undefined
  return value as DevServerEvent
}

const asDevServerResponse = (value: unknown): DevServerResponse | undefined => {
  if (!isRecord(value)) return undefined
  if (value.protocol !== DEVSERVER_PROTOCOL_V1) return undefined
  if (value.type !== 'response') return undefined
  if (typeof value.requestId !== 'string' || value.requestId.trim().length === 0) return undefined
  if (typeof value.ok !== 'boolean') return undefined
  return value as DevServerResponse
}

export const callDevServer = async (args: {
  readonly url: string
  readonly requestId: string
  readonly method: DevServerRequest['method']
  readonly params: unknown
  readonly token?: string
  readonly timeoutMs: number
  readonly includeEvents: boolean
}): Promise<{ readonly response: DevServerResponse; readonly events: ReadonlyArray<DevServerEvent> }> => {
  const ws = new WebSocket(args.url)
  const events: DevServerEvent[] = []

  const response = await new Promise<DevServerResponse>((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.close()
      reject(new Error('timeout'))
    }, args.timeoutMs)

    const cleanup = () => {
      clearTimeout(timer)
      ws.removeAllListeners()
    }

    ws.once('open', () => {
      const req: DevServerRequest = {
        protocol: DEVSERVER_PROTOCOL_V1,
        type: 'request',
        requestId: args.requestId,
        method: args.method,
        params: args.params,
        ...(args.token ? { auth: { token: args.token } } : null),
      }
      ws.send(JSON.stringify(req))
    })

    ws.on('message', (data) => {
      try {
        const text = typeof data === 'string' ? data : Buffer.from(data as any).toString('utf8')
        const parsed = JSON.parse(text) as unknown

        const event = asDevServerEvent(parsed)
        if (event) {
          if (args.includeEvents && event.requestId === args.requestId) events.push(event)
          return
        }

        const resp = asDevServerResponse(parsed)
        if (resp && resp.requestId === args.requestId) {
          cleanup()
          resolve(resp)
          ws.close()
          return
        }
      } catch (e) {
        cleanup()
        reject(e)
        ws.close()
      }
    })

    ws.once('error', (err) => {
      cleanup()
      reject(err)
    })
  })

  return { response, events }
}

