# Research: StateTrait 状态事务与生命周期分层（003-trait-txn-lifecycle）

> 目的：补齐 StateTransaction / Instrumentation Policy / RuntimeProvider 之间的实现决策，为后续设计与编码提供统一依据。

## 1. StateTransaction 观测策略的配置入口与优先级

**Decision**

- 在 Runtime 级通过 `Logix.Runtime.make(root, { stateTransaction?: { instrumentation?: "full" | "light" } })` 配置应用级默认观测策略（`root` 可为 program module 或其 `.impl`）；
- 在 Module 级通过 `ModuleDef.implement({ ..., stateTransaction?: { instrumentation?: "full" | "light" } })` 为单个模块覆写观测策略；
- 优先级：**ModuleImpl 配置 > Runtime.make 配置 > 基于 `NODE_ENV` 的默认值**（`getDefaultStateTxnInstrumentation()`）。

**Rationale**

- Runtime 级配置便于一键切换整颗应用的观测强度（例如 CI / 性能压测时改为 `"light"`），符合“引擎优先”的集中配置原则；
- Module 级覆写可用于少数高频/性能敏感模块（如拖拽、动画）声明 `"light"`，避免为此引入全局策略分裂；
- 三层优先级（Module / Runtime / NODE_ENV 默认）既照顾现有实现（当前依赖 `getDefaultStateTxnInstrumentation()`），又避免再引入额外维度（例如 per-instance），控制复杂度。

**Alternatives considered**

- 仅在 Runtime.make 上配置，禁止 per-module override：
  - 简单但不利于“个别模块超高频”场景，需要通过拆 Runtime 或多 RuntimeProvider 解决，成本偏高；
- 仅在 Module.implement 上配置，Runtime 不给全局默认：
  - 会把“整体环境是 debug 还是 performance-first”的信息下沉到每个模块，破坏配置集中度；
- 在 React RuntimeProvider 上暴露独立开关：
  - 容易引入第三套事务模式（React-only），与 runtime-logix 契约冲突，被否决。

## 2. 高频交互（拖拽）下的事务语义

**Decision**

- 高频交互（如拖拽更新位置）**不得关闭 StateTransaction 或绕过事务直写**；
- 推荐在逻辑层采用“单步事务”模式：每次 pointer move 触发一次逻辑入口，只进行一次状态更新并立刻 commit；
- 性能优化通过「单步事务 + `"light"` instrumentation + 视图层节流/合并」组合实现，而不是引入非事务路径。

**Rationale**

- 事务模型是 Devtools 事务视图、时间旅行与审计能力的基础，一旦允许部分入口绕过事务，会出现双轨语义，复杂度与踩坑成本都很高；
- 当前 StateTransaction 内核本身开销可控，真正的大头在 React 渲染和复杂 Trait 逻辑，通过节流与 `"light"` 模式即可显著降低开销；
- 将“单步事务”视为逻辑写法约束而非 runtime 特殊分支，可以保留统一的事务边界与队列语义。

**Alternatives considered**

- 为高频模块提供“非事务模式”开关（直写 state，多次通知）：
  - 直接破坏「单入口 = 单事务 = 单次订阅通知」与 FIFO 队列语义，与当前 spec 目标冲突；
- 在同一模块内混用两种模式（部分 action 走事务，部分不走）：
  - Devtools 难以给出一致的事务视图，需要在 UI 做复杂解释，故放弃。

## 3. React RuntimeProvider 在事务观测中的职责

**Decision**

- `@logix/react` 的 `RuntimeProvider` **不引入新的 StateTransaction 模式或开关**，只透传底层 Runtime 与额外 Layer；
- 当传入 `runtime={ManagedRuntime}` 时，StateTransaction 观测策略完全由构造该 Runtime 的 `Logix.Runtime.make` 决定；
- 当仅传入 `layer={Layer}` 时，Provider 只在 Env 维度叠加 Service（如 Logger / DebugSink），不能改变事务是否存在或其观测粒度。

