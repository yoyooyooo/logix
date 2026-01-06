# Logix 最佳实践（面向 examples dogfooding）

> **Status**: Living
> **Scope**: 本仓库内以 `examples/logix` 为第一落点的工程最佳实践：写法、目录结构、Module 拆分与组合、Pattern 提炼与依赖注入。
> **Goal**: 让 examples 作为 Logix 的“真实业务样板”，既能跑通闭环、又能被提炼为可复用资产，并为未来迁移到 `apps/docs` 的用户文档做铺垫。

## 0. 裁决边界（避免并行真相源）

- **运行时语义 / 类型**：以 `.codex/skills/project-guide/references/runtime-logix/**` 与 `packages/logix-*` 的真实导出为准。
- **Pattern 资产形态**：以 `docs/specs/sdd-platform/ssot/design/pattern-system.md` 为准（当前共识：Pattern 是普通 `(input) => Effect` 函数，平台只包 metadata）。
- **本文裁决内容**：工程组织、命名与拆分策略、examples 的写法规范与“从示例到资产”的迁移路径。

## 1. 三类产物：Module / Process / Pattern

在 Logix 的工程落地中，建议把“会长大”的代码明确分成三类产物，避免把所有逻辑塞进一个巨大 Logic 或一个巨大的 Root：

1. **Module（领域模块，最小可演进单元）**
   - 关注：**身份 + 形状 + 局部逻辑**。
   - 典型 API：`Logix.Module.make`（得到 `ModuleDef`）→ `ModuleDef.logic(($)=>...)` → `ModuleDef.implement({ initial, logics, ... })`。
2. **Process（协作/编排进程，跨模块或长生命周期）**
   - 关注：**跨模块协作关系**、后台流程、协调器（Coordinator）。
   - 典型落点：Root `ModuleImpl` 的 `processes: []`（例如 `Logix.Process.link`）。
3. **Pattern（可复用行为积木）**
   - 关注：把“经常被 copy 的长逻辑”收敛为 **可测试、可组合** 的 Effect 程序。
   - 推荐形态：只定义 **Tag-only Service 契约**（插槽），不在 Pattern 内提供默认实现；实现由组合层注入。

> 直觉：**Module** 管“一个领域实体的边界”，**Process** 管“多个模块怎么协作”，**Pattern** 管“长逻辑如何复用”。

## 2. 黄金链路：ModuleDef → Logic → Impl → Root → Runtime

建议把 examples 与真实业务代码统一到同一条“可解释/可解析”的黄金链路上（也是平台侧 IR 对齐的主线）：

1. **ModuleDef（纯定义）**：只放 `state`/`actions` 的 Schema，别混入实例/IO/Env。
2. **Logic（可组合单元）**：`ModuleDef.logic(($) => Effect.gen(...))`，用 `$`（Bound API）表达联动与流程。
3. **ModuleImpl（可复用蓝图）**：`ModuleDef.implement({ initial, logics, imports?, processes? })`。
4. **Root（Composition Root）**：只做“装配”：imports / processes / layer，避免塞业务细节。
5. **Runtime（运行容器）**：`Logix.Runtime.make(rootImpl, { layer })`；React 用 `RuntimeProvider runtime={...}`；脚本用 `runtime.runPromise` 并确保 `dispose()`。

> 深入：`ModuleDef / Module / ModuleImpl / $` 的契约与差异见 `.codex/skills/project-guide/references/runtime-logix/logix-core/api/02-module-and-logic-api.md`。

### 2.1 Logic 两阶段（setup / run）是硬约束

在工程落地里最容易踩坑的是把 “run-only 的 `$` 能力” 用到了 setup 阶段：

- setup 阶段（含 `setup:` 段与 builder return 前的同步注册）只能做 **声明/注册**：`$.lifecycle.*`、`$.traits.declare(...)`、`$.reducer(...)` 等。
- run 阶段（`run:` 段或旧写法 `ModuleDef.logic(($)=>Effect.gen(...))` 的 Effect 主体）才允许 `yield* $.use(...)`、`$.onAction/$.onState/$.flow.from*`、IntentBuilder 的 `.run*Task/.mutate/.update` 等。
- `ModuleDef.logic<R>` / `ModuleDef.implement<R>` 的 `R` 填 **Tag 类型本身**（例如 `SpecboardApi`），不要写 `typeof SpecboardApi`。

最小模板（推荐显式写 `setup/run`，避免误解“哪段算 setup”）：

