import React from 'react'
import * as Logix from '@logixjs/core'
import { useRuntime } from './useRuntime.js'
import type { ModuleRefOfTag } from '../store/ModuleRef.js'
import { resolveImportedModuleRef } from '../store/resolveImportedModuleRef.js'

type ParentModuleRuntimeLike = {
  readonly moduleId: string
  readonly instanceId: string
  readonly getState: unknown
  readonly dispatch: unknown
}

/**
 * Thin hook sugar for `parent.imports.get(tag)`.
 *
 * Resolves a child module runtime only from the given parent instance scope.
 *
 * Typical usage:
 * - const host = useModule(HostProgram, { key })
 * - const query = useImportedModule(host, SearchQuery.tag)
 * - const status = useSelector(query, s => s.search.status)
 */
export function useImportedModule<Id extends string, Sh extends Logix.AnyModuleShape>(
  parent: ParentModuleRuntimeLike | { readonly runtime: unknown },
  module: Logix.Module.ModuleTag<Id, Sh>,
): ModuleRefOfTag<Id, Sh> {
  const runtime = useRuntime()
  const parentRuntime = ('runtime' in parent ? parent.runtime : parent) as Logix.ModuleRuntime<any, any>

  return React.useMemo(() => resolveImportedModuleRef(runtime, parentRuntime, module), [runtime, parentRuntime, module])
}
