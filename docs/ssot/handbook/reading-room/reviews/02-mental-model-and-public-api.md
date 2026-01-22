# 用户心智与公共 API（Mental Model & Public API）

本报告聚焦两件事：

1. 业务开发者“应该怎么想”（概念是否最小完备、是否存在多套等价写法导致协作混乱）；
2. `@logixjs/core` 对外 API 的表面积/一致性/分层是否合理（并给出不兼容收敛建议）。

## 现状：公共出口与概念集合

### `@logixjs/core` 的公开入口

当前推荐使用：`import * as Logix from "@logixjs/core"`，并在 `packages/logix-core/src/index.ts` 下暴露：

- `Module`：领域模块定义、实现蓝图、Reducer 工具
- `Logic`：Env/Of/IntentBuilder（DSL 类型别名与运行时 Tag）
- `Bound`：`$`（Bound API）与跨模块只读访问
- `Flow` / `MatchBuilder`：流式编排工具
- `Runtime`：App Runtime 组装
- `Debug` / `Platform`：诊断与平台集成
- `StateTrait` / `TraitLifecycle` / `Resource` / `StateTrait` 等：跨领域能力的下沉接口

### 关键漂移点：文档结构 vs 代码结构

`docs/ssot/runtime/logix-core/impl/06-package-structure.md` 仍描述 `src/api|dsl|runtime` 的分层，但当前实际实现以 `src/*.ts` + `src/internal/**` 为核心，且大量关键逻辑直接落在 `internal/runtime/*`。

结论：**SSoT 漂移** 会直接破坏团队协作（尤其是 AI 时代依赖文档生成/校验/对齐的工作流）。

## 证据：同类能力的“多套写法”已经在文档/测试/示例中并存

> 这不是“未来可能发生”，而是现在已经发生：同一类问题存在多套等价写法，且它们同时被 docs/specs、tests 与 examples 使用。

### 1) “监听”入口：`$.on*` 与 `flow.from*` 并存

- Fluent / IntentBuilder 风格（业务更常见）：`$.onAction`、`$.onState`、`$.on(stream)`
  - `examples/logix/src/scenarios/and-update-on-action.ts`（Action → State）
  - `examples/logix/src/scenarios/and-update-on-changes.ts`（State → State）
  - `examples/logix/src/scenarios/agent-fluent-with-control.ts`（debounce + latest + service）
  - `packages/logix-core/test/Bound.test.ts`（onAction/update/mutate/run 等覆盖）
- Flow API 风格（与 Fluent 功能重叠）：`flow.fromState/fromAction` + `flow.run*`
  - `docs/ssot/runtime/logix-core/examples/05-matrix-basic.md` 明确以 `flow.fromState(...).pipe(flow.run(state.mutate(...)))` 作为“v3 标准模式”

结论：**两套入口表达同一件事（订阅变化 + 触发处理），团队将不可避免地产生分裂**：有人偏 Fluent，有人偏 Flow，最终无法收敛到“唯一最佳实践”。

### 2) “同步写 state”入口：reducer / update / mutate / ref 直写 并存

- Watcher 内直接写 state：`$.state.update` / `$.state.mutate` / `IntentBuilder.update/mutate`
  - `examples/logix/src/scenarios/agent-fluent-with-control.ts`（在 runLatest 的 handler 里多次 `$.state.update`）
  - `examples/logix/src/scenarios/and-update-on-action.ts` / `and-update-on-changes.ts`（onAction/onState → state.update）
  - `packages/logix-core/test/Bound.test.ts`（`.update` 与 `.mutate` 并存）
- “动态 primary reducer 注册”：`$.reducer(tag, reducer)`
  - `packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`（通过 runtime 内部 hook 注册）
  - `packages/logix-core/src/internal/runtime/ModuleRuntime.ts`（对重复/迟到注册做诊断）
- “静态 reducers”：`Module.make({ reducers: { ... } })`
  - `packages/logix-core/src/internal/runtime/ModuleFactory.ts`（将 reducers 映射为 `_tag -> fn` 并在 dispatch 前应用）
- 绕过事务体系的直写：`runtime.ref()` / `$.state.ref()` + `SubscriptionRef.update`
  - `examples/logix/src/scenarios/and-update-on-changes.ts`（demo 中直接对 `runtime.ref()` 写 results）
  - `examples/logix/src/patterns/long-task.ts`（长任务每秒 `SubscriptionRef.update`，完全绕过事务/patch/trait 收敛）
  - `examples/logix/src/scenarios/long-task-from-pattern.ts`（通过 `$.state.ref()` 交给 Pattern 持续写入）

