# 4. `Module.live(initial, ...logics)`：生成 Live Layer

> 收敛说明：
> 当前实现里，这个入口仍主要表现为 `ModuleDef.live(...)`。
> 未来公开口径里，定义期对象统一收敛为 `Module`，因此本节按 `Module.live(...)` 叙述。

当前实现中的 `ModuleDef.live`，本质上负责把定义期模块 + 初始 State + 一组 Logic 程序组合成可注入的 Layer：

```ts
export const CounterLive = CounterDef.live(
  { count: 0 },
  CounterLogic,
);
```

语义：

- 内部会基于 Module 的 `stateSchema` / `actionSchema` 构造状态容器与 Action 流，并启动所有挂载的 Logic 程序；
- 在一个运行时 Scope 中启动所有传入的 Logic 程序（通过 `Effect.forkScoped` 等），并将相应的运行时实例注入 `Logic.RuntimeTag`；
- 对 React/应用 Shell 而言，只需把 `CounterLive` 提供给 Runtime（如 `RuntimeProvider` / 统一的模块 Hook），无需关心底层实现细节。
- `ModuleRuntime` 的具体实现与替换策略属于引擎实现层能力，如需自定义 Runtime，请参考 `../runtime/05-runtime-implementation.01-module-runtime-make.md` 中的「1.3 扩展点：自定义 ModuleRuntime 的边界」约定。

---