```ts
export const SomeLogic = SomeDef.logic<MyService>(($) => ({
  setup: Effect.sync(() => {
    // 只做声明/注册；禁止 $.use / $.onAction / $.onState / $.flow
    $.traits.declare(/* ... */)
  }),
  run: Effect.gen(function* () {
    const svc = yield* $.use(MyService)
    // 在这里挂 watcher/flow 并 yield* 它们
  }),
}))
```

如果遇到 `LogicPhaseError(kind="use_in_setup")`，说明把 `$.use/$.onAction/$.onState/$.flow` 等 run-only 调用了 setup；把该调用移到 `run` 即可。

> 规范入口（SSoT）：`.codex/skills/project-guide/references/runtime-logix/logix-core/api/02-module-and-logic-api.03-module-logic.md`（Phase Guard）。

## 3. 目录结构（推荐）

### 3.1 保持现状的“单文件场景”（适合快速回归/最小闭环）

当一个示例主要用于验证某个 API 或约束边界时，**单文件闭包**是最高性价比形态：

```
examples/logix/src/scenarios/<scenario>.ts
  - 1) 定义 ModuleDef（state/actions）
  - 2) 定义 Logic（ModuleDef.logic）
  - 3) 定义 Process（可选，Process.link）
  - 4) 组装 Root（imports/processes）
  - 5) 构造 Runtime + main（并确保 dispose）
```

要求：

- 场景文件头部用 `@scenario` 说明意图、运行命令、覆盖的能力点；
- 任何可复用片段不要“半抽不抽”：要么留在场景内，要么提炼到 `patterns/` 并至少被 2 个场景消费（见第 6 节）。
- IR/Parser 映射演示场景放在 `examples/logix/src/scenarios/ir/*`：用于对齐平台 IR/Parser，不作为业务“推荐写法”引用。

### 3.2 面向“真实业务写法”的多文件结构（适合沉淀可复用模块/服务）

当同一组模块/服务会被多个场景复用时，推荐按职责拆分为“领域模块 / 协作进程 / 运行装配”三层：

```
examples/logix/src/
  modules/
    <feature>/
      <Feature>.def.ts        # ModuleDef：state/actions schema（纯定义）
      <Feature>.logic.ts      # Logic：一个或多个逻辑单元（组合优于配置）
      <Feature>.impl.ts       # ModuleImpl：initial + logics + imports/processes(若为局部 root)
      service.ts              # 领域 Service Tag（接口 + Tag；不写实现）
      index.ts
  processes/
    <use-case>.process.ts     # 跨模块协作：Process.link / Coordinator
  patterns/
    <pattern>.ts              # 可复用 Pattern（(input)=>Effect），必要时定义 Tag-only 插槽
  runtime/
    root.impl.ts              # Composition Root：imports + processes（只做装配）
    layer.ts                  # Layer 组合：infra/service 的 Live 实现
  scenarios/
    <scenario>.ts             # 仍保留“可运行入口”，但只做装配与演示
```

> 原则：**模块代码不负责决定“是单例还是多实例”**；实例策略由组合根决定（见第 5.4 节）。

### 3.3 Feature-first（业务开发推荐：按功能纵切、就近聚合）

当你在真实业务仓库里按“功能/页面/用例”推进时，建议采用 **Feature-first**：把一个 feature 的 Logix 代码（Module/Process/局部 Pattern/Service Tag）尽量就近放在同一目录，减少跨目录跳转与“先找模块在哪”的认知开销。

核心原则：

- **feature 是最小可演进单元**：默认把“未来会一起改”的东西放在一起，而不是按技术分层拆散；
- **Root 仍然只做装配**：Runtime/Root 只负责 imports / processes / layer，不承载业务细节；
- **局部 Pattern 先私有、再上升**：只在 feature 内被使用的长逻辑先留在 feature 内；当被多个 feature/场景复用后，再提升到 `patterns/`（并通过复用门禁）。

推荐目录模板（示例名为 `customer-search`）：

```
src/
  features/
    customer-search/
      index.ts

      customerSearch.def.ts     # ModuleDef：state/actions（纯定义）
      customerSearch.logic.ts   # Logic：Fluent/Flow（组合优于配置）
      customerSearch.impl.ts    # ModuleImpl：initial + logics (+ 局部 imports/processes)

      service.ts                # 领域 Service Tag（只定义契约，不写实现）

      processes/
        coordinator.process.ts  # 该 feature 负责的跨模块协作（Process.link）

      patterns/
        debounceLatest.ts       # feature 内私有 Pattern（未复用前不进全局 patterns/）

  runtime/
    root.impl.ts                # Composition Root：聚合 feature 的 impl/processes
    layer.ts                    # Layer：集中提供服务实现（infra/adapters）

  patterns/                     # 跨 feature 复用的 Pattern（通过复用门禁）
    confirm.ts
    notification.ts
```

