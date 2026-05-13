import os from 'node:os'
import path from 'node:path'

export interface LiveTransportPaths {
  readonly stateDir: string
  readonly metadataPath: string
  readonly socketPath: string
  readonly host: string
  readonly port: number
}

export const resolveLiveTransportPaths = (overrides: Partial<LiveTransportPaths> = {}): LiveTransportPaths => {
  const stateDir = overrides.stateDir ?? process.env.LOGIX_LIVE_STATE_DIR ?? path.join(os.homedir(), '.logix', 'live')
  const rawPort = overrides.port ?? Number(process.env.LOGIX_LIVE_PORT ?? '8098')
  const port = Number.isFinite(rawPort) ? rawPort : 8098
  return {
    stateDir,
    metadataPath: overrides.metadataPath ?? path.join(stateDir, 'daemon.json'),
    socketPath: overrides.socketPath ?? path.join(stateDir, 'daemon.sock'),
    host: overrides.host ?? process.env.LOGIX_LIVE_HOST ?? '127.0.0.1',
    port,
  }
}
