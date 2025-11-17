import { useContext, useEffect, useMemo, useRef } from 'react'
import { Layer, ManagedRuntime } from 'effect'
import { RuntimeContext } from '../provider/ReactContext.js'
import { isDevEnv } from '../provider/env.js'
import { createRuntimeAdapter, useLayerBinding } from '../provider/runtimeBindings.js'
import { RuntimeProviderNotFoundError } from '../provider/errors.js'

export interface UseRuntimeOptions {
  // Adds one or more local Env layers on top of the current Runtime.
  // Semantically, this appends a new Context after the current Provider chain contexts.
  // It does not restart Root processes; it only overrides Env.
  readonly layer?: Layer.Layer<any, any, never>
  readonly layers?: ReadonlyArray<Layer.Layer<any, any, never>>
}

export function useRuntime(): ManagedRuntime.ManagedRuntime<any, any>
export function useRuntime(options: UseRuntimeOptions): ManagedRuntime.ManagedRuntime<any, any>
export function useRuntime(options?: UseRuntimeOptions): ManagedRuntime.ManagedRuntime<any, any> {
  const context = useContext(RuntimeContext)
  if (!context) {
    throw new RuntimeProviderNotFoundError('useRuntime')
  }

  const mergedLayerCacheRef = useRef<{
    layers: ReadonlyArray<Layer.Layer<any, any, never>>
    merged: Layer.Layer<any, any, never>
  } | null>(null)

  const mergedLayer = useMemo<Layer.Layer<any, any, never> | undefined>(() => {
    if (!options) {
      return undefined
    }

    const { layer, layers } = options
    const hasLayersArray = Array.isArray(layers) && layers.length > 0

    if (!layer && !hasLayersArray) {
      return undefined
    }

    if (hasLayersArray) {
      const all = (layer ? [layer, ...layers!] : layers!) as ReadonlyArray<Layer.Layer<any, any, never>>

      // Reuse the last merged result when elements are the same but array reference is new, avoiding meaningless Layer rebuilds.
      const cached = mergedLayerCacheRef.current
      const shallowEqual =
        cached && cached.layers.length === all.length && cached.layers.every((item, idx) => item === all[idx])

      if (shallowEqual) {
        return cached!.merged
      }

      const merged = Layer.mergeAll(...(all as [Layer.Layer<any, any, never>, ...Layer.Layer<any, any, never>[]]))
      mergedLayerCacheRef.current = { layers: all, merged }
      return merged
    }

    return layer
  }, [options?.layer, options?.layers])

  const lastLayersRef = useRef<ReadonlyArray<Layer.Layer<any, any, never>> | null>(null)
  const shallowEqualLayers = (
    a: ReadonlyArray<Layer.Layer<any, any, never>> | null,
    b: ReadonlyArray<Layer.Layer<any, any, never>> | null,
  ) => !!a && !!b && a.length === b.length && a.every((item, idx) => item === b[idx])

  useEffect(() => {
    if (!isDevEnv()) {
      return
    }
    if (
      options?.layers &&
      lastLayersRef.current &&
      lastLayersRef.current !== options.layers &&
      !shallowEqualLayers(lastLayersRef.current, options.layers)
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        '[RuntimeProvider] useRuntime received a new layers reference. Memoize the layers array with useMemo to avoid rebuilding Layers on every render (performance jitter).',
      )
    }
    lastLayersRef.current = options?.layers ?? null
  }, [options?.layers])

  const { binding } = useLayerBinding(context.runtime, mergedLayer, !!mergedLayer)

  return useMemo(() => {
    if (!binding) {
      return context.runtime
    }
    return createRuntimeAdapter(
      context.runtime as ManagedRuntime.ManagedRuntime<any, any>,
      [binding.context],
      [binding.scope],
      [binding.loggers],
      [binding.logLevel],
      [binding.debugSinks],
    )
  }, [context.runtime, binding])
}
