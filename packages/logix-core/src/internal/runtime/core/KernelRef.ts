import { Context, Effect, Option } from 'effect'
import { isDevEnv } from './env.js'

/**
 * Stable identifier for a kernel variant (requested kernel family).
 *
 * - Recommended: `[a-z0-9-]+` (lower-kebab).
 * - Recommended reserved names: `core` (builtin semantics), `core-ng` (history/comparison).
 */
export type KernelId = 'core' | 'core-ng' | (string & {})

const isKernelId = (value: unknown): value is KernelId =>
  typeof value === 'string' && value.length > 0 && /^[a-z0-9-]+$/.test(value)

export interface KernelImplementationRef {
  /**
   * Requested kernel family id (not a version number).
   * Actual activation / fallback must be interpreted via RuntimeServicesEvidence.
   */
  readonly kernelId: KernelId
  /** The npm package that provides the kernel implementation. */
  readonly packageName: string
  /** Optional semver for explainability (not used as a semantic anchor). */
  readonly packageVersion?: string
  /** Optional build hash/id for evidence diff explainability. */
  readonly buildId?: string
  /** Explainability-only labels; must not become semantic switches. */
  readonly capabilities?: ReadonlyArray<string>
}

export const defaultKernelImplementationRef = {
  kernelId: 'core',
  packageName: '@logixjs/core',
} as const satisfies KernelImplementationRef

export const isKernelImplementationRef = (value: unknown): value is KernelImplementationRef => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false

  const keys = Object.keys(value)
  for (const k of keys) {
    if (k !== 'kernelId' && k !== 'packageName' && k !== 'packageVersion' && k !== 'buildId' && k !== 'capabilities') {
      return false
    }
  }

  const v: any = value
  if (!isKernelId(v.kernelId)) return false
  if (typeof v.packageName !== 'string' || v.packageName.length === 0) return false

  if (v.packageVersion !== undefined && (typeof v.packageVersion !== 'string' || v.packageVersion.length === 0)) {
    return false
  }
  if (v.buildId !== undefined && (typeof v.buildId !== 'string' || v.buildId.length === 0)) {
    return false
  }
  if (v.capabilities !== undefined) {
    if (!Array.isArray(v.capabilities)) return false
    if (!v.capabilities.every((c: unknown) => typeof c === 'string')) return false
  }

  return true
}

export const normalizeKernelImplementationRef = (
  value: unknown,
  fallback: KernelImplementationRef = defaultKernelImplementationRef,
): KernelImplementationRef => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return fallback

  const v: any = value
  if (!isKernelId(v.kernelId)) return fallback
  if (typeof v.packageName !== 'string' || v.packageName.length === 0) return fallback

  return {
    kernelId: v.kernelId,
    packageName: v.packageName,
    ...(typeof v.packageVersion === 'string' && v.packageVersion.length > 0
      ? { packageVersion: v.packageVersion }
      : {}),
    ...(typeof v.buildId === 'string' && v.buildId.length > 0 ? { buildId: v.buildId } : {}),
    ...(Array.isArray(v.capabilities) && v.capabilities.every((c: unknown) => typeof c === 'string')
      ? { capabilities: v.capabilities as ReadonlyArray<string> }
      : {}),
  }
}

class KernelImplementationRefTagImpl extends Context.Tag('@logixjs/core/KernelImplementationRef')<
  KernelImplementationRefTagImpl,
  KernelImplementationRef
>() {}

export const KernelImplementationRefTag = KernelImplementationRefTagImpl

export const resolveKernelImplementationRef = (): Effect.Effect<KernelImplementationRef, never, any> =>
  Effect.gen(function* () {
    const opt = yield* Effect.serviceOption(KernelImplementationRefTag)
    return normalizeKernelImplementationRef(Option.isSome(opt) ? opt.value : undefined)
  })

const KERNEL_IMPLEMENTATION_REF = Symbol.for('@logixjs/core/kernelImplementationRef')

const defineHidden = (target: object, key: symbol, value: unknown): void => {
  Object.defineProperty(target, key, {
    value,
    enumerable: false,
    configurable: true,
    writable: false,
  })
}

const formatScope = (moduleId: unknown, instanceId: unknown): string => {
  const m = typeof moduleId === 'string' && moduleId.length > 0 ? moduleId : 'unknown'
  const i = typeof instanceId === 'string' && instanceId.length > 0 ? instanceId : 'unknown'
  return `moduleId=${m}, instanceId=${i}`
}

export const setKernelImplementationRef = (runtime: object, ref: KernelImplementationRef): void => {
  defineHidden(runtime, KERNEL_IMPLEMENTATION_REF, ref)
}

export const getKernelImplementationRef = (runtime: object): KernelImplementationRef => {
  const scope = runtime as { readonly moduleId?: unknown; readonly instanceId?: unknown }
  const ref = (runtime as any)[KERNEL_IMPLEMENTATION_REF] as KernelImplementationRef | undefined
  if (!ref) {
    const msg = isDevEnv()
      ? [
          '[MissingKernelImplementationRef] KernelImplementationRef not installed on ModuleRuntime instance.',
          `scope: ${formatScope(scope.moduleId, scope.instanceId)}`,
          'fix:',
          '- Ensure ModuleRuntime.make installs KernelImplementationRef (045 kernel contract).',
          '- If you created a mock runtime for tests, attach KernelImplementationRef or avoid calling kernel-only APIs.',
        ].join('\n')
      : 'KernelImplementationRef not installed'
    throw new Error(msg)
  }
  return ref
}
