import * as Logix from '@logix/core'
import { Effect } from 'effect'
import { Engine, type InvalidateRequest } from '../../Engine.js'
import type { QuerySourceConfig } from '../../Traits.js'

export interface InvalidateLogicConfig<TParams, TUI> {
  readonly queries: Readonly<Record<string, QuerySourceConfig<TParams, TUI>>>
}

const toInvalidateTargets = <TParams, TUI>(
  request: InvalidateRequest,
  queries: Readonly<Record<string, QuerySourceConfig<TParams, TUI>>>,
): ReadonlyArray<{ readonly name: string; readonly resourceId: string }> => {
  if (request.kind === 'byResource') {
    return Object.entries(queries)
      .filter(([, q]) => q.resource.id === request.resourceId)
      .map(([name, q]) => ({ name, resourceId: q.resource.id }))
  }

  if (request.kind === 'byParams') {
    return Object.entries(queries)
      .filter(([, q]) => q.resource.id === request.resourceId)
      .map(([name, q]) => ({ name, resourceId: q.resource.id }))
  }

  // byTag: prefer QuerySourceConfig.tags for static filtering; if tags are missing, conservatively fall back to refreshing all.
  const entries = Object.entries(queries)
  const tagged = entries.filter(([, q]) => Array.isArray(q.tags) && q.tags.includes(request.tag))
  const selected = tagged.length > 0 ? tagged : entries
  return selected.map(([name, q]) => ({ name, resourceId: q.resource.id }))
}

export const invalidate = <Sh extends Logix.AnyModuleShape, TParams, TUI>(
  module: Logix.ModuleTagType<any, Sh>,
  config: InvalidateLogicConfig<TParams, TUI>,
): Logix.ModuleLogic<Sh, any, never> =>
  module.logic(($) =>
    Effect.gen(function* () {
      yield* $.onAction('invalidate').runFork((action: any) =>
        Effect.gen(function* () {
          const request = action.payload as InvalidateRequest

          // 1) Eventize: goes into ReplayLog (kernel-owned).
          yield* Logix.TraitLifecycle.scopedExecute($ as any, {
            kind: 'query:invalidate',
            request,
          })

          // 2) Call external engine (optional): does not block the fallback path.
          const engineOpt = yield* Effect.serviceOption(Engine)
          if (engineOpt._tag !== 'None') {
            yield* engineOpt.value.invalidate(request)
          }

          // 3) Immediately refresh related sources (write-back gating is still guaranteed by kernel keyHash).
          const targets = toInvalidateTargets(request, config.queries)
          const sourcePathOf = (name: string): string => `queries.${name}`
          yield* Effect.forEach(
            targets,
            (t) =>
              $.traits.source.refresh(sourcePathOf(t.name) as any, { force: true }) as Effect.Effect<void, never, any>,
          ).pipe(Effect.asVoid)
        }),
      )
    }),
  ) as Logix.ModuleLogic<Sh, any, never>
