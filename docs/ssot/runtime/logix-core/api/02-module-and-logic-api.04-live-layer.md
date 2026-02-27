# 4. `build/createInstance/layer`（主路径）与 `live`（legacy）

O-021 后，模块实例化主路径统一为 `ModuleDef.build(...)` + `createInstance()`，并补充 Layer-first 的 `ModuleDef.layer(...)`：

```ts
export const CounterModule = CounterDef.build({
  initial: { count: 0 },
  logics: [CounterLogic],
})

export const CounterImpl = CounterModule.createInstance()

export const CounterLayer = CounterDef.layer({
  initial: { count: 0 },
  logics: [CounterLogic],
})
```

语义：

- `build` 负责把 Module 定义 + 初始 State + Logic 程序绑定为 program module；
- `createInstance()` 负责生成可注入 Runtime 的 `ModuleImpl` 蓝图；
- `layer(config)` 是 Layer-first 等价入口，语义等价于 `build(config).createInstance().layer`；
- 对 React/应用 Shell 而言，可直接 `useModule(CounterModule)`；对应用级 Runtime，可 `Runtime.make(CounterModule)` 或 `Runtime.make(CounterImpl)`。
- `ModuleRuntime` 的具体实现与替换策略属于引擎实现层能力，如需自定义 Runtime，请参考 `../runtime/05-runtime-implementation.01-module-runtime-make.md` 中的「1.3 扩展点：自定义 ModuleRuntime 的边界」约定。

legacy 说明：

- `ModuleDef.live(initial, ...logics)` 仍可作为迁移兼容入口，但不再是推荐主路径。
- 迁移目标是统一收敛到 `build/createInstance/layer`，避免 `live/implement/impl` 并行语义。

---
