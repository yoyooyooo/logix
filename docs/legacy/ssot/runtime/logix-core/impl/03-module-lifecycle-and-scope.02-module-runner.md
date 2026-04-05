# 2. Runtime 视角的 Module Runner

为了保证 `E=never` 的约束在运行时真正落地，Runner 必须对 lifecycle hook 进行安全包装。

## 2.1 安全包装器 (Foolproof Wrapper)

```ts
function safeLifecycleEffect<R>(
  id: string,
  hook: Effect.Effect<void, unknown, R> | undefined,
): Effect.Effect<void, never, R> {
  if (!hook) return Effect.unit

  return hook.pipe(
    Effect.matchCauseEffect({
      onSuccess: () => Effect.unit,
      onFailure: (cause) =>
        Effect.logError("Module lifecycle failed", { id, cause }).pipe(
          Effect.asUnit,
        ),
    }),
  )
}
```

## 2.2 Runner 实现伪代码

```ts
function ModuleRuntime.make<Sh extends Logix.ModuleShape<any, any>, R>(
  config: ModuleRuntimeConfig<Logix.StateOf<Sh>, Logix.ActionOf<Sh>, R>,
): Effect.Effect<ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>, never, R> {
  const { initial, logic, lifecycle } = config

  return Effect.gen(function* () {
    // 1. 构造 Logic 程序的组合
    const logicProgram = Effect.all(logic, { concurrency: "unbounded" as const })

    // 2. 在 scoped 环境中启动 Logic + 注册 finalizer
    const runtime = yield* Effect.scoped(
      Effect.gen(function* () {
        // 3.1 创建 ModuleRuntime（内部会使用 stateLayer / actionLayer / logicProgram）
        const moduleRuntime = yield* buildModuleRuntime(stateLayer, actionLayer, logicProgram)

        // 3.2 注册 onDestroy 作为 Scope finalizer (使用 safe wrapper)
        if (lifecycle?.onDestroy) {
          yield* Scope.addFinalizer(
            safeLifecycleEffect("module-destroy", lifecycle.onDestroy)
          )
        }

        // 3.3 运行 onInit (使用 safe wrapper)
        if (lifecycle?.onInit) {
          yield* safeLifecycleEffect("module-init", lifecycle.onInit)
        }

        return moduleRuntime
      }),
    )

    return runtime
  })
}
```

> **核心原则**：即使业务端误写了有错误通道的 Hook，Runner 也会吞掉并记录到日志；这类写法视为 bug，但不会影响其它 Module / Scope。
