import { Cause, Chunk, Effect } from 'effect'
import * as Debug from './DebugSink.js'
import type { LifecycleManager } from './Lifecycle.js'

export type UnhandledErrorKind = 'interrupt' | 'diagnostic' | 'assembly' | 'defect'

export const classifyUnhandledCause = (cause: Cause.Cause<unknown>): UnhandledErrorKind => {
  if (Cause.hasInterruptsOnly(cause)) {
    return 'interrupt'
  }

  const all = cause.reasons
    .filter((reason) => Cause.isFailReason(reason) || Cause.isDieReason(reason))
    .map((reason) => (Cause.isFailReason(reason) ? reason.error : reason.defect)) as ReadonlyArray<any>

  if (all.some((err) => err && typeof err === 'object' && err._tag === 'LogicPhaseError')) {
    return 'diagnostic'
  }

  if (all.some((err) => err && typeof err === 'object' && err.name === 'MissingModuleRuntimeError')) {
    return 'assembly'
  }

  return 'defect'
}

/**
 * When a Module hits a runtime lifecycle error and no internal error observer is registered,
 * emit a warning diagnostic that routes observation to Runtime / Provider / diagnostics.
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
            message: `Module "${moduleId}" emitted an unhandled runtime lifecycle error.`,
            hint:
              'Observe runtime failures through Runtime.onError, RuntimeProvider.onError, or diagnostics sinks. Logic authoring should keep failure handling local to the returned run effect or the readiness effect.',
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
    const defects = cause.reasons.filter(Cause.isDieReason).map((reason) => reason.defect)
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
