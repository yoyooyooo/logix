import { useMemo, useRef } from 'react'

/**
 * A hook to manage a dynamic list of Module instances.
 * It ensures that the Module instance for a given ID remains stable across renders,
 * which is crucial for preserving the identity of the module (and its state/subscriptions).
 *
 * @param items The source data array.
 * @param keyFn A function to extract a unique key (ID) from an item.
 * @param factory A function to create a new Module instance for a given ID and item.
 * @returns An array of Module instances corresponding to the items.
 */
export function useModuleList<T, M>(items: T[], keyFn: (item: T) => string, factory: (id: string, item: T) => M): M[] {
  // We use a Map to cache instances.
  // The cache itself is stable across renders.
  const cache = useMemo(() => new Map<string, M>(), [])

  // Use refs to keep latest callbacks without breaking memoization
  // This allows users to pass inline functions for keyFn and factory
  // without causing the list to be re-mapped on every render.
  const keyFnRef = useRef(keyFn)
  keyFnRef.current = keyFn

  const factoryRef = useRef(factory)
  factoryRef.current = factory

  return useMemo(() => {
    // We create a new array of modules, but reuse instances from the cache.
    // This handles:
    // 1. New items: Created via factory and added to cache.
    // 2. Existing items: Retrieved from cache.
    // 3. Removed items: They are just not included in the result array.
    //    Note: We currently DO NOT actively prune the cache for removed items.
    //    This is usually fine for "Module" instances as they are lightweight definitions.
    //    If they hold heavy resources, we might need a cleanup mechanism,
    //    but usually the heavy part is the Runtime, which is managed by useLocalModule/useModule.

    return items.map((item) => {
      const key = keyFnRef.current(item)
      if (!cache.has(key)) {
        cache.set(key, factoryRef.current(key, item))
      }
      return cache.get(key)!
    })
  }, [items, cache])
}
