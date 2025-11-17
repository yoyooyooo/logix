# 2. flatten 目标：从 ModuleDef 到 { layer, processes }

运行时的目标是：给定一棵模块树（App 视为根 ModuleDef），生成一份可注入的 Layer（包含所有 Provider/Infra）、以及在该 Layer 所属 Scope 下运行的 processes。

对于 App 级 Runtime，可以抽象为：

```ts
interface AppDefinition<R> {
  definition: ModuleDef<R>
  layer: Layer.Layer<R, any, never>
  makeRuntime: () => Effect.ManagedRuntime<R>
}
```

当前主线的关键特性：

- Env 采用 **扁平合并**：所有 imports / providers 的 Tag 都会出现在同一个 `Context` 环境中；
- **Tag 冲突强校验**：构建过程中必须检查 Tag Key 冲突，发现冲突立即报错，**禁止静默覆盖**；
- `exports` 仅用于 **类型/平台检查**，不做 Env 强隔离；
- `links` 和 `processes` 在运行时合并，但在元数据上严格区分，以便错误处理与可视化。
