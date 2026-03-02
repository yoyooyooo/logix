import { makeCliError } from '../errors.js'

import type { ExtensionManifestV1 } from './manifest.js'

export const EXTENSION_RUNTIME_API_MAJOR = 1 as const
export const EXTENSION_RUNTIME_API_VERSION = `v${EXTENSION_RUNTIME_API_MAJOR}` as const

export const EXTENSION_HOOK_NAMES = ['setup', 'onEvent', 'snapshot', 'restore', 'healthcheck', 'teardown'] as const
export type ExtensionHookName = (typeof EXTENSION_HOOK_NAMES)[number]

export const EXTENSION_RUNTIME_LIFECYCLE = [
  'resolve-manifest',
  'validate-schema',
  'api-version-negotiate',
  'load-entry',
  ...EXTENSION_HOOK_NAMES,
] as const
export type ExtensionRuntimeLifecycleStep = (typeof EXTENSION_RUNTIME_LIFECYCLE)[number]

export type ExtensionHookContext = {
  readonly runId: string
  readonly instanceId: string
  readonly command: string
  readonly hook: ExtensionHookName
  readonly payload?: unknown
  readonly ext?: Readonly<Record<string, unknown>>
}

export type ExtensionLifecyclePhase = 'before' | 'after'

export type ExtensionLifecycleHook = (event: {
  readonly phase: ExtensionLifecyclePhase
  readonly hook: ExtensionHookName
  readonly context: ExtensionHookContext
  readonly manifest: ExtensionManifestV1
}) => void | Promise<void>

export type ExtensionRuntimeHook = (context: ExtensionHookContext) => unknown | Promise<unknown>

export type ExtensionHostRuntime = {
  readonly manifest: ExtensionManifestV1
  readonly hooks: Partial<Record<ExtensionHookName, ExtensionRuntimeHook>>
  readonly beforeHooks?: ReadonlyArray<ExtensionLifecycleHook>
  readonly afterHooks?: ReadonlyArray<ExtensionLifecycleHook>
}

export type ExtensionApiNegotiationResult = {
  readonly requestedApiVersion: string
  readonly hostApiVersion: string
  readonly compatible: true
}

const API_VERSION_PATTERN = /^v?(\d+)(?:\.\d+){0,2}$/

const parseApiMajor = (apiVersion: string): number | undefined => {
  const trimmed = apiVersion.trim()
  if (trimmed.length === 0) return undefined
  const match = trimmed.match(API_VERSION_PATTERN)
  if (!match || typeof match[1] !== 'string') return undefined
  return Number.parseInt(match[1], 10)
}

export const negotiateExtensionApiVersion = (
  requestedApiVersion: string,
  hostApiMajor: number = EXTENSION_RUNTIME_API_MAJOR,
): ExtensionApiNegotiationResult => {
  const requestedMajor = parseApiMajor(requestedApiVersion)
  if (requestedMajor !== hostApiMajor) {
    throw makeCliError({
      code: 'EXT_API_INCOMPATIBLE',
      message: `[Logix][CLI] 扩展 apiVersion 不兼容（requested=${requestedApiVersion}, host=${EXTENSION_RUNTIME_API_VERSION}）`,
    })
  }

  return {
    requestedApiVersion,
    hostApiVersion: EXTENSION_RUNTIME_API_VERSION,
    compatible: true,
  }
}
