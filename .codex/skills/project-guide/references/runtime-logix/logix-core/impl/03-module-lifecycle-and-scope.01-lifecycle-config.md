# 1. ModuleRuntimeConfig.lifecycle 回顾

核心配置如下：

```ts
export interface ModuleRuntimeConfig<S, A, R = never> {
  initial: S
  logic: Effect.Effect<any, any, any>[]

  lifecycle?: {
    // Module 实例创建并挂载到 Scope 后立即执行
    // 若 Logic 中定义了多个 onInit，此处为它们的串行组合
    onInit?: Effect.Effect<void, never, R>

    // Module 所在 Scope 关闭前执行 (自动注册为 finalizer)
    onDestroy?: Effect.Effect<void, never, R>
  }
}
```

关键约束：

- `onInit` / `onDestroy` 的错误通道为 `never`：
  - 意味着：钩子内部必须自行处理错误（例如 log + 忽略），不能让错误冒泡破坏整个 Scope；
  - 若未来发现确有需要，可以放宽为 `E = any`，并在 Runner 侧捕获日志后忽略。
