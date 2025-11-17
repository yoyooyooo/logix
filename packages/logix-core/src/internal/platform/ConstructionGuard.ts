import { Cause, Effect } from 'effect'

export interface ConstructionGuardError extends Error {
  readonly _tag: 'ConstructionGuardError'
  readonly kind: 'missing_service' | 'unknown_defect'
  readonly missingService?: string
  readonly hint?: string
}

export const makeConstructionGuardError = (options: {
  readonly kind: ConstructionGuardError['kind']
  readonly message: string
  readonly missingService?: string
  readonly hint?: string
}): ConstructionGuardError =>
  Object.assign(new Error(options.message), {
    _tag: 'ConstructionGuardError',
    kind: options.kind,
    missingService: options.missingService,
    hint: options.hint,
  }) as ConstructionGuardError

const extractMissingService = (cause: Cause.Cause<unknown>): string | undefined => {
  const candidates = [...Array.from(Cause.defects(cause)), ...Array.from(Cause.failures(cause))]

  for (const candidate of candidates) {
    const message =
      candidate instanceof Error ? candidate.message : typeof candidate === 'string' ? candidate : undefined

    if (!message) continue

    const match = /Service not found: ([^\s(]+)/.exec(message)
    if (match?.[1]) return match[1]
  }

  return undefined
}

/**
 * guardBuildTime：
 * - During Build Env/Reflection, catch "missing service" defects and convert them into actionable errors.
 * - Preserve other failures/defects as-is (do not swallow business error semantics).
 */
export const guardBuildTime = <A, E, R>(
  self: Effect.Effect<A, E, R>,
): Effect.Effect<A, E | ConstructionGuardError, R> =>
  self.pipe(
    Effect.catchAllCause((cause): Effect.Effect<never, ConstructionGuardError | E, never> => {
      const missing = extractMissingService(cause)
      if (missing) {
        return Effect.fail(
          makeConstructionGuardError({
            kind: 'missing_service',
            missingService: missing,
            message: `[ConstructionGuardError] Build-time dependency violation: service "${missing}" is not available in Build Env.`,
            hint:
              'Build-time (Reflection) can only depend on a small set of mockable primitives (e.g. Config/RuntimeHost). ' +
              'Move business service access to runtime (e.g. Trait handler / Logic run section) or isolate it via explicit injection.',
          }),
        )
      }
      return Effect.failCause(cause) as Effect.Effect<never, ConstructionGuardError | E>
    }),
  )
