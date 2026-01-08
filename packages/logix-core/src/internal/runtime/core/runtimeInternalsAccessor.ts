import { isDevEnv } from './env.js'
import type { RuntimeInternals } from './RuntimeInternals.js'

const RUNTIME_INTERNALS = Symbol.for('@logixjs/core/runtimeInternals')
const BOUND_INTERNALS = Symbol.for('@logixjs/core/boundInternals')
const MODULE_TRAITS_PROGRAM = Symbol.for('@logixjs/core/moduleTraitsProgram')

const defineHidden = (target: object, key: symbol, value: unknown): void => {
  Object.defineProperty(target, key, {
    value,
    enumerable: false,
    configurable: true,
    writable: false,
  })
}

export const setRuntimeInternals = (runtime: object, internals: RuntimeInternals): void => {
  defineHidden(runtime, RUNTIME_INTERNALS, internals)
}

export const setBoundInternals = (bound: object, internals: RuntimeInternals): void => {
  defineHidden(bound, BOUND_INTERNALS, internals)
}

/**
 * ModuleTraitsProgram（StateTraitProgram）：
 * - Attaches a traits Program to a module definition object (used by TraitLifecycle/Debug).
 * - Uses Symbol + non-enumerable properties to avoid spreading `.__*` magic fields.
 *
 * Note: this is a "module-definition-side" internal slot, not RuntimeInternals (instance-level); the semantics differ.
 */
export const setModuleTraitsProgram = (module: object, program: unknown): void => {
  defineHidden(module, MODULE_TRAITS_PROGRAM, program)
}

export const getModuleTraitsProgram = (module: unknown): unknown | undefined => {
  if (!module) return undefined
  if (typeof module !== 'object' && typeof module !== 'function') return undefined
  return (module as any)[MODULE_TRAITS_PROGRAM] as unknown | undefined
}

const formatScope = (moduleId: unknown, instanceId: unknown): string => {
  const m = typeof moduleId === 'string' && moduleId.length > 0 ? moduleId : 'unknown'
  const i = typeof instanceId === 'string' && instanceId.length > 0 ? instanceId : 'unknown'
  return `moduleId=${m}, instanceId=${i}`
}

export const getRuntimeInternals = (runtime: object): RuntimeInternals => {
  const scope = runtime as { readonly moduleId?: unknown; readonly instanceId?: unknown }
  const internals = (runtime as any)[RUNTIME_INTERNALS] as RuntimeInternals | undefined
  if (!internals) {
    const msg = isDevEnv()
      ? [
          '[MissingRuntimeInternals] Runtime internals not installed on ModuleRuntime instance.',
          `scope: ${formatScope(scope.moduleId, scope.instanceId)}`,
          'fix:',
          '- Ensure ModuleRuntime.make calls internalHooks.installInternalHooks (020 foundation).',
          '- If you created a mock runtime for tests, attach internals or avoid calling internal-only APIs.',
        ].join('\n')
      : 'Runtime internals not installed'
    throw new Error(msg)
  }

  const runtimeInstanceId = scope.instanceId
  if (
    typeof runtimeInstanceId === 'string' &&
    runtimeInstanceId.length > 0 &&
    runtimeInstanceId !== internals.instanceId
  ) {
    throw new Error(
      isDevEnv()
        ? [
            '[InconsistentRuntimeInternals] Runtime internals instanceId mismatch.',
            `runtime: ${formatScope(scope.moduleId, runtimeInstanceId)}`,
            `internals: ${formatScope(internals.moduleId, internals.instanceId)}`,
          ].join('\n')
        : 'Runtime internals mismatch',
    )
  }

  return internals
}

export const getBoundInternals = (bound: object): RuntimeInternals => {
  const internals = (bound as any)[BOUND_INTERNALS] as RuntimeInternals | undefined
  if (!internals) {
    const msg = isDevEnv()
      ? [
          '[MissingBoundInternals] Bound internals not installed on Bound API instance.',
          'fix:',
          '- Ensure BoundApiRuntime attaches internals (020 foundation).',
          '- If you created a mock bound for tests, attach internals or avoid calling internal-only APIs.',
        ].join('\n')
      : 'Bound internals not installed'
    throw new Error(msg)
  }

  return internals
}
