import { Effect } from 'effect'
import type { ManagedRuntime } from 'effect'
import * as Logix from '@logix/core'
import { isDevEnv } from '../provider/env.js'
import { makeModuleActions, type ModuleRef } from './ModuleRef.js'

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
  WeakMap<ParentRuntimeKey, WeakMap<ModuleKey, ModuleRef<any, any, any, any>>>
>()

export const resolveImportedModuleRef = <Id extends string, Sh extends Logix.AnyModuleShape>(
  runtime: ManagedRuntime.ManagedRuntime<any, any>,
  parentRuntime: Logix.ModuleRuntime<any, any>,
  module: Logix.ModuleTagType<Id, Sh>,
): ModuleRef<Logix.StateOf<Sh>, Logix.ActionOf<Sh>, keyof Sh['actionMap'] & string, Logix.ModuleTagType<Id, Sh>> => {
  const byParent = getOrCreateWeakMap(
    cacheByRuntime,
    runtime as unknown as RuntimeKey,
    () => new WeakMap<ParentRuntimeKey, WeakMap<ModuleKey, ModuleRef<any, any, any, any>>>(),
  )
  const byModule = getOrCreateWeakMap(
    byParent,
    parentRuntime as unknown as ParentRuntimeKey,
    () => new WeakMap<ModuleKey, ModuleRef<any, any, any, any>>(),
  )
  const cached = byModule.get(module as unknown as ModuleKey)
  if (cached) {
    return cached as ModuleRef<
      Logix.StateOf<Sh>,
      Logix.ActionOf<Sh>,
      keyof Sh['actionMap'] & string,
      Logix.ModuleTagType<Id, Sh>
    >
  }

  const importsScope = Logix.InternalContracts.getImportsScope(parentRuntime as any)
  const childRuntime = importsScope.get(module as any)
  if (childRuntime) {
    const dispatch = Object.assign(
      (action: Logix.ActionOf<Sh>) => {
        runtime.runFork((childRuntime.dispatch as (a: Logix.ActionOf<Sh>) => Effect.Effect<void, any, any>)(action))
      },
      {
        batch: (actions: ReadonlyArray<Logix.ActionOf<Sh>>) => {
          runtime.runFork(
            (childRuntime.dispatchBatch as (a: ReadonlyArray<Logix.ActionOf<Sh>>) => Effect.Effect<void, any, any>)(
              actions,
            ),
          )
        },
        lowPriority: (action: Logix.ActionOf<Sh>) => {
          runtime.runFork(
            (childRuntime.dispatchLowPriority as (a: Logix.ActionOf<Sh>) => Effect.Effect<void, any, any>)(action),
          )
        },
      },
    )

    const actions = makeModuleActions(dispatch)

    const ref: ModuleRef<
      Logix.StateOf<Sh>,
      Logix.ActionOf<Sh>,
      keyof Sh['actionMap'] & string,
      Logix.ModuleTagType<Id, Sh>
    > = {
      def: module,
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

    byModule.set(module as unknown as ModuleKey, ref as ModuleRef<any, any, any, any>)
    return ref
  }

  const parentId = parentRuntime.moduleId

  const tokenId = String(module.id)
  const parentInstanceId = parentRuntime.instanceId

  const fix = isDevEnv()
    ? [
        '- Ensure the child is imported in the same scope.',
        `  Example: ${parentId}.implement({ imports: [${tokenId}.impl], ... })`,
        '- Ensure parentRuntime is an instance scope (not a ModuleTag singleton).',
        '  Example: useModule(ParentImpl, { key }) / useModule(ParentImpl) / useLocalModule(ParentModule, ...)',
        '- If you intentionally want a singleton (not an imported child), use useModule(Child.tag) (ModuleTag) in the current React runtime environment.',
        '- If you intentionally want the root provider singleton (ignore RuntimeProvider.layer overrides), use runtime.runSync(Root.resolve(Child.tag)).',
      ]
    : []

  const err = new Error(
    isDevEnv()
      ? [
          '[MissingImportedModuleError] Cannot resolve imported module from parent imports scope.',
          '',
          `tokenId: ${tokenId}`,
          'entrypoint: react.useImportedModule/imports.get',
          'mode: strict',
          `startScope: moduleId=${parentId}, instanceId=${parentInstanceId}`,
          '',
          'fix:',
          ...fix,
        ].join('\n')
      : '[MissingImportedModuleError] imported module runtime not found',
  )

  ;(err as any).tokenId = tokenId
  ;(err as any).entrypoint = 'react.useImportedModule/imports.get'
  ;(err as any).mode = 'strict'
  ;(err as any).startScope = {
    moduleId: parentId,
    instanceId: parentInstanceId,
  }
  ;(err as any).fix = fix

  err.name = 'MissingImportedModuleError'
  throw err
}