**Rationale**

- 保持 runtime-logix 的契约单一：观测策略的来源集中在 Runtime 与 ModuleImpl，而不是在 React 层再加一层配置；
- 避免出现“代码层配置是 full，但 React 层偷偷降为 light”这类难以排查的问题；
- RuntimeProvider 本身已经承担了 Scope 管理与 Layer 叠加职责，再托管事务策略会让其职责过重。

**Alternatives considered**

- 为 RuntimeProvider 增加 `stateTransactionInstrumentation` 属性：
  - 在多层 Provider 嵌套场景下优先级难以解释，同时破坏了 Runtime/Module 作为配置中心的约定；
  - 容易导致“React-only 事务模式”，与非 React 宿主的行为不一致。

## 4. StateTransaction 内核与配置的类型形状

**Decision**

- 沿用现有 `StateTransaction` 内核中的类型：
  - `StateTxnInstrumentationLevel = "full" | "light"`；
  - `StateTxnConfig`：构造 context 时的静态配置（moduleId / instanceId / instrumentation / captureSnapshots / now）；
  - `StateTxnRuntimeConfig`：运行时 config（已解析的 instrumentation / captureSnapshots / now 等）。
- Runtime 与 ModuleImpl 层新增的配置类型统一引用同一枚举类型，并保证语义相同：

```ts
export interface RuntimeStateTransactionOptions {
  readonly instrumentation?: "full" | "light"
}

export interface RuntimeOptions {
  // ...
  readonly stateTransaction?: RuntimeStateTransactionOptions
}

export interface ModuleImplementStateTransactionOptions {
  readonly instrumentation?: "full" | "light"
}

export interface ModuleImplementConfig<R> {
  // ...
  readonly stateTransaction?: ModuleImplementStateTransactionOptions
}
```

**Rationale**

- 复用已有 `StateTxnInstrumentationLevel`，避免在不同层出现类似但不完全一致的字符串字面量；
- 将 RuntimeOptions / Module.implement 的配置形状限制为最小集合（仅 instrumentation），避免在外层暴露过多 StateTransaction 内部实现细节；
- 通过统一的类型别名方便在 runtime-logix 文档与代码之间对照。

**Alternatives considered**

- 直接在 RuntimeOptions / Module.implement 上内联 `instrumentation?: "full" | "light"`：
  - 简单但不利于未来扩展（例如考虑更多观测级别或额外选项），使用 Options 对象更具演进弹性；
- 将 StateTransaction 的所有 config 字段（包括 `captureSnapshots` / `now`）全部透出到 RuntimeOptions：
  - 过度暴露内部实现，不符合 “LLM 易生成、易校验” 的最小 API 原则。

## 5. Dev / Prod 下默认观测级别

**Decision**

- 保持 `getDefaultStateTxnInstrumentation()` 现有行为：
  - 在非 production 环境（`NODE_ENV !== "production"`）默认 `"full"`；
  - 在 production 环境默认 `"light"`。
- 当 RuntimeOptions 或 ModuleImpl 显式给出 `instrumentation` 时，优先使用显式配置，不再依赖默认推导。

**Rationale**

- 当前实现已经基于 `getDefaultStateTxnInstrumentation()` 在 ModuleRuntime 中配置默认观测级别，行为稳定；
- Dev 环境下优先 `"full"` 有利于调试与 Devtools 使用，Prod 环境下默认 `"light"` 有利于减轻开销；
- 显式配置优先可以覆盖默认策略，用于在 dev 下压测 `"light"` 或在 prod 下针对关键模块保留 `"full"`。

**Alternatives considered**

- 在所有环境下一律使用 `"full"` 作为默认：
  - 增加生产环境的运行时开销，与“Effect 作为统一运行时”的性能约束不符；
- 在所有环境下一律使用 `"light"` 作为默认：
  - 会削弱 Devtools 的默认可见度，增加调试门槛。
