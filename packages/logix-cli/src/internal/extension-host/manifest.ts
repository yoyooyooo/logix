import { makeCliError } from '../errors.js'

import { EXTENSION_HOOK_NAMES, negotiateExtensionApiVersion, type ExtensionHookName } from './runtime.js'

export const EXTENSION_MANIFEST_VERSION = 'ext.v1' as const

export type ExtensionManifestRuntime = {
  readonly apiVersion: string
  readonly entry: string
  readonly hooks?: ReadonlyArray<ExtensionHookName>
}

export type ExtensionCapabilities = {
  readonly hostApis: ReadonlyArray<string>
  readonly net?: boolean
  readonly fs?: boolean
}

export type ExtensionLimits = {
  readonly timeoutMs: number
  readonly maxCpuMs?: number
  readonly maxMemoryMb?: number
  readonly maxQueueSize?: number
}

export type ExtensionManifestV1 = {
  readonly manifestVersion: typeof EXTENSION_MANIFEST_VERSION
  readonly extensionId: string
  readonly revision: string
  readonly runtime: ExtensionManifestRuntime
  readonly capabilities: ExtensionCapabilities
  readonly limits: ExtensionLimits
  readonly ext?: Readonly<Record<string, unknown>>
}

const EXTENSION_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const HOOK_NAME_SET = new Set<string>(EXTENSION_HOOK_NAMES)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const failManifestValidation = (message: string): never => {
  throw makeCliError({
    code: 'EXT_MANIFEST_INVALID',
    message: `[Logix][CLI] extension.manifest 无效：${message}`,
  })
}

const assertNoUnknownFields = (
  value: Record<string, unknown>,
  allowedFields: ReadonlyArray<string>,
  scope: string,
): void => {
  const allowed = new Set(allowedFields)
  for (const field of Object.keys(value)) {
    if (!allowed.has(field)) {
      failManifestValidation(`${scope} 出现未知字段：${field}`)
    }
  }
}

const ensureNonEmptyString = (value: unknown, scope: string): string => {
  if (typeof value !== 'string' || value.length === 0) {
    failManifestValidation(`${scope} 必须是非空字符串`)
  }
  return value as string
}

const ensurePositiveInteger = (value: unknown, scope: string, min: number): number => {
  if (!Number.isInteger(value) || (value as number) < min) {
    failManifestValidation(`${scope} 必须是 >= ${min} 的整数`)
  }
  return value as number
}

const parseHooks = (value: unknown): ReadonlyArray<ExtensionHookName> | undefined => {
  if (typeof value === 'undefined') return undefined
  if (!Array.isArray(value)) {
    failManifestValidation('runtime.hooks 必须是字符串数组')
  }
  const hooks = value as ReadonlyArray<unknown>

  const parsed: ExtensionHookName[] = []
  const seen = new Set<string>()
  for (let i = 0; i < hooks.length; i++) {
    const hook = hooks[i]
    if (typeof hook !== 'string' || !HOOK_NAME_SET.has(hook)) {
      failManifestValidation(`runtime.hooks[${i}] 非法：${String(hook)}`)
    }
    const hookName = hook as ExtensionHookName
    if (seen.has(hookName)) {
      failManifestValidation(`runtime.hooks 存在重复项：${hookName}`)
    }
    seen.add(hookName)
    parsed.push(hookName)
  }
  return parsed
}

const parseRuntime = (value: unknown): ExtensionManifestRuntime => {
  if (!isRecord(value)) {
    failManifestValidation('runtime 必须是对象')
  }
  const runtime = value as Record<string, unknown>
  assertNoUnknownFields(runtime, ['apiVersion', 'entry', 'hooks'], 'runtime')

  const apiVersion = ensureNonEmptyString(runtime.apiVersion, 'runtime.apiVersion')
  const entry = ensureNonEmptyString(runtime.entry, 'runtime.entry')
  const hooks = parseHooks(runtime.hooks)

  return {
    apiVersion,
    entry,
    ...(hooks ? { hooks } : null),
  }
}

