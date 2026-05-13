import type { RuntimeReflectionManifest } from '../../reflection/programManifest.js'
import {
  createStaticLiveBindingIndex,
  type StaticLiveBindingIndex,
} from '../../reflection/staticLiveBinding.js'
import type { LiveInspectArtifact } from './liveInspect.js'
import { createLiveActionsProjection } from './liveInspect.js'
import type { LiveTargetCoordinate, LiveTargetDescriptor } from './liveTypes.js'
import { liveTargetCoordinateKey, makeLiveTargetCoordinate } from './liveTypes.js'

export interface LiveBindingRegistryTargetBinding {
  readonly target: LiveTargetCoordinate
  readonly manifest: RuntimeReflectionManifest
  readonly actionIndex: StaticLiveBindingIndex
}

export interface LiveBindingRegistryDiagnostics {
  readonly targetBindingCount: number
  readonly manifestIndexCount: number
  readonly projectionCacheCount: number
  readonly disposedIndexCount: number
}

export const createLiveBindingRegistry = () => {
  const targetBindings = new Map<string, LiveBindingRegistryTargetBinding>()
  const indexes = new Map<string, StaticLiveBindingIndex>()
  const projectionCache = new Map<string, LiveInspectArtifact<'actions'>>()
  let disposedIndexCount = 0

  const disposeIndex = (manifestDigest: string): void => {
    const index = indexes.get(manifestDigest)
    if (!index) return
    index.dispose()
    indexes.delete(manifestDigest)
    disposedIndexCount += 1
  }

  const cleanupProjectionCacheForTarget = (target: LiveTargetCoordinate): void => {
    const targetKey = liveTargetCoordinateKey(target)
    for (const key of Array.from(projectionCache.keys())) {
      if (key.startsWith(`${targetKey}::`)) {
        projectionCache.delete(key)
      }
    }
  }

  const cleanupUnusedManifestIndex = (manifestDigest: string): void => {
    const stillUsed = Array.from(targetBindings.values()).some(
      (binding) => binding.manifest.digest === manifestDigest,
    )
    if (!stillUsed) {
      disposeIndex(manifestDigest)
    }
  }

  return {
    bindTarget: (input: {
      readonly target: LiveTargetCoordinate
      readonly manifest: RuntimeReflectionManifest
    }): LiveBindingRegistryTargetBinding => {
      const target = makeLiveTargetCoordinate(input.target)
      const targetKey = liveTargetCoordinateKey(target)
      const previous = targetBindings.get(targetKey)
      if (previous && previous.manifest.digest !== input.manifest.digest) {
        cleanupProjectionCacheForTarget(target)
        targetBindings.delete(targetKey)
        cleanupUnusedManifestIndex(previous.manifest.digest)
      }

      const actionIndex = indexes.get(input.manifest.digest) ?? createStaticLiveBindingIndex(input.manifest)
      indexes.set(input.manifest.digest, actionIndex)
      const binding = { target, manifest: input.manifest, actionIndex }
      targetBindings.set(targetKey, binding)
      return binding
    },

    resolveTarget: (target: LiveTargetCoordinate): LiveBindingRegistryTargetBinding | undefined =>
      targetBindings.get(liveTargetCoordinateKey(target)),

    projectActions: (input: {
      readonly target: LiveTargetDescriptor
      readonly producer: string
      readonly maxActions?: number
    }): LiveInspectArtifact<'actions'> => {
      const binding = targetBindings.get(liveTargetCoordinateKey(input.target))
      if (!binding) {
        throw new Error('[Logix][LiveBindingRegistry] cannot project actions without target binding')
      }
      const cacheKey = `${liveTargetCoordinateKey(input.target)}::${binding.manifest.digest}::${input.maxActions ?? 'all'}`
      const cached = projectionCache.get(cacheKey)
      if (cached) return cached
      const artifact = createLiveActionsProjection({
        target: input.target,
        producer: input.producer,
        manifest: binding.manifest,
        actionIndex: binding.actionIndex,
        ...(input.maxActions !== undefined ? { maxActions: input.maxActions } : null),
      })
      projectionCache.set(cacheKey, artifact)
      return artifact
    },

    unbindTarget: (target: LiveTargetCoordinate): void => {
      const targetKey = liveTargetCoordinateKey(target)
      const previous = targetBindings.get(targetKey)
      if (!previous) return
      targetBindings.delete(targetKey)
      cleanupProjectionCacheForTarget(previous.target)
      cleanupUnusedManifestIndex(previous.manifest.digest)
    },

    getDiagnostics: (): LiveBindingRegistryDiagnostics => ({
      targetBindingCount: targetBindings.size,
      manifestIndexCount: indexes.size,
      projectionCacheCount: projectionCache.size,
      disposedIndexCount,
    }),
  }
}

export type LiveBindingRegistry = ReturnType<typeof createLiveBindingRegistry>