何时选择 3.2（分层）vs 3.3（feature-first）：

- **多人协作、feature 边界清晰**：优先 3.3（feature-first），把“改动面”收敛到一个目录树。
- **大量跨 feature 的基础设施/通用能力**：可以维持 3.2 的 `patterns/`、`runtime/` 等“横切层”，但仍推荐把领域模块按 feature 归类（不要堆在一个巨大 `modules/` 平铺目录）。

#### 3.3.1 最小可运行样板（逐文件）

本仓库提供了一个“可 typecheck、可直接运行”的 feature-first 最小闭环样板，用于防止最佳实践长期漂移：

- 运行入口：`examples/logix/src/scenarios/feature-first-customer-search.ts`
- feature 目录：`examples/logix/src/features/customer-search/*`
- Composition Root：`examples/logix/src/runtime/*`

逐文件最小写法（直接点开即可复用）：

- `examples/logix/src/features/customer-search/model.ts`：领域最小数据结构 + Schema
- `examples/logix/src/features/customer-search/service.ts`：Tag-only Service 契约（插槽）
- `examples/logix/src/features/customer-search/customerSearch.def.ts`：ModuleDef（state/actions）
- `examples/logix/src/features/customer-search/patterns/autoTriggerSearch.ts`：feature 内私有 Pattern（未复用前不进全局 patterns）
- `examples/logix/src/features/customer-search/customerSearch.logic.ts`：Logic（Fluent：debounce + runLatest；Action → State）
- `examples/logix/src/features/customer-search/customerSearch.impl.ts`：ModuleImpl（initial + logics）
- `examples/logix/src/features/customer-search/customerDetail.def.ts`：Detail ModuleDef（用于演示 Process.link 的跨模块协作）
- `examples/logix/src/features/customer-search/customerDetail.logic.ts`：Detail Logic（响应 action 更新 state）
- `examples/logix/src/features/customer-search/customerDetail.impl.ts`：Detail ModuleImpl
- `examples/logix/src/features/customer-search/processes/searchToDetail.process.ts`：Process.link（Search → Detail 的推荐协作写法）
- `examples/logix/src/features/customer-search/index.ts`：feature 出口（统一 re-export）
- `examples/logix/src/runtime/layer.ts`：Layer（集中提供 Service 实现）
- `examples/logix/src/runtime/root.impl.ts`：Root（imports/processes；只做装配）
- `examples/logix/src/scenarios/feature-first-customer-search.ts`：可运行入口（runtime.runPromise + dispose）

## 4. Module 拆分：边界、命名、协作

### 4.1 ModuleDef 保持“纯定义”

- `ModuleDef = 身份 + 形状`：只放 Schema（state/actions），不在这里做 IO、读配置、初始化外部单例。
- `state` 尽量是**最小可解释数据面**：避免把 UI 派生字段当成核心事实写入 state；派生优先通过 selector/计算视图完成。
- `actions` 命名建议具备稳定的“领域语言”：
  - 示例工程可用 `"domain/verb"` 风格（如 `cart/addShippingFee`），真实业务建议进一步收敛为稳定约定（避免同义 action 泛滥）。

#### 4.1.1 Reducers：优先 `immerReducers`（少样板 + 更好推导）

- **推荐**：在 `Module.make({ immerReducers })` 里直接写 draft 风格 mutator（payload-first）：`(draft, payload) => { ... }`。
- **何时用 `reducers`**：需要“纯 reducer（state, action）”形态、或需要显式 `sink` 记录 patchPaths 时，再用 `reducers`（必要时配合 `Logix.Module.Reducer.mutate/mutateMap` 包装）。
- **避免 `draft: any`**：`Logix.Logic.Draft<T>` 已对齐 `mutative.Draft<T>`，常见写法（primitive、数组、index signature）可正常推导；动态 key 写入场景优先把 state 收敛为 `Record<string, V>`（或用 `satisfies` 显式挂上约束）。

### 4.2 Logic 拆分：组合优于配置（SRP）

- 不要把所有逻辑写进一个巨大 `Effect.gen`：拆成多个 Logic 单元再组合挂载。
- 每个 Logic 单元只负责一个“意图闭包”，例如：
  - 输入联动（L1）：`$.onState/$.onAction + .update/.mutate`
  - 异步流程：`$.onAction(...).runLatest(...)` 或 Flow/Stream 组合
  - 错误边界：在靠近“Service 调用”的边界收敛为语义化错误（不要直接冒泡 `unknown`）

