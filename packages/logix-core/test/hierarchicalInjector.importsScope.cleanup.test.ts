import { describe, it, expect } from "vitest"
import { Context, Effect, Exit, Layer, Scope, Schema } from "effect"
import * as Logix from "../src/index.js"

describe("HierarchicalInjector ImportsScope lifecycle", () => {
  it("attaches a minimal imports-scope injector and clears it on Scope.close", async () => {
    const Child = Logix.Module.make("HierImportsScopeChild", {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { noop: Schema.Void },
    })

    const Parent = Logix.Module.make("HierImportsScopeParent", {
      state: Schema.Struct({ ok: Schema.Boolean }),
      actions: { noop: Schema.Void },
    })

    const ChildImpl = Child.implement({
      initial: { count: 0 },
    })

    const ParentImpl = Parent.implement({
      initial: { ok: true },
      imports: [ChildImpl],
    })

    await Effect.runPromise(
      Effect.gen(function* () {
        const scope = yield* Scope.make()
        let parentRuntime: any
        try {
          const context = yield* Layer.buildWithScope(
            ParentImpl.layer as Layer.Layer<any, any, any>,
            scope,
          )

          parentRuntime = Context.get(
            context as Context.Context<any>,
            Parent as any,
          ) as any
          const childRuntime = Context.get(
            context as Context.Context<any>,
            Child as any,
          ) as any

          const importsScope = parentRuntime.__importsScope
          expect(importsScope).toBeTruthy()
          expect(typeof importsScope?.get).toBe("function")
          expect(importsScope.get(Child as any)).toBe(childRuntime)
        } finally {
          yield* Scope.close(scope, Exit.succeed(undefined))
        }

        // scope close 后必须释放引用，以便 React 卸载/HMR 场景回收。
        expect(parentRuntime?.__importsScope).toBeUndefined()
      }),
    )
  })
})
