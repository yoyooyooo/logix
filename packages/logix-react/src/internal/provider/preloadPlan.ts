import { Effect, Layer, Scope, ServiceMap } from 'effect'
import type * as Logix from '@logixjs/core'
import type { ModuleCacheFactory } from '../store/ModuleCache.js'
import type { ResolvedRuntimeProviderPolicy } from './policy.js'

type ResolvedPreloadPolicy = NonNullable<ResolvedRuntimeProviderPolicy['preload']>

export type DeferPreloadPlanEntry = {
  readonly handleKind: 'ModuleImpl' | 'ModuleTag'
  readonly ownerId: string
  readonly key: string
  readonly gcTime: number
  readonly factory: ModuleCacheFactory
  readonly tokenId?: string
}

export const buildDeferPreloadPlan = (args: {
  readonly preload: ResolvedPreloadPolicy | null
  readonly gcTime: number
}): ReadonlyArray<DeferPreloadPlanEntry> => {
  if (!args.preload) {
    return []
  }

  const entries: Array<DeferPreloadPlanEntry> = []

  for (const handle of args.preload.handles) {
    if ((handle as any)?._tag === 'ModuleImpl') {
      const moduleTag = (handle as any).module
      const moduleId = moduleTag?.id ?? 'ModuleImpl'
      const layer = (handle as any).layer as Layer.Layer<any, any, never>
      const key = args.preload.keysByModuleId.get(moduleId) ?? `preload:impl:${moduleId}`
      const factory: ModuleCacheFactory = (scope: Scope.Scope) =>
        Layer.buildWithScope(layer, scope).pipe(
          Effect.map((context) => ServiceMap.get(context, moduleTag) as any),
        )

      entries.push({
        handleKind: 'ModuleImpl',
        ownerId: moduleId,
        key,
        gcTime: args.gcTime,
        factory,
      })
      continue
    }

    const tagId = (handle as Logix.ModuleTagType<string, Logix.AnyModuleShape>).id ?? 'ModuleTag'
    const key = args.preload.keysByTagId.get(tagId) ?? `preload:tag:${tagId}`
    const factory: ModuleCacheFactory = (scope: Scope.Scope) =>
      Scope.provide(scope)(
        Effect.service(handle as any).pipe(Effect.orDie),
      ) as Effect.Effect<any, unknown, unknown>

    entries.push({
      handleKind: 'ModuleTag',
      ownerId: tagId,
      key,
      gcTime: args.gcTime,
      factory,
      tokenId: tagId,
    })
  }

  return entries
}
