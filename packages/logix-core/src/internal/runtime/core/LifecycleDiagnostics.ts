import { Cause, Chunk, Effect } from 'effect'
import * as Debug from './DebugSink.js'
import type { LifecycleManager } from './Lifecycle.js'

export type UnhandledErrorKind = 'interrupt' | 'diagnostic' | 'assembly' | 'defect'

export const classifyUnhandledCause = (cause: Cause.Cause<unknown>): UnhandledErrorKind => {
  if (Cause.isInterrupted(cause)) {
    return 'interrupt'
  }

  const all = [
    ...Chunk.toReadonlyArray(Cause.failures(cause)),
    ...Chunk.toReadonlyArray(Cause.defects(cause)),
  ] as ReadonlyArray<any>

  if (all.some((err) => err && typeof err === 'object' && err._tag === 'LogicPhaseError')) {
    return 'diagnostic'
  }

  if (all.some((err) => err && typeof err === 'object' && err.name === 'MissingModuleRuntimeError')) {
    return 'assembly'
  }

  return 'defect'
}

/**
 * When a Module hits a lifecycle error during Logic execution and no onError handler is registered,
 * emit a warning diagnostic suggesting adding $.lifecycle.onError at the beginning of the module logic.
 */
export const emitMissingOnErrorDiagnosticIfNeeded = (
  lifecycle: LifecycleManager,
  moduleId?: string,
): Effect.Effect<void, never, any> =>
  lifecycle.hasOnErrorHandlers.pipe(
    Effect.flatMap((has) =>
      has || !moduleId
        ? Effect.void
        : Debug.record({
            type: 'diagnostic',
            moduleId,
            code: 'lifecycle::missing_on_error',
            severity: 'warning',
            message: `Module "${moduleId}" received a lifecycle error but has no $.lifecycle.onError handler registered.`,
            hint: "Add $.lifecycle.onError((cause, context) => ...) at the beginning of this Module's logic to handle logic errors consistently.",
          }),
    ),
  )

/**
 * When a lifecycle error originates from "assembly failure" (e.g. missing Module runtime provider),
 * emit an error diagnostic with actionable fix suggestions.
 *
 * Notes:
 * - This diagnostic explains the error classification and does not change the original error semantics.
 * - If higher layers (e.g. React RuntimeProvider.onError) listen to both lifecycle:error and diagnostic(error),
 *   they should de-duplicate or report based on context/phase to avoid duplicate alerts.
 */
export const emitAssemblyFailureDiagnosticIfNeeded = (
  cause: Cause.Cause<unknown>,
  moduleId?: string,
): Effect.Effect<void, never, any> =>
  Effect.sync(() => {
    const defects = Chunk.toReadonlyArray(Cause.defects(cause))
    const missing = defects.find(
      (e) => e && typeof e === 'object' && (e as any).name === 'MissingModuleRuntimeError',
    ) as any

    if (!missing) {
      return Effect.void
    }

    const tokenId = typeof missing.tokenId === 'string' ? missing.tokenId : '<unknown module id>'
    const fix =
      Array.isArray(missing.fix) && missing.fix.every((l: unknown) => typeof l === 'string')
        ? (missing.fix as ReadonlyArray<string>).join('\n')
        : undefined

    return Debug.record({
      type: 'diagnostic',
      moduleId,
      code: 'assembly::missing_module_runtime',
      severity: 'error',
      message: `Missing Module runtime provider for "${tokenId}".`,
      hint:
        fix ?? 'Provide the child implementation in the same scope (imports), or provide a root singleton at app root.',
      kind: 'assembly_failure',
    })
  }).pipe(Effect.flatten)
