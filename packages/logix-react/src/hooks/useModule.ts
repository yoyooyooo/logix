import React from "react"
import { Logix } from "@logix/core"
import { Context, Effect, Layer, Scope } from "effect"
import { ReactModuleHandle, useModuleRuntime } from "../internal/useModuleRuntime.js"
import { useSelector } from "./useSelector.js"
import { useRuntime } from "../components/RuntimeProvider.js"
import {
  getModuleResourceCache,
  type ModuleResourceFactory,
  stableHash,
} from "../internal/ModuleResourceCache.js"

interface ModuleImplOptions {
  readonly deps?: React.DependencyList
  readonly key?: string
}

const isModuleImpl = (
  handle: unknown
): handle is Logix.ModuleImpl<any, any, any> =>
  typeof handle === "object" && handle !== null && (handle as any)._tag === "ModuleImpl"

export function useModule<Id extends string, Sh extends Logix.AnyModuleShape, R = never>(
  handle: Logix.ModuleImpl<Id, Sh, R>
): Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>

export function useModule<Id extends string, Sh extends Logix.AnyModuleShape, R = never>(
  handle: Logix.ModuleImpl<Id, Sh, R>,
  options: ModuleImplOptions
): Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>

export function useModule<Id extends string, Sh extends Logix.AnyModuleShape>(
  handle: Logix.ModuleInstance<Id, Sh>
): Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>

export function useModule<Sh extends Logix.AnyModuleShape>(
  handle: Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>
): Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>

export function useModule<Id extends string, Sh extends Logix.AnyModuleShape, R, V>(
  handle: Logix.ModuleImpl<Id, Sh, R>,
  selector: (state: Logix.StateOf<Sh>) => V,
  equalityFn?: (previous: V, next: V) => boolean
): V

export function useModule<Sh extends Logix.AnyModuleShape, V>(
  handle: ReactModuleHandle,
  selector: (state: Logix.StateOf<Sh>) => V,
  equalityFn?: (previous: V, next: V) => boolean
): V

export function useModule<Sh extends Logix.AnyModuleShape, V>(
  handle: ReactModuleHandle | Logix.ModuleImpl<any, Sh, any>,
  selectorOrOptions?: ((state: Logix.StateOf<Sh>) => V) | ModuleImplOptions,
  equalityFn?: (previous: V, next: V) => boolean
): Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>> | V {
  const runtimeBase = useRuntime()

  let selector: ((state: Logix.StateOf<Sh>) => V) | undefined
  let options: ModuleImplOptions | undefined

  if (isModuleImpl(handle)) {
    if (typeof selectorOrOptions === "function") {
      selector = selectorOrOptions
    } else if (selectorOrOptions && typeof selectorOrOptions === "object") {
      options = selectorOrOptions as ModuleImplOptions
    }
  } else {
    if (typeof selectorOrOptions === "function" || selectorOrOptions === undefined) {
      selector = selectorOrOptions as ((state: Logix.StateOf<Sh>) => V) | undefined
    } else if (selectorOrOptions && typeof selectorOrOptions === "object") {
      throw new Error("useModule(handle, options) 仅支持 ModuleImpl 句柄")
    }
  }

  let runtime: Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>

  if (isModuleImpl(handle)) {
    // ModuleImpl: 基于当前 Runtime 的 Resource Cache 构造局部 ModuleRuntime，
    // 并将其生命周期绑定到组件（Suspense 优先，支持异步初始化）。
    const cache = React.useMemo(
      () => getModuleResourceCache(runtimeBase),
      [runtimeBase],
    )

    // 默认：每个组件实例持有一份私有的 ModuleRuntime；
    // 若提供 options.key，则可在同一 Runtime 下进行共享；
    // deps 参与 stableHash，用于在依赖变化时触发重建。
    const deps = (options?.deps ?? []) as React.DependencyList

    // 每个组件实例生成一个稳定的本地 ID，确保在 StrictMode / 并发渲染下 key 不抖动。
    const instanceKeyRef = React.useRef<string | null>(null)
    if (instanceKeyRef.current === null) {
      instanceKeyRef.current = Math.random().toString(36).slice(2)
    }

    const baseKey =
      options?.key ??
      `impl:${handle.module.id ?? "ModuleImpl"}:${instanceKeyRef.current}`
    const key = `${baseKey}:${stableHash(deps)}`

    const factory = React.useMemo<ModuleResourceFactory>(
      () =>
        (scope: Scope.Scope) =>
          Layer.buildWithScope(
            handle.layer as Layer.Layer<any, any, any>,
            scope,
          ).pipe(
            Effect.map((context) =>
              Context.get(
                context as Context.Context<any>,
                handle.module as Logix.ModuleInstance<
                  any,
                  Logix.AnyModuleShape
                >,
              ) as Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>,
            ),
          ),
      [handle],
    )

    const moduleRuntime = cache.readSync(key, factory) as Logix.ModuleRuntime<
      Logix.StateOf<Sh>,
      Logix.ActionOf<Sh>
    >

    React.useEffect(() => cache.retain(key), [cache, key])

    runtime = moduleRuntime
  } else {
    // ModuleInstance | ModuleRuntime: 使用 useModuleRuntime 获取/复用运行时
    runtime = useModuleRuntime(handle)
  }

  if (selector) {
    return useSelector(runtime, selector, equalityFn)
  }

  return runtime
}
