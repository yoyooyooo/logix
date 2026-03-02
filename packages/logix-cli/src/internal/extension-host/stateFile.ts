import fs from 'node:fs/promises'
import path from 'node:path'

import { makeCliError } from '../errors.js'
import { sha256DigestOfJson, stableStringifyJson } from '../stableJson.js'

import { parseExtensionManifest, type ExtensionManifestV1 } from './manifest.js'

export const EXTENSION_CONTROL_STATE_VERSION = 1 as const

export type ExtensionControlStateV1 = {
  readonly schemaVersion: typeof EXTENSION_CONTROL_STATE_VERSION
  readonly kind: 'ExtensionControlState'
  readonly manifestFile: string
  readonly manifestDigest: string
  readonly manifest: ExtensionManifestV1
  readonly loadedAt: string
  readonly updatedAt: string
  readonly reloadSeq: number
}

export type LoadedExtensionManifest = {
  readonly manifestFile: string
  readonly manifestDigest: string
  readonly manifest: ExtensionManifestV1
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const assertNoUnknownFields = (
  value: Record<string, unknown>,
  allowedFields: ReadonlyArray<string>,
  scope: string,
): void => {
  const allowed = new Set(allowedFields)
  for (const field of Object.keys(value)) {
    if (!allowed.has(field)) {
      throw makeCliError({
        code: 'CLI_INVALID_INPUT',
        message: `[Logix][CLI] ${scope} 出现未知字段：${field}`,
      })
    }
  }
}

const ensureNonEmptyString = (value: unknown, scope: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw makeCliError({
      code: 'CLI_INVALID_INPUT',
      message: `[Logix][CLI] ${scope} 必须是非空字符串`,
    })
  }
  return value
}

const ensureNonNegativeInteger = (value: unknown, scope: string): number => {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw makeCliError({
      code: 'CLI_INVALID_INPUT',
      message: `[Logix][CLI] ${scope} 必须是 >= 0 的整数`,
    })
  }
  return value as number
}

const ensureIsoTimestamp = (value: unknown, scope: string): string => {
  const text = ensureNonEmptyString(value, scope)
  const time = Date.parse(text)
  if (!Number.isFinite(time)) {
    throw makeCliError({
      code: 'CLI_INVALID_INPUT',
      message: `[Logix][CLI] ${scope} 必须是合法 ISO 时间字符串`,
    })
  }
  return text
}

const resolveFromCwd = (targetPath: string): string => path.resolve(process.cwd(), targetPath)

const readJsonFileFromDisk = async (fileAbs: string): Promise<unknown> => {
  try {
    const raw = await fs.readFile(fileAbs, 'utf8')
    try {
      return JSON.parse(raw)
    } catch (cause) {
      throw makeCliError({
        code: 'CLI_INVALID_INPUT',
        message: `[Logix][CLI] 无法解析 JSON：${fileAbs}`,
        cause,
      })
    }
  } catch (cause) {
    const errno = cause as NodeJS.ErrnoException
    if (errno && errno.code === 'ENOENT') {
      throw makeCliError({
        code: 'CLI_INVALID_ARGUMENT',
        message: `[Logix][CLI] 文件不存在：${fileAbs}`,
      })
    }
    throw makeCliError({
      code: 'CLI_IO_ERROR',
      message: `[Logix][CLI] 读取失败：${fileAbs}`,
      cause,
    })
  }
}

const parseExtensionControlState = (value: unknown): ExtensionControlStateV1 => {
  if (!isRecord(value)) {
    throw makeCliError({
      code: 'CLI_INVALID_INPUT',
      message: '[Logix][CLI] extension stateFile 根对象必须是 object',
    })
  }
  assertNoUnknownFields(
    value,
    ['schemaVersion', 'kind', 'manifestFile', 'manifestDigest', 'manifest', 'loadedAt', 'updatedAt', 'reloadSeq'],
    'extension stateFile',
  )

  if (value.schemaVersion !== EXTENSION_CONTROL_STATE_VERSION) {
    throw makeCliError({
      code: 'CLI_INVALID_INPUT',
      message: `[Logix][CLI] extension stateFile schemaVersion 必须是 ${EXTENSION_CONTROL_STATE_VERSION}`,
    })
  }

  if (value.kind !== 'ExtensionControlState') {
    throw makeCliError({
      code: 'CLI_INVALID_INPUT',
      message: '[Logix][CLI] extension stateFile kind 必须是 ExtensionControlState',
    })
  }

  return {
    schemaVersion: EXTENSION_CONTROL_STATE_VERSION,
    kind: 'ExtensionControlState',
    manifestFile: ensureNonEmptyString(value.manifestFile, 'manifestFile'),
    manifestDigest: ensureNonEmptyString(value.manifestDigest, 'manifestDigest'),
    manifest: parseExtensionManifest(value.manifest),
    loadedAt: ensureIsoTimestamp(value.loadedAt, 'loadedAt'),
    updatedAt: ensureIsoTimestamp(value.updatedAt, 'updatedAt'),
    reloadSeq: ensureNonNegativeInteger(value.reloadSeq, 'reloadSeq'),
  }
}

export const loadExtensionManifestFromFile = async (manifestPath: string): Promise<LoadedExtensionManifest> => {
  const manifestFile = resolveFromCwd(manifestPath)
  const value = await readJsonFileFromDisk(manifestFile)
  const manifest = parseExtensionManifest(value)
  return {
    manifestFile,
    manifestDigest: sha256DigestOfJson(manifest),
    manifest,
  }
}

export const readExtensionControlStateFile = async (stateFilePath: string): Promise<ExtensionControlStateV1> => {
  const stateFileAbs = resolveFromCwd(stateFilePath)
  const value = await readJsonFileFromDisk(stateFileAbs)
  return parseExtensionControlState(value)
}

export const buildExtensionControlState = (args: {
  readonly manifestFile: string
  readonly manifest: ExtensionManifestV1
  readonly previous?: ExtensionControlStateV1
  readonly now?: Date
}): ExtensionControlStateV1 => {
  const nowIso = (args.now ?? new Date()).toISOString()
  return {
    schemaVersion: EXTENSION_CONTROL_STATE_VERSION,
    kind: 'ExtensionControlState',
    manifestFile: args.manifestFile,
    manifestDigest: sha256DigestOfJson(args.manifest),
    manifest: args.manifest,
    loadedAt: args.previous?.loadedAt ?? nowIso,
    updatedAt: nowIso,
    reloadSeq: args.previous ? args.previous.reloadSeq + 1 : 0,
  }
}

export const writeExtensionControlStateFile = async (stateFilePath: string, state: ExtensionControlStateV1): Promise<string> => {
  const stateFileAbs = resolveFromCwd(stateFilePath)
  const dir = path.dirname(stateFileAbs)
  const tempFile = `${stateFileAbs}.tmp-${process.pid}-${Date.now()}`
  const payload = `${stableStringifyJson(state, 2)}\n`

  try {
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(tempFile, payload, 'utf8')
    await fs.rename(tempFile, stateFileAbs)
    return stateFileAbs
  } catch (cause) {
    try {
      await fs.rm(tempFile, { force: true })
    } catch {
      // ignore cleanup errors
    }
    throw makeCliError({
      code: 'CLI_IO_ERROR',
      message: `[Logix][CLI] 写入 extension stateFile 失败：${stateFileAbs}`,
      cause,
    })
  }
}
