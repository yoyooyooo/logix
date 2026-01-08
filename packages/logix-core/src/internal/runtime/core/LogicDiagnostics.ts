import { Cause, Context, Effect } from 'effect'
import * as Debug from './DebugSink.js'
import { isDevEnv } from './env.js'

const phaseDiagnosticsEnabled = (): boolean => isDevEnv()

/**
 * Logic diagnostics:
 * - Currently focuses on initialization noise caused by missing Env services ("Service not found").
 *
 * Design intent:
 * - In recommended usage, Runtime / React layers provide Env correctly.
 * - In some startup timing windows, Logic may try to read services before Env is fully provided.
 * - Such errors often occur once, do not change final semantics, but pollute logs.
 *
 * Therefore we emit a warning diagnostic via Debug, explaining likely causes and investigation paths.
 * The real error semantics are still handled by lifecycle.onError / AppRuntime.onError.
 */

const SERVICE_NOT_FOUND_PREFIX = 'Service not found:'

/**
 * If the Cause contains a `Service not found: ...` error, emit a warning diagnostic:
 * - code: logic::env_service_not_found
 * - message: the original error message
 * - hint: explains this is known startup timing noise and suggests what to check
 */
export const emitEnvServiceNotFoundDiagnosticIfNeeded = (
  cause: Cause.Cause<unknown>,
  moduleId?: string,
): Effect.Effect<void> =>
  Effect.gen(function* () {
    let pretty: string
    try {
      pretty = Cause.pretty(cause, { renderErrorCause: true })
    } catch {
      return
    }

    if (!pretty.includes(SERVICE_NOT_FOUND_PREFIX)) {
      return
    }

    // 1) Warning diagnostic for the missing Env service itself
    yield* Debug.record({
      type: 'diagnostic',
      moduleId,
      code: 'logic::env_service_not_found',
      severity: 'warning',
      message: pretty,
      hint:
        'Logic attempted to access an Env service before it was provided. This is a known initialization timing noise in Runtime/React integration. ' +
        "If it happens once during early startup and everything works afterward, it's likely harmless; " +
        'if it persists or correlates with app issues, verify Runtime.make / RuntimeProvider.layer provides the service.',
    })

    // 2) In some cases (e.g. accessing Env too early during Logic setup), we also want to surface
    //    logic::invalid_phase to suggest moving Env access to the run section.
    //
    // Because we cannot reliably determine the phase at this point, this is only a supplemental signal.
    // The real phase guard is still handled by LogicPhaseError + emitInvalidPhaseDiagnosticIfNeeded.
    yield* Debug.record({
      type: 'diagnostic',
      moduleId,
      code: 'logic::invalid_phase',
      severity: 'error',
      message: '$.use is not allowed before Env is fully ready.',
      hint:
        'Avoid reading services during setup or before Env is ready; ' +
        'move Env access to the Logic run section, or wrap init via $.lifecycle.onInitRequired.',
      kind: 'env_service_not_ready',
    })
  })

export interface LogicPhaseError extends Error {
  readonly _tag: 'LogicPhaseError'
  readonly kind: string
  readonly api?: string
  readonly phase: 'setup' | 'run'
  readonly moduleId?: string
}

export interface LogicPhaseService {
  readonly current: 'setup' | 'run'
}

export const LogicPhaseServiceTag = Context.GenericTag<LogicPhaseService>('@logixjs/LogicPhaseService')

/**
 * LogicUnitService:
 * - Injected while executing each mounted logic unit (scope = the logic unit's setup/run fiber).
 * - Used for trait provenance and other "bound to the current logic unit" information (aligned with 022-module logicUnitId).
 *
 * Constraints:
 * - Read-only (must not mutate runtime state); only a provenance/diagnostics anchor.
 */
export interface LogicUnitService {
  readonly logicUnitId: string
  readonly logicUnitIdKind: 'explicit' | 'derived'
  readonly logicUnitLabel: string
  readonly path?: string
}

export class LogicUnitServiceTag extends Context.Tag('@logixjs/LogicUnitService')<
  LogicUnitServiceTag,
  LogicUnitService
>() {}

export const makeLogicPhaseError = (
  kind: string,
  api: string,
  phase: 'setup' | 'run',
  moduleId?: string,
): LogicPhaseError =>
  Object.assign(new Error(`[LogicPhaseError] ${api} is not allowed in ${phase} phase (kind=${kind}).`), {
    _tag: 'LogicPhaseError',
    kind,
    api,
    phase,
    moduleId,
  }) as LogicPhaseError

/**
 * Extracts LogicPhaseError from a Cause and emits it as a diagnostic:
 * - code: logic::invalid_phase
 * - kind: concrete violation kind (e.g. use_in_setup)
 */
export const emitInvalidPhaseDiagnosticIfNeeded = (
  cause: Cause.Cause<unknown>,
  moduleId?: string,
): Effect.Effect<void> =>
  Effect.gen(function* () {
    if (!phaseDiagnosticsEnabled()) {
      return
    }

    const allErrors = [...Cause.failures(cause), ...Cause.defects(cause)]

    for (const err of allErrors) {
      const logicErr = err as any
      if (logicErr && logicErr._tag === 'LogicPhaseError') {
        const phaseErr = logicErr as LogicPhaseError
        const hint =
          phaseErr.kind === 'use_in_setup' || phaseErr.kind === 'lifecycle_in_setup'
            ? 'The setup phase must not read Env/services or run long-lived logic; move the relevant calls to the run phase.'
            : phaseErr.kind === 'lifecycle_in_run'
              ? 'Do not register $.lifecycle.* in the run phase (setup-only). Move lifecycle registrations to the synchronous part of Module.logic builder (before return).'
              : phaseErr.kind === 'traits_in_run' || phaseErr.kind === 'traits_declare_in_run'
                ? 'Traits are frozen after setup; move $.traits.declare to LogicPlan.setup or the setup registration phase of Module.logic builder.'
                : 'Move logic to the run phase; keep setup for registrations only.'

        yield* Debug.record({
          type: 'diagnostic',
          moduleId: phaseErr.moduleId ?? moduleId,
          code: 'logic::invalid_phase',
          severity: 'error',
          message: `${phaseErr.api ?? phaseErr.kind} is not allowed in ${phaseErr.phase} phase.`,
          hint,
          kind: phaseErr.kind,
        })

        // Return after the first LogicPhaseError match.
        return
      }
    }
  })
