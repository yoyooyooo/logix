import React from 'react'
import * as Logix from '@logix/core'
import { useRuntime } from './useRuntime.js'
import { useModuleRuntime } from './useModuleRuntime.js'
import type { ModuleDispatchersOfShape, ModuleRef } from '../store/ModuleRef.js'
import { resolveImportedModuleRef } from '../store/resolveImportedModuleRef.js'

/**
 * Resolves a child module runtime provided by imports from the "parent module instance scope".
 *
 * Typical usage:
 * - const host = useModule(HostImpl, { key })
 * - const query = useImportedModule(host, SearchQuery.tag)
 * - const status = useSelector(query, s => s.search.status)
 */
export function useImportedModule<Id extends string, Sh extends Logix.AnyModuleShape>(
  parent: Logix.ModuleRuntime<any, any> | ModuleRef<any, any>,
  module: Logix.ModuleTagType<Id, Sh>,
): ModuleRef<
  Logix.StateOf<Sh>,
  Logix.ActionOf<Sh>,
  keyof Sh['actionMap'] & string,
  Logix.ModuleTagType<Id, Sh>,
  ModuleDispatchersOfShape<Sh>
> {
  const runtime = useRuntime()
  const parentRuntime = useModuleRuntime(parent)

  return React.useMemo(() => resolveImportedModuleRef(runtime, parentRuntime, module), [runtime, parentRuntime, module])
}
