import { makeCliError } from '../errors.js'

import type {
  ExtensionHostRuntime,
  ExtensionHookContext,
  ExtensionHookName,
  ExtensionLifecycleHook,
  ExtensionLifecyclePhase,
} from './runtime.js'

export type ExtensionHookTraceItem = {
  readonly phase: ExtensionLifecyclePhase | 'execute'
  readonly hook: ExtensionHookName
  readonly index: number
}

export type ExtensionHookExecutionResult<T> = {
  readonly executedHook: boolean
  readonly value: T | undefined
  readonly trace: ReadonlyArray<ExtensionHookTraceItem>
}

const wrapLifecycleError = (phase: ExtensionLifecyclePhase | 'execute', hook: ExtensionHookName, cause: unknown): Error =>
  makeCliError({
    code: 'EXT_HOOK_EXECUTION_FAILED',
    message: `[Logix][CLI] 扩展 hook 执行失败（phase=${phase}, hook=${hook}）`,
    cause,
  })

const runLifecycleHooks = async (args: {
  readonly hooks: ReadonlyArray<ExtensionLifecycleHook>
  readonly phase: ExtensionLifecyclePhase
  readonly hook: ExtensionHookName
  readonly runtime: ExtensionHostRuntime
  readonly context: ExtensionHookContext
  readonly trace: ExtensionHookTraceItem[]
}): Promise<void> => {
  for (let i = 0; i < args.hooks.length; i++) {
    const lifecycleHook = args.hooks[i]
    if (!lifecycleHook) continue
    try {
      args.trace.push({
        phase: args.phase,
        hook: args.hook,
        index: i,
      })
      await lifecycleHook({
        phase: args.phase,
        hook: args.hook,
        context: args.context,
        manifest: args.runtime.manifest,
      })
    } catch (cause) {
      throw wrapLifecycleError(args.phase, args.hook, cause)
    }
  }
}

export const runExtensionHook = async <T = unknown>(args: {
  readonly runtime: ExtensionHostRuntime
  readonly hook: ExtensionHookName
  readonly context: Omit<ExtensionHookContext, 'hook'> & { readonly hook?: ExtensionHookName }
}): Promise<ExtensionHookExecutionResult<T>> => {
  const context: ExtensionHookContext = {
    ...args.context,
    hook: args.hook,
  }
  const trace: ExtensionHookTraceItem[] = []
  const beforeHooks = args.runtime.beforeHooks ?? []
  const afterHooks = args.runtime.afterHooks ?? []

  await runLifecycleHooks({
    hooks: beforeHooks,
    phase: 'before',
    hook: args.hook,
    runtime: args.runtime,
    context,
    trace,
  })

  const runtimeHook = args.runtime.hooks[args.hook]
  let value: T | undefined = undefined
  let executionError: unknown = undefined
  if (runtimeHook) {
    trace.push({ phase: 'execute', hook: args.hook, index: 0 })
    try {
      value = (await runtimeHook(context)) as T
    } catch (cause) {
      executionError = wrapLifecycleError('execute', args.hook, cause)
    }
  }

  await runLifecycleHooks({
    hooks: afterHooks,
    phase: 'after',
    hook: args.hook,
    runtime: args.runtime,
    context,
    trace,
  })

  if (executionError) {
    throw executionError
  }

  return {
    executedHook: typeof runtimeHook === 'function',
    value,
    trace,
  }
}
