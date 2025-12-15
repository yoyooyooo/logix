import { Effect } from "effect"
import type { ManagedRuntime } from "effect"
import * as Logix from "@logix/core"
import { isDevEnv } from "./env.js"
import { makeModuleActions, type ModuleRef } from "./ModuleRef.js"

type RuntimeKey = object
type ParentRuntimeKey = object
type ModuleKey = object

const getOrCreateWeakMap = <K extends object, V>(map: WeakMap<K, V>, key: K, make: () => V): V => {
  const cached = map.get(key)
  if (cached) return cached
  const next = make()
  map.set(key, next)
  return next
}

const cacheByRuntime = new WeakMap<
  RuntimeKey,
  WeakMap<ParentRuntimeKey, WeakMap<ModuleKey, ModuleRef<any, any>>>
>()

export const resolveImportedModuleRef = <
  Id extends string,
  Sh extends Logix.AnyModuleShape,
>(
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
  parentRuntime: Logix.ModuleRuntime<any, any>,
  module: Logix.ModuleInstance<Id, Sh>,
): ModuleRef<Logix.StateOf<Sh>, Logix.ActionOf<Sh>> => {
  const byParent = getOrCreateWeakMap(
    cacheByRuntime,
    runtime as unknown as RuntimeKey,
    () => new WeakMap<ParentRuntimeKey, WeakMap<ModuleKey, ModuleRef<any, any>>>(),
  )
  const byModule = getOrCreateWeakMap(
    byParent,
    parentRuntime as unknown as ParentRuntimeKey,
    () => new WeakMap<ModuleKey, ModuleRef<any, any>>(),
  )
  const cached = byModule.get(module as unknown as ModuleKey)
  if (cached) {
    return cached as ModuleRef<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>
  }

  const importsScope = (parentRuntime as any)?.__importsScope as
    | {
        readonly get: (module: Logix.ModuleInstance<any, any>) => Logix.ModuleRuntime<any, any> | undefined
      }
    | undefined

  const childRuntime = importsScope?.get(module)
  if (childRuntime) {
    const dispatch = (action: Logix.ActionOf<Sh>) => {
      runtime.runFork(
        (childRuntime.dispatch as (a: Logix.ActionOf<Sh>) => Effect.Effect<void, any, any>)(action),
      )
    }

    const actions = makeModuleActions(dispatch)

    const ref: ModuleRef<Logix.StateOf<Sh>, Logix.ActionOf<Sh>> = {
      runtime: childRuntime as any,
      dispatch,
      actions,
      imports: {
        get: (m: any) => resolveImportedModuleRef(runtime, childRuntime, m),
      },
      getState: childRuntime.getState,
      setState: childRuntime.setState,
      actions$: childRuntime.actions$,
      changes: childRuntime.changes,
      ref: childRuntime.ref,
    }

    byModule.set(module as unknown as ModuleKey, ref as ModuleRef<any, any>)
    return ref
  }

  const parentId =
    typeof (parentRuntime as any)?.moduleId === "string"
      ? String((parentRuntime as any).moduleId)
      : "<unknown parent moduleId>"

  const tokenId = String(module.id)
  const parentRuntimeId =
    typeof (parentRuntime as any)?.id === "string"
      ? String((parentRuntime as any).id)
      : "<unknown parent runtimeId>"

  const fix = isDevEnv()
    ? [
        "- Ensure the child is imported in the same scope.",
        `  Example: ${parentId}.implement({ imports: [${tokenId}.impl], ... })`,
        "- Ensure parentRuntime is an instance scope (not a ModuleTag singleton).",
        "  Example: useModule(ParentImpl, { key }) / useModule(ParentImpl) / useLocalModule(ParentModule, ...)",
        "- If you intentionally want a singleton (not an imported child), use useModule(Child.module) (ModuleTag) in the current React runtime environment.",
        "- If you intentionally want the root provider singleton (ignore RuntimeProvider.layer overrides), use runtime.runSync(Root.resolve(Child.module)).",
      ]
    : []

  const err = new Error(
    isDevEnv()
      ? [
          "[MissingImportedModuleError] Cannot resolve imported module from parent imports scope.",
          "",
          `tokenId: ${tokenId}`,
          "entrypoint: react.useImportedModule/imports.get",
          "mode: strict",
          `startScope: moduleId=${parentId}, runtimeId=${parentRuntimeId}`,
          "",
          "fix:",
          ...fix,
        ].join("\n")
      : "[MissingImportedModuleError] imported module runtime not found",
  )

  ;(err as any).tokenId = tokenId
  ;(err as any).entrypoint = "react.useImportedModule/imports.get"
  ;(err as any).mode = "strict"
  ;(err as any).startScope = {
    moduleId: parentId,
    runtimeId: parentRuntimeId,
  }
  ;(err as any).fix = fix

  err.name = "MissingImportedModuleError"
  throw err
}
