import { makeCliError } from '../errors.js'

import type { ExtensionCapabilities, ExtensionManifestV1 } from './manifest.js'

export type ExtensionCapabilityPolicy = {
  readonly hostApis: ReadonlyArray<string>
  readonly net?: boolean
  readonly fs?: boolean
}

const HOST_INTERNAL_IMPORT_PATTERNS: ReadonlyArray<RegExp> = [
  /^@logixjs\/cli\/internal(?:\/|$)/,
  /^@logixjs\/cli\/src\/internal(?:\/|$)/,
  /\/packages\/logix-cli\/src\/internal\//,
  /^node:internal\//,
]

const failCapabilityCheck = (message: string): never => {
  throw makeCliError({
    code: 'EXT_MANIFEST_INVALID',
    message: `[Logix][CLI] 扩展能力越权：${message}`,
  })
}

export const isForbiddenInternalImport = (specifier: string): boolean =>
  HOST_INTERNAL_IMPORT_PATTERNS.some((pattern) => pattern.test(specifier))

export const assertNoInternalImport = (specifier: string): void => {
  if (isForbiddenInternalImport(specifier)) {
    throw makeCliError({
      code: 'EXT_MANIFEST_INVALID',
      message: `[Logix][CLI] 扩展入口禁止引用 internal 模块：${specifier}`,
    })
  }
}

export const assertNoInternalImports = (specifiers: ReadonlyArray<string>): void => {
  for (const specifier of specifiers) {
    assertNoInternalImport(specifier)
  }
}

export const assertCapabilitiesAllowlisted = (
  capabilities: ExtensionCapabilities,
  policy: ExtensionCapabilityPolicy,
): void => {
  const hostApiAllowlist = new Set(policy.hostApis)
  for (const hostApi of capabilities.hostApis) {
    if (!hostApiAllowlist.has(hostApi)) {
      failCapabilityCheck(`hostApis 未在 allowlist 中：${hostApi}`)
    }
  }

  if (capabilities.net === true && policy.net !== true) {
    failCapabilityCheck('net 未授权')
  }

  if (capabilities.fs === true && policy.fs !== true) {
    failCapabilityCheck('fs 未授权')
  }
}

export const assertExtensionManifestSecurity = (
  manifest: ExtensionManifestV1,
  policy: ExtensionCapabilityPolicy,
): void => {
  assertNoInternalImport(manifest.runtime.entry)
  assertCapabilitiesAllowlisted(manifest.capabilities, policy)
}
