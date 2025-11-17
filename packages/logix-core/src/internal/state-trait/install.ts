import { Effect } from 'effect'
import type { BoundApi } from '../runtime/core/module.js'
import { getBoundInternals } from '../runtime/core/runtimeInternalsAccessor.js'
import * as SourceRuntime from './source.js'
import type {
  StateTraitProgram,
  StateTraitPlanStep,
  StateTraitEntry,
  TraitConvergeGenerationBumpReason,
} from './model.js'

const buildEntryIndex = <S>(
  entries: ReadonlyArray<StateTraitEntry<S, string>>,
): Map<string, Array<StateTraitEntry<S, string>>> => {
  const index = new Map<string, Array<StateTraitEntry<S, string>>>()
  for (const entry of entries) {
    const list = index.get(entry.fieldPath) ?? []
    list.push(entry)
    index.set(entry.fieldPath, list)
  }
  return index
}

/**
 * Install behaviors described by StateTraitProgram onto the given Bound API.
 *
 * - Phase 2 minimal implementation:
 *   - Register watchers for computed fields: recompute target fields when State changes.
 *   - Register watchers for link fields: sync target fields when source fields change.
 *   - Reserve refresh entrypoints for source fields (no external calls yet).
 *
 * Notes:
 * - All watchers are installed via Bound API `$`, without directly depending on ModuleRuntime.
 * - Each PlanStep corresponds to a long-lived Effect and is mounted into the Runtime Scope via forkScoped.
 */
export const install = <S>(
  bound: BoundApi<any, any>,
  program: StateTraitProgram<S>,
): Effect.Effect<void, never, any> => {
  // Register the program to Runtime first (the converge engine runs computed/link/check before txn commit).
  try {
    const internals = getBoundInternals(bound as any)
    ;(internals.traits.registerStateTraitProgram as any)(program, {
      bumpReason: 'logic_installed' as TraitConvergeGenerationBumpReason,
    })
  } catch {
    // no-op for legacy/mocked bound
  }

  const entryIndex = buildEntryIndex(program.entries as any)

  const installStep = (step: StateTraitPlanStep): Effect.Effect<void, never, any> => {
    if (!step.targetFieldPath) {
      return Effect.void
    }

    if (step.kind !== 'source-refresh') {
      // computed/link/check are handled by the runtime core within the transaction window; install keeps only source.refresh entrypoints.
      return Effect.void
    }

    const candidates = entryIndex.get(step.targetFieldPath)
    if (!candidates || candidates.length === 0) {
      // The plan references a missing spec: treat it as a build-time bug and ignore the step here.
      return Effect.void
    }

    const entry = candidates.find((e) => e.kind === 'source')

    if (!entry) {
      return Effect.void
    }

    return SourceRuntime.installSourceRefresh(bound, step, entry as any)
  }

  return Effect.forEach(program.plan.steps, (step) => installStep(step)).pipe(Effect.asVoid)
}
