# 2. 装配目标：从 Root ModuleImpl 到 { layer, processes }

运行时的目标是：给定一个 Root（`ModuleImpl` 或 `Module` wrap），生成一份可注入的 App Layer（包含 App 级 Env + 全局模块实例），并在该 Layer 所属 Scope 下运行 app-scope processes。

对于 App 级装配（内部 `AppRuntime.makeApp`），可以抽象为：

```ts
interface AppDefinition<R> {
  definition: LogixAppConfig<R>
  layer: Layer.Layer<R, never, never>
  makeRuntime: () => ManagedRuntime.ManagedRuntime<R, never>
}
```

当前主线的关键特性：

- Env 采用 **扁平合并**：Root ModuleImpl 的 imports/withLayer 合成会把相关 Tag 放到同一份 `Context` 环境中；
- **Tag 冲突强校验**：AppRuntime 装配期必须检查 Tag Key 冲突（ModuleTag + 可选 serviceTags），发现冲突立即报错，**禁止静默覆盖**；
- `exports` 仅用于 **类型/平台检查**，不做 Env 强隔离；
- processes 统一由 `ProcessRuntime` 安装/监督：结构化 Process/Link 走标准诊断链路；raw Effect 仅作为兼容 fallback（缺少静态 surface 与过程诊断）。
