import React from 'react'
import { Context, Effect, Layer } from 'effect'
import * as Logix from '@logixjs/core'
import { useLocalModule } from './useLocalModule.js'
import type { ModuleRef } from '../store/ModuleRef.js'

/**
 * Creates a local ModuleRuntime from an already assembled Module Layer (e.g. RegionLive).
 *
 * Use cases:
 * - On the effect side, you already built the full Layer via `Module.live(initial, ...logics)`.
 * - A React component wants to "just consume" that Layer without caring about initial/logics details.
 */
export function useLayerModule<Id extends string, Sh extends Logix.AnyModuleShape>(
  module: Logix.ModuleTagType<Id, Sh>,
  layer: Layer.Layer<Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>, never, any>,
  deps: React.DependencyList = [],
): ModuleRef<Logix.StateOf<Sh>, Logix.ActionOf<Sh>> {
  const factory = React.useCallback(
    () =>
      Layer.build(layer).pipe(
        Effect.scoped,
        Effect.map((context) => Context.get(context, module)),
      ),
    // layer/module are typically constants; deps lets callers opt into rebuilding when needed.
    [layer, module],
  )

  return useLocalModule(factory, deps) as ModuleRef<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>
}
