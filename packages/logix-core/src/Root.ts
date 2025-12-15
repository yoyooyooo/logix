import { Context, Effect } from "effect"
import { isDevEnv } from "./internal/runtime/core/env.js"
import { RootContextTag } from "./internal/runtime/core/RootContext.js"

const tagIdOf = (tag: Context.Tag<any, any>): string =>
  typeof (tag as any)?.id === "string"
    ? String((tag as any).id)
    : typeof (tag as any)?.key === "string"
      ? String((tag as any).key)
      : "<unknown tag>"

/**
 * Root.resolve
 *
 * 显式从“当前 Runtime Tree 的根（root provider）”解析某个 Tag（ServiceTag / ModuleTag）。
 *
 * 语义：
 * - 固定读取 rootContext，不受更近 scope 的 Layer/Context 覆盖影响；
 * - 对 ModuleTag：只表达 root 单例语义（不用于多实例选择）。
 */
export const resolve = <Id, Svc>(
  tag: Context.Tag<Id, Svc>,
): Effect.Effect<Svc, never, any> =>
  Effect.gen(function* () {
    const root = yield* RootContextTag
    try {
      return Context.get(root.context, tag as Context.Tag<any, any>) as Svc
    } catch {
      const tokenId = tagIdOf(tag as Context.Tag<any, any>)
      const fix: string[] = isDevEnv()
        ? [
            "- Provide it when creating the runtime tree (Logix.Runtime.make(...,{ layer }) / ManagedRuntime.make(Layer.mergeAll(...))).",
            "- If you're in React and want the current runtime environment singleton, use useModule(ModuleTag).",
            "- Do not rely on nested RuntimeProvider.layer to mock Root.resolve.",
          ]
        : []

      const message = isDevEnv()
        ? [
            "[MissingRootProviderError] Cannot resolve Tag from root provider.",
            "",
            `tokenId: ${tokenId}`,
            "entrypoint: logic.root.resolve",
            "mode: global",
            "startScope: root",
            "",
            "fix:",
            ...fix,
          ].join("\n")
        : "[MissingRootProviderError] tag not found in root provider"

      const err = new Error(message)
      err.name = "MissingRootProviderError"
      ;(err as any).tokenId = tokenId
      ;(err as any).entrypoint = "logic.root.resolve"
      ;(err as any).mode = "global"
      ;(err as any).startScope = { kind: "root" }
      ;(err as any).fix = fix

      return yield* Effect.die(err)
    }
  })
