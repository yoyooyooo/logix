import { Cause } from 'effect'
import type * as BuildEnv from '../platform/BuildEnv.js'
import type { KernelImplementationRef } from '../runtime/core/KernelRef.js'
import type * as RuntimeKernel from '../runtime/core/RuntimeKernel.js'

export interface EnvironmentIr {
  readonly tagIds: ReadonlyArray<string>
  readonly configKeys: ReadonlyArray<string>
  readonly missingServices: ReadonlyArray<string>
  readonly missingConfigKeys: ReadonlyArray<string>
  readonly missingProgramImports?: ReadonlyArray<{
    readonly tokenId: string
    readonly from?: string
    readonly entrypoint?: string
  }>
  readonly kernelImplementationRef?: KernelImplementationRef
  readonly runtimeServicesEvidence?: RuntimeKernel.RuntimeServicesEvidence
  readonly notes?: unknown
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const parseMissingConfigKeys = (message: string): ReadonlyArray<string> => {
  const out: string[] = []

  const patterns: ReadonlyArray<RegExp> = [
    /\bMissing (?:data|value) for (?:key|path) "?([A-Z0-9_./:-]+)"?/g,
    /\bMissing (?:data|value) at ([A-Z0-9_./:-]+)\b/g,
    /\bMissing configuration:? "?([A-Z0-9_./:-]+)"?/g,
    /\bConfig\b.*\bmissing\b.*"?([A-Z0-9_./:-]+)"?/gi,
    /\bat\s*\["([A-Z0-9_./:-]+)"\]/g,
  ]

  for (const re of patterns) {
    let match: RegExpExecArray | null
    while ((match = re.exec(message))) {
      const key = match[1]
      if (typeof key === 'string' && key.length > 0) out.push(key)
    }
  }

  return Array.from(new Set(out)).sort()
}

const parseMissingServiceIds = (message: string): ReadonlyArray<string> => {
  const out: string[] = []
  const re = /Service not found: ([^\s(]+)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(message))) {
    const id = match[1]?.replace(/[,:.;]+$/, '')
    if (typeof id === 'string' && id.length > 0) out.push(id)
  }
  return Array.from(new Set(out)).sort()
}

export const parseMissingDependencyFromCause = (
  cause: Cause.Cause<unknown>,
): {
  readonly missingServices: ReadonlyArray<string>
  readonly missingConfigKeys: ReadonlyArray<string>
  readonly missingProgramImports: ReadonlyArray<{
    readonly tokenId: string
    readonly from?: string
    readonly entrypoint?: string
  }>
} => {
  const missingServices: string[] = []
  const missingConfigKeys: string[] = []
  const missingProgramImports: Array<{
    readonly tokenId: string
    readonly from?: string
    readonly entrypoint?: string
  }> = []

  const candidates = cause.reasons
    .filter((reason) => Cause.isFailReason(reason) || Cause.isDieReason(reason))
    .map((reason) => (Cause.isFailReason(reason) ? reason.error : reason.defect))

  for (const candidate of candidates) {
    if (isRecord(candidate) && (candidate as any)._tag === 'ConstructionGuardError') {
      const missingService = (candidate as any).missingService
      if (typeof missingService === 'string' && missingService.length > 0) {
        missingServices.push(missingService)
      }
    }

    if (isRecord(candidate) && (candidate as any).name === 'MissingModuleRuntimeError') {
      const tokenId = (candidate as any).tokenId
      if (typeof tokenId === 'string' && tokenId.length > 0) {
        const from = (candidate as any).from
        const entrypoint = (candidate as any).entrypoint
        missingProgramImports.push({
          tokenId,
          ...(typeof from === 'string' && from.length > 0 ? { from } : null),
          ...(typeof entrypoint === 'string' && entrypoint.length > 0 ? { entrypoint } : null),
        })
      }
    }

    if (
      isRecord(candidate) &&
      (candidate as any)._tag === 'ConfigError' &&
      (candidate as any)._op === 'MissingData' &&
      Array.isArray((candidate as any).path) &&
      (candidate as any).path.every((k: unknown) => typeof k === 'string' && k.length > 0)
    ) {
      const key = (candidate as any).path.join('.')
      if (key.length > 0) missingConfigKeys.push(key)
    }
  }

  const messages: string[] = []
  for (const candidate of candidates) {
    if (candidate instanceof Error) {
      messages.push(candidate.message)
      continue
    }
    if (typeof candidate === 'string') {
      messages.push(candidate)
      continue
    }
    if (isRecord(candidate) && typeof (candidate as any).message === 'string') {
      messages.push(String((candidate as any).message))
    }
  }

  try {
    messages.push(Cause.pretty(cause))
  } catch {
    // ignore
  }

  const merged = messages.filter((s) => s.length > 0).join('\n')

  if (merged) {
    missingServices.push(...parseMissingServiceIds(merged))
    missingConfigKeys.push(...parseMissingConfigKeys(merged))
  }

  return {
    missingServices: Array.from(new Set(missingServices)).sort(),
    missingConfigKeys: Array.from(new Set(missingConfigKeys)).sort(),
    missingProgramImports: Array.from(
      new Map(missingProgramImports.map((item) => [`${item.from ?? ''}:${item.tokenId}:${item.entrypoint ?? ''}`, item])).values(),
    ).sort((a, b) => `${a.from ?? ''}:${a.tokenId}`.localeCompare(`${b.from ?? ''}:${b.tokenId}`)),
  }
}

export const buildEnvironmentIr = (params: {
  readonly kernelImplementationRef?: KernelImplementationRef
  readonly runtimeServicesEvidence?: RuntimeKernel.RuntimeServicesEvidence
  readonly buildEnvConfig?: Record<string, BuildEnv.BuildEnvConfigValue | undefined>
  readonly missingServices?: ReadonlyArray<string>
  readonly missingConfigKeys?: ReadonlyArray<string>
  readonly missingProgramImports?: ReadonlyArray<{
    readonly tokenId: string
    readonly from?: string
    readonly entrypoint?: string
  }>
}): EnvironmentIr => {
  const providedConfigKeys = Object.keys(params.buildEnvConfig ?? {})
    .filter((k) => k.length > 0 && (params.buildEnvConfig as any)[k] !== undefined)
    .sort()

  const missingServices = Array.from(new Set(params.missingServices ?? [])).sort()
  const missingConfigKeys = Array.from(new Set(params.missingConfigKeys ?? [])).sort()
  const missingProgramImports = Array.from(
    new Map(
      (params.missingProgramImports ?? [])
        .filter((item) => item.tokenId.length > 0)
        .map((item) => [`${item.from ?? ''}:${item.tokenId}:${item.entrypoint ?? ''}`, item]),
    ).values(),
  ).sort((a, b) => `${a.from ?? ''}:${a.tokenId}`.localeCompare(`${b.from ?? ''}:${b.tokenId}`))

  const runtimeServiceIds =
    params.runtimeServicesEvidence?.bindings?.map((b) => b.serviceId).filter((s) => typeof s === 'string') ?? []

  const tagIds = Array.from(new Set([...runtimeServiceIds, ...missingServices, ...missingProgramImports.map((item) => item.tokenId)])).sort()
  const configKeys = Array.from(new Set([...providedConfigKeys, ...missingConfigKeys])).sort()

  return {
    tagIds,
    configKeys,
    missingServices,
    missingConfigKeys,
    ...(missingProgramImports.length > 0 ? { missingProgramImports } : null),
    kernelImplementationRef: params.kernelImplementationRef,
    runtimeServicesEvidence: params.runtimeServicesEvidence,
  }
}
