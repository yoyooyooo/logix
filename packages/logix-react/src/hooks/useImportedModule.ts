import React from "react"
import * as Logix from "@logix/core"
import { useRuntime } from "../components/RuntimeProvider.js"
import { useModuleRuntime } from "../internal/useModuleRuntime.js"
import type { ModuleRef } from "../internal/ModuleRef.js"
import { resolveImportedModuleRef } from "../internal/resolveImportedModuleRef.js"

/**
 * 从“父模块实例的 scope”中解析一个被 imports 提供的子模块 runtime。
 *
 * 典型用法：
 * - const host = useModule(HostImpl, { key })
 * - const query = useImportedModule(host, SearchQuery.module)
 * - const status = useSelector(query, s => s.search.status)
 */
export function useImportedModule<Id extends string, Sh extends Logix.AnyModuleShape>(
  parent: Logix.ModuleRuntime<any, any> | ModuleRef<any, any>,
  module: Logix.ModuleInstance<Id, Sh>,
): ModuleRef<Logix.StateOf<Sh>, Logix.ActionOf<Sh>> {
  const runtime = useRuntime()
  const parentRuntime = useModuleRuntime(parent as any)

  return React.useMemo(
    () => resolveImportedModuleRef(runtime, parentRuntime, module),
    [runtime, parentRuntime, module],
  )
}