结论：**同一类“状态变更”现在有至少四条路径**，而其中 `SubscriptionRef` 直写会直接破坏事务收敛、patch/dirty-set、Devtools 记录与可解释性（详见 `03-transactions-and-traits.md`）。

### 3) “异步任务”入口：手工拆分 vs `run*Task` 并存

- 手工拆分：`refresh` 入口 fork IO，再 dispatch success/failure action 走第二笔/第三笔事务写回
- `run*Task` 语法糖：同样的 pending→IO→writeback，但由引擎统一编排

两套写法在 `docs/ssot/runtime/logix-core/api/03-logic-and-flow.md` 中同时出现，并明确写了“等价”。

结论：这类“等价双写法”会导致：

- 代码审查无法给出明确准则（到底用哪一种才算正确）；
- 工具链/IR 降解复杂度翻倍（必须识别两种结构）。

### 4) “跨模块协作”入口：`$.use` / `Link.make` / Coordinator Module 并存

- `$.use(Module)`：返回 `ModuleHandle`，再用 `$.on($Handle.changes(...))` 拼装
  - `packages/logix-core/test/Bound.test.ts`（use + changes + $.on(stream)）
  - `examples/logix/src/scenarios/ir/coordinated-search-detail.ts`（CoordinatorModule 里 use 两个模块做联动）
- `Link.make({ modules }, ($) => ...)`：在模块外定义“胶水逻辑”，作为 processes 挂到 Runtime
  - `packages/logix-core/test/Link.test.ts`（root imports + processes）
  - `examples/logix/src/scenarios/cross-module-link.ts` / `link-multi-modules-by-id.ts`

结论：跨模块能力当前至少三套 API/心智，且它们的“作用域语义”不一致（尤其在多实例场景下，详见下文与 `05-react-and-sandbox-integration.md`）。

## 心智模型：最小完备集（建议）

为了达到“像 React 一样的声明式 + 内部自动性能优化”，业务侧需要被强制收敛到极少概念：

1. **Module**：领域边界与类型契约（state/actions/reducers/traits）
2. **Reducer（纯同步）**：唯一允许“同步改变 state”且必须可推导/可诊断
3. **Derived/Trait（声明式派生）**：computed/link/source/check 统一描述“推导与资源”
4. **Effect（异步/副作用）**：只能通过受控入口产生写回（Task 模式或显式 writeback）
5. **Runtime（组装）**：把模块与 Layer/进程组合到应用

> 关键原则：**同一类问题只能有一条首选路径**；其余写法要么禁用，要么降级为内部原语/生成器接口。

## 现状问题：同一场景多套写法（会扰乱团队协作）

### 1) 同步 state 变更：Reducer / `$.state.update` / `$.state.mutate` / `IntentBuilder.update/mutate`

目前运行时允许多种入口写 state。短期看灵活，长期会让团队无法形成“统一的最佳实践”，也让引擎无法做足够强的自动优化（例如 patch/dirty-set 推导）。

建议（不兼容）：

- **同步写入唯一入口：Reducer（Primary Reducer）**  
  `$.state.update/mutate` 仅保留在**事务上下文内部**作为实现细节，不作为业务推荐写法；
- `IntentBuilder.update/mutate` 只作为低层 DSL/生成器 API，不作为业务层推荐；
- 业务层禁止在 watcher 内做多次 state 写入（必须通过 reducer 或 trait 表达）。

### 2) “监听/触发”体系：`$.onAction` / `$.onState` / `$.on(Stream)` / `Flow.fromXxx`

当前既提供高层的 `$.onXxx` 也暴露 `Flow` 低层 API，且 `IntentBuilder` 上还堆了 `run/runLatest/runExhaust/runParallel/run*Task` 等多个维度的语法糖。

建议（不兼容）：

- 业务层只保留 `$.onAction` 与 `$.onState` 两个入口（其余统一视为工具链/生成器用）。
- 并发语义只保留一种“默认安全”的策略，其余通过显式 `TaskRunnerConfig`/IR 字段表达，避免“每个人随手选一个 run\*”。

### 3) Pattern/领域包（Form/Query/...）与 Trait 的边界

当前 `StateTrait` 既承担“声明式派生/资源”又承担“领域包统一下沉接口”的实验承载，容易把业务心智拉爆。

建议（不兼容）：

- 业务层只认“Trait = Derived”的概念；领域包（Form/Query）必须以“Trait 的可组合 IR”方式落地，而不是另起一套引擎。

## 需要明确裁决的“不兼容取舍”（建议直接硬编码进类型与 exports）

> 这里不是“偏好”，而是为了让引擎能够做强优化与强诊断，必须做的收敛裁决。