const parseCapabilities = (value: unknown): ExtensionCapabilities => {
  if (!isRecord(value)) {
    failManifestValidation('capabilities 必须是对象')
  }
  const capabilities = value as Record<string, unknown>
  assertNoUnknownFields(capabilities, ['hostApis', 'net', 'fs'], 'capabilities')

  if (!Array.isArray(capabilities.hostApis)) {
    failManifestValidation('capabilities.hostApis 必须是字符串数组')
  }
  const hostApiList = capabilities.hostApis as ReadonlyArray<unknown>

  const hostApis: string[] = []
  const seen = new Set<string>()
  for (let i = 0; i < hostApiList.length; i++) {
    const api = hostApiList[i]
    if (typeof api !== 'string' || api.length === 0) {
      failManifestValidation(`capabilities.hostApis[${i}] 必须是非空字符串`)
    }
    const hostApi = api as string
    if (seen.has(hostApi)) {
      failManifestValidation(`capabilities.hostApis 存在重复项：${hostApi}`)
    }
    seen.add(hostApi)
    hostApis.push(hostApi)
  }

  const net = capabilities.net
  if (typeof net !== 'undefined' && typeof net !== 'boolean') {
    failManifestValidation('capabilities.net 必须是布尔值')
  }

  const fs = capabilities.fs
  if (typeof fs !== 'undefined' && typeof fs !== 'boolean') {
    failManifestValidation('capabilities.fs 必须是布尔值')
  }

  return {
    hostApis,
    ...(typeof net === 'boolean' ? { net } : null),
    ...(typeof fs === 'boolean' ? { fs } : null),
  }
}

const parseLimits = (value: unknown): ExtensionLimits => {
  if (!isRecord(value)) {
    failManifestValidation('limits 必须是对象')
  }
  const limits = value as Record<string, unknown>
  assertNoUnknownFields(limits, ['timeoutMs', 'maxCpuMs', 'maxMemoryMb', 'maxQueueSize'], 'limits')

  const timeoutMs = ensurePositiveInteger(limits.timeoutMs, 'limits.timeoutMs', 1)
  const maxCpuMs =
    typeof limits.maxCpuMs === 'undefined'
      ? undefined
      : ensurePositiveInteger(limits.maxCpuMs, 'limits.maxCpuMs', 1)
  const maxMemoryMb =
    typeof limits.maxMemoryMb === 'undefined'
      ? undefined
      : ensurePositiveInteger(limits.maxMemoryMb, 'limits.maxMemoryMb', 16)
  const maxQueueSize =
    typeof limits.maxQueueSize === 'undefined'
      ? undefined
      : ensurePositiveInteger(limits.maxQueueSize, 'limits.maxQueueSize', 1)

  return {
    timeoutMs,
    ...(typeof maxCpuMs === 'number' ? { maxCpuMs } : null),
    ...(typeof maxMemoryMb === 'number' ? { maxMemoryMb } : null),
    ...(typeof maxQueueSize === 'number' ? { maxQueueSize } : null),
  }
}

export const parseExtensionManifest = (value: unknown): ExtensionManifestV1 => {
  if (!isRecord(value)) {
    failManifestValidation('根对象必须是 object')
  }
  const manifest = value as Record<string, unknown>
  assertNoUnknownFields(
    manifest,
    ['manifestVersion', 'extensionId', 'revision', 'runtime', 'capabilities', 'limits', 'ext'],
    'manifest',
  )

  if (manifest.manifestVersion !== EXTENSION_MANIFEST_VERSION) {
    failManifestValidation(`manifestVersion 必须是 ${EXTENSION_MANIFEST_VERSION}`)
  }

  const extensionId = ensureNonEmptyString(manifest.extensionId, 'extensionId')
  if (!EXTENSION_ID_PATTERN.test(extensionId)) {
    failManifestValidation('extensionId 必须匹配 ^[a-z0-9]+(?:-[a-z0-9]+)*$')
  }

  const revision = ensureNonEmptyString(manifest.revision, 'revision')
  const runtime = parseRuntime(manifest.runtime)
  const capabilities = parseCapabilities(manifest.capabilities)
  const limits = parseLimits(manifest.limits)

  negotiateExtensionApiVersion(runtime.apiVersion)

  const ext = manifest.ext
  if (typeof ext !== 'undefined' && !isRecord(ext)) {
    failManifestValidation('ext 必须是对象')
  }
  const extObject = typeof ext === 'undefined' ? undefined : (ext as Readonly<Record<string, unknown>>)

  return {
    manifestVersion: EXTENSION_MANIFEST_VERSION,
    extensionId,
    revision,
    runtime,
    capabilities,
    limits,
    ...(typeof extObject === 'undefined' ? null : { ext: extObject }),
  }
}

export const validateExtensionManifest = parseExtensionManifest
