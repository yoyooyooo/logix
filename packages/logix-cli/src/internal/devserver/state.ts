import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { stableStringifyJson } from '../stableJson.js'
import { DEVSERVER_PROTOCOL_V1, type DevServerStateV1 } from './protocol.js'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const pathExists = async (p: string): Promise<boolean> => {
  try {
    await fs.stat(p)
    return true
  } catch {
    return false
  }
}

const findRepoRoot = async (cwd: string): Promise<string> => {
  let dir = cwd
  for (;;) {
    if (await pathExists(path.join(dir, '.git'))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) return cwd
    dir = parent
  }
}

export const resolveDevServerStateFile = async (args: { readonly cwd: string; readonly stateFile?: string }): Promise<string> => {
  const flag = args.stateFile?.trim()
  if (flag) return flag

  const env = process.env.LOGIX_DEVSERVER_STATE_FILE?.trim()
  if (env) return env

  const repoRoot = await findRepoRoot(args.cwd)
  const key = createHash('sha256').update(repoRoot).digest('hex').slice(0, 16)
  return path.join(os.tmpdir(), 'intent-flow', 'logix-devserver', `${key}.json`)
}

export const writeDevServerStateFile = async (stateFile: string, state: DevServerStateV1): Promise<void> => {
  const dir = path.dirname(stateFile)
  await fs.mkdir(dir, { recursive: true, mode: 0o700 })
  await fs.writeFile(stateFile, stableStringifyJson(state), { encoding: 'utf8', mode: 0o600 })

  // Best-effort hardening (especially when the file already existed).
  if (process.platform !== 'win32') {
    try {
      await fs.chmod(dir, 0o700)
    } catch {
      // ignore
    }
    try {
      await fs.chmod(stateFile, 0o600)
    } catch {
      // ignore
    }
  }
}

export const deleteDevServerStateFile = async (stateFile: string): Promise<void> => {
  try {
    await fs.unlink(stateFile)
  } catch {
    // ignore
  }
}

export const readDevServerStateFile = async (stateFile: string): Promise<DevServerStateV1 | undefined> => {
  try {
    const raw = JSON.parse(await fs.readFile(stateFile, 'utf8')) as unknown
    if (!isRecord(raw)) return undefined
    if (raw.schemaVersion !== 1) return undefined
    if (raw.kind !== 'DevServerState') return undefined
    if (raw.protocol !== DEVSERVER_PROTOCOL_V1) return undefined
    if (typeof raw.url !== 'string') return undefined
    if (typeof raw.pid !== 'number') return undefined
    if (typeof raw.cwd !== 'string') return undefined
    if (typeof raw.host !== 'string') return undefined
    if (typeof raw.port !== 'number') return undefined
    const token = typeof raw.token === 'string' && raw.token.trim().length > 0 ? raw.token.trim() : undefined

    return {
      schemaVersion: 1,
      kind: 'DevServerState',
      protocol: DEVSERVER_PROTOCOL_V1,
      url: raw.url,
      pid: raw.pid,
      cwd: raw.cwd,
      host: raw.host,
      port: raw.port,
      ...(token ? { token } : null),
    }
  } catch {
    return undefined
  }
}
