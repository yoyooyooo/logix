# 4. `ModuleDef.live(initial, ...logics)`：生成 Live Layer

`ModuleDef.live` 负责把 Module 定义 + 初始 State + 一组 Logic 程序组合成可注入的 Layer：

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