### A) `Flow.Api` 与 `IntentBuilder`：必须二选一作为业务层主入口

现状：两者都能表达“订阅 + 并发语义 + 执行”，而 `IntentBuilder` 内部其实也依赖 `FlowRuntime` 实现。

建议（偏向业务心智最小）：

- **业务层只保留 `IntentBuilder`（`$.onAction/$.onState/$.on`）**；
- `Flow.Api` 降级为“生成器/工具链 API”（不在 docs/examples 给业务展示），仅用于 IR/Parser/编排器输出代码；
- 同时将 `.andThen` 的“按函数参数个数自动分派（update vs run）”废弃，改为显式 `.update` / `.run`（避免歧义与 LLM 误判）。

### B) 跨模块协作：只保留一种“默认写法”，其余降级

建议的唯一默认写法（业务层）：

- 在某个“拥有者模块”（可以是空 state 的 CoordinatorModule）内部使用 `$.use(OtherModule)` 获取句柄；
- 所有跨模块写入都通过对方 actions（dispatch）完成；
  - `Link.make` 作为“工具链/平台 IR 承载”入口；业务侧默认只使用 `$.use`（imports 内 strict）。

### C) `state.ref()`：业务层必须禁止“可写 SubscriptionRef”

理由：它会让事务/trait/patch/Devtools 全部失去一致性基础。

建议：

- 业务层 `state.ref()` 只能返回只读 Ref（get + changes），禁止 update/set；
- 若确需“高频进度写回”，引擎应提供专用 API（例如可批处理的 `task/progress` 或 `transactionalRef`），保证写入仍进入事务队列。

## API 分层建议（可扩展、低表面积）

建议把对外 API 明确切成三层（并在 exports 上强制）：

- **业务层（白盒）**：唯一推荐写法（Module + Reducer + Trait + Task）
- **中间层（灰盒 DSL）**：强表达但安全，可诊断，可降解为 IR（供领域包/高级用户）
- **底层原语（黑盒/实现细节）**：只给工具链与生成器使用，禁止业务直接依赖

## 立刻可做的不兼容收敛点（清单）

- 明确哪些 API 是“业务推荐”，哪些是“生成器/工具链专用”，并在类型/exports 上做硬隔离。
- 消灭文档漂移：要么将代码迁回 `api|dsl|runtime` 结构，要么更新 specs 并明确 `src/internal/**` 的分层铁律。
- 统一 Tag 约定：把 `Context.GenericTag` 全部替换为 Tag class（与仓库约定一致），并明确 Tag 的稳定 key 策略（用于冲突检测与 Devtools 分组）。

## 明确的“早期遗留/过时点”（需要清理，否则持续制造心智噪音）

### 1) 文档中的 DSL 名称与真实 API 不一致（会直接误导用户/LLM）

- specs/文档中大量出现 `.then(...)` 链式写法（例如 `docs/ssot/platform/03-module-assets.md`、部分 scenario 注释），但当前 `IntentBuilder` 实际暴露的是 `.run/.update/.mutate/...` 与 `.andThen`（并且 `andThen` 还带 arity 隐式分派）。

建议（不兼容）：

- 业务层只保留一种链式语义，并强制所有文档与示例对齐；
- 如果要保留“then”作为语义名，建议把 `.andThen` 正式更名为 `.then` 且取消 arity 分派（否则 then/andThen 两套心智都存在）。

### 2) `Logic.RuntimeTag` 当前不在装配链路中提供（疑似遗留）

`packages/logix-core/src/Logic.ts` 导出 `RuntimeTag = Context.GenericTag("@logixjs/Runtime")`，而当前 `Module.logic`/`ModuleRuntime.make` 的装配主要提供的是“模块自身的 Tag（ModuleTag）”，并未看到对 `@logixjs/Runtime` 的注入。

结果：任何依赖 `yield* Logic.RuntimeTag` 的写法在当前实现下都不成立（除非调用方手工 provide）。如果这是“未来意图”，需要立刻补齐装配；如果是遗留，应立即移除以减少表面积。

### 3) `Module.make({ traits })` 的注释与实现矛盾

`packages/logix-core/src/Module.ts` 的注释写“traits 槽位运行时尚未消费”，但实际已经：

- 在 `make` 阶段构建 `StateTraitProgram`；
- 写入全局 registry（Devtools 用）；
- 通过包装 `implement` 注入一段内部 logic 在 setup 阶段 `StateTrait.install(...)`。

建议：要么更新注释并把这条路径“正式化”，要么移除这些隐式副作用并迁移到显式装配阶段（避免 Module 定义不再是纯定义）。