> 参考：`.codex/skills/project-guide/references/runtime-logix/logix-core/guides/08-usage-guidelines.md`。

### 4.3 跨模块协作：用 Process 明确表达（L2）

跨模块协作优先用 `Process.link`（或 `Link.make`）显式表达“模块间的协作关系”，避免在某个 Module 内部偷偷操控另一个 Module：

- Process 的输入：一组明确的 `modules: [A, B, ...]`；
- 协作方式：监听 A 的 state/action 变化，驱动 B 的 action（而不是读/写 B 的内部 state 实现细节）。

对照样板：

- `examples/logix/src/scenarios/cross-module-link.ts`：Region → Cart 的协作示例
> 注：Search → Detail 的 Fluent/IR 映射演示（非 Process.link、非业务推荐）见 `examples/logix/src/scenarios/ir/coordinated-search-detail.ts`。

### 4.4 Root 是 Composition Root，不是“最大业务模块”

Root 的职责是“装配与托管”，而不是承载业务细节：

- Root `imports` 只引入各子模块的 `.impl`；
- Root `processes` 只引入跨模块协作进程；
- Root `layer`（或 Runtime 的 `layer`）集中注入服务实现（infra / 外部依赖）。

### 4.5 多实例策略：优先工厂模式

当需要“同一逻辑、多份数据”（列表项/多窗口/多实例对比）时，优先工厂模式（每次创建新的 Tag/ModuleDef），避免靠 Scope 覆盖导致协作与调试困难。

- 规范详解：`.codex/skills/project-guide/references/runtime-logix/logix-core/patterns/10-pattern-multi-instance.md`

## 5. 依赖注入与运行时组合：Layer-first

### 5.1 Service Tag 只描述契约，不要绑实现

- **领域服务**：放在模块目录下（如 `modules/order/service.ts`），Tag 表达领域语言（动词/能力）。
- **通用能力**：可放在 `patterns/*` 或更上层的 `infra/*`，但保持“Tag-only”。

实现策略：

- 示例场景可以用 `Effect.provideService`/`Layer.succeed` 直接在文件内闭环；
- 真实业务/可复用示例推荐在组合层集中提供 Layer（`runtime/layer.ts`），并由 Root/Runtime 注入。

### 5.2 React：把 Runtime 当成组合根（Fractal Runtime）

React 的最佳实践是“Root Module + Runtime 作为 Composition Root”，通过 `RuntimeProvider runtime={...}` 注入：

- 规范入口：`.codex/skills/project-guide/references/runtime-logix/logix-react/01-react-integration.04-di-and-entry.md`

### 5.3 CLI/脚本：确保资源可释放

示例脚本中构造的 Runtime 应具备清晰的生命周期：

- 运行结束必须 `dispose()`；
- 需要将 Promise 融入 Effect 时，优先使用 `Effect.tryPromise` 把 reject 映射到业务错误通道（不要把业务错误都当 defect）。

## 6. Pattern 提炼与复用验证

### 6.1 提炼规则：从“长逻辑”到“可复用积木”

当出现以下信号时，应该提炼 Pattern，而不是继续复制粘贴：

- 同一段“并发/取消/重试/错误回填”骨架在多个场景出现；
- 多个模块都需要同一种流程（如 Confirm → 执行危险操作 → 通知/回滚）。

Pattern 的产物优先是：

- `(input) => Effect` 的普通函数；
- 内部只依赖 Service Tag（插槽）与输入参数；
- 不强绑定具体 UI 框架与宿主实现。

### 6.2 复用验证约束（避免“伪复用”）

进入 `examples/logix/src/patterns/*` 的 Pattern，理想状态应至少被 **两个及以上** 场景消费；否则先留在场景内，避免过早抽象。

门禁：`pnpm -C examples/logix typecheck` 会执行 Pattern 复用检查（配置：`examples/logix/pattern-reuse.config.json`）。

参照：`docs/specs/sdd-platform/ssot/design/pattern-system.md`（第 5 节“工程约定”）。

## 7. examples dogfooding 清单（写完就能交接）

- 单文件场景可直接运行，且包含明确的“覆盖能力点”说明。
- 跨模块协作通过 Process 表达，Root 仅做装配（imports/processes/layer）。
- Service 契约（Tag）与实现分离；实现集中在组合层提供 Layer。
- 多实例优先工厂模式；避免把实例选择隐藏在 Scope 覆盖里。
- 可复用逻辑要么留在场景里，要么提炼为 Pattern 并完成最小复用验证。
