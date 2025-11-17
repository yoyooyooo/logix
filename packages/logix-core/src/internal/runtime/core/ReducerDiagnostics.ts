import { Cause, Chunk, Effect } from 'effect'
import * as Debug from './DebugSink.js'

/**
 * Reducer diagnostic error types:
 * - ReducerDuplicateError: multiple primary reducers registered for the same tag.
 * - ReducerLateRegistrationError: reducer registered after actions with this tag have already been dispatched.
 *
 * These errors are internal to Runtime and are converted into Debug diagnostic events in the catch phase.
 */
export interface ReducerDiagnosticError extends Error {
  readonly _tag: 'ReducerDuplicateError' | 'ReducerLateRegistrationError'
  readonly tag: string
  readonly moduleId?: string
}

export const makeReducerError = (
  _tag: ReducerDiagnosticError['_tag'],
  tag: string,
  moduleId?: string,
): ReducerDiagnosticError =>
  Object.assign(
    new Error(
      _tag === 'ReducerDuplicateError'
        ? `[ModuleRuntime] Duplicate primary reducer for tag "${tag}". Each action tag must have at most one primary reducer.`
        : `[ModuleRuntime] Late primary reducer registration for tag "${tag}". Reducers must be registered before the first dispatch of this tag.`,
    ),
    {
      _tag,
      tag,
      moduleId,
    },
  ) as ReducerDiagnosticError

/**
 * Extracts Reducer diagnostic errors from a Logic-forked Cause and emits them as Debug events.
 *
 * Notes:
 * - Emits diagnostic events only when ReducerDiagnosticError is present.
 * - moduleId prefers the error object's moduleId, falling back to the caller-provided moduleId.
 */
export const emitDiagnosticsFromCause = (
  cause: Cause.Cause<unknown>,
  moduleIdFromContext?: string,
): Effect.Effect<void, never, any> =>
  Effect.sync(() => {
    const defects = Chunk.toReadonlyArray(Cause.defects(cause))

    let duplicate: ReducerDiagnosticError | undefined
    let late: ReducerDiagnosticError | undefined

    for (const defect of defects) {
      if (!defect || typeof defect !== 'object') continue
      const error = defect as any
      if (error._tag === 'ReducerDuplicateError') {
        duplicate = error as ReducerDiagnosticError
      } else if (error._tag === 'ReducerLateRegistrationError') {
        late = error as ReducerDiagnosticError
      }
    }

    const effects: Array<Effect.Effect<void>> = []

    if (duplicate) {
      effects.push(
        Debug.record({
          type: 'diagnostic',
          moduleId: duplicate.moduleId ?? moduleIdFromContext,
          code: 'reducer::duplicate',
          severity: 'error',
          message: `Primary reducer for tag "${duplicate.tag}" is already registered and cannot be redefined.`,
          hint: 'Ensure each Action tag defines a single primary reducer. If it is defined in both Module.reducers and $.reducer, keep the Module.reducers version or merge into one definition.',
          actionTag: duplicate.tag,
        }),
      )
    }

    if (late) {
      effects.push(
        Debug.record({
          type: 'diagnostic',
          moduleId: late.moduleId ?? moduleIdFromContext,
          code: 'reducer::late_registration',
          severity: 'error',
          message: `Primary reducer for tag "${late.tag}" was registered after actions with this tag had already been dispatched.`,
          hint: 'Move this reducer to Module.make({ reducers }), or ensure $.reducer("tag", ...) runs before the first dispatch.',
          actionTag: late.tag,
        }),
      )
    }

    if (effects.length === 0) {
      return Effect.void
    }

    let combined: Effect.Effect<void> = Effect.void
    for (const eff of effects) {
      combined = combined.pipe(Effect.zipRight(eff))
    }
    return combined
  }).pipe(Effect.flatten)
