# 事务 + Trait 体系（语法糖支撑 & 智能化性能优化）

本报告回答一个核心问题：

> Trait + 事务体系是否在“支撑上层领域语法糖”的同时，把智能化优化性能做到极致？

结论先行：**方向正确、骨架强，但增量优化的信息质量不足，且事务边界与业务写法尚未被强制收敛**。如果你要“像 React 一样自动消化性能”，这里是第一优先级改造区域。

补充：`specs/007-unify-trait-system/review.md` 的残留 `[Next]`（Form errors 事实源口径、SC-005 基准、EvidencePack E2E 回放闭环）已合并进 `docs/reviews/99-roadmap-and-breaking-changes.md` 的 Phase 1/2。

## 现状：事务体系的关键语义（已经很强）

### 单实例 FIFO + 统一入口

`packages/logix-core/src/internal/runtime/ModuleRuntime.ts` 中：

- 每个模块实例维护一个 `txnQueue`（FIFO），所有入口（`dispatch`、非事务 fiber 的 `setState`、traits/source-refresh/devtools 等）都通过 `enqueueTransaction` 串行执行；
- `runWithStateTransaction(origin, body)` 在同步窗口内聚合所有写入，最后统一 `StateTransaction.commit`；
- `StateTransaction.commit` 具备 **0/1 commit**：无变化则不写底层 `SubscriptionRef`，有变化只写一次，并只发一次 `Debug.record({type:"state:update"})`。

这是“内部自动批处理”的核心，设计方向是对的。

### 事务内对 Trait 做收敛/校验/资源同步

同一文件中，在 commit 前会做（按当前代码顺序）：

- `StateTraitConverge.convergeInTransaction`：computed/link 的派生收敛（可选 dirty 模式、带预算）
- `StateTraitValidate.validateInTransaction`：check 校验（基于 reverse-closure 缩小范围）
- `StateTraitSource.syncIdleInTransaction`：source key 变空时同步回收 idle，避免 tearing/幽灵数据

这基本构成了“事务提交前的派生闭包（derived closure）”。

### “安装（install）”语义已发生迁移：computed/link/check 不再靠 watcher

`packages/logix-core/src/internal/state-trait/install.ts` 中已经明确：

- install 阶段**只保留** `source-refresh` 的注册（`installSourceRefresh`）；
- computed/link/check 由 Runtime 内核在事务窗口内统一处理（converge/validate）。

这是正确方向：**把派生收敛放进事务闭包，比在外部挂 watcher 更可控、更可优化**。但它也要求：

- 文档/注释中“computed/link 注册 watcher”的旧描述必须同步更新，否则会误导使用者；
- Trait Program/Plan 事实上已经是“可执行 IR”，需要正式化并成为统一降解目标（而不是藏在 internal hook 里）。

## Trait 体系：Program/Graph/Plan（可编译 IR 的雏形）

### `build` 阶段：归一化 + 图/计划生成

- `packages/logix-core/src/internal/state-trait/build.ts`：把 entry 归一化为 FieldTrait，并生成：
  - `Graph`：nodes/edges/resources（用于诊断、反向闭包、冲突检测）
  - `Plan`：steps（computed-update/link-propagate/source-refresh/check-validate…）

关键点：**deps 被定义为唯一依赖事实源**，这是做增量优化与可解释诊断的必要条件。

### `converge` 阶段：dirty 模式、预算、软降级

- `packages/logix-core/src/internal/state-trait/converge.ts`：
  - 通过 `dirtyPaths`（来自事务 dirty-set）与 entry.deps 做 overlap 判断，跳过无关 step；
  - `budgetMs` 超时则软降级：回退到 base，避免半成品状态；
  - dev 环境可做 deps-trace（实际读取 vs declared deps）并发出 diagnostic。

这是“智能化优化”的关键实现区，思路正确。

### `source` 阶段：keyHash gate + 并发语义 + replay

- `packages/logix-core/src/internal/state-trait/source.ts`：
  - Snapshot 模型（idle/loading/success/error）；
  - keyHash gate：只在 keyHash 匹配时写回，避免旧请求覆盖新 key；
  - list.item scope：配合 RowID 层处理数组 reorder 的 in-flight 归属；
  - replay 模式与 `ReplayLog` 结合，能重赛资源时间线。

这为“领域语法糖（Query/Form）”提供了很强的底座能力。

## 关键问题：智能化优化离“极致”还差什么？

### 1) dirtyPaths 的信息质量不足（最致命）

目前大量写入在事务里以 `path="*"` 记账：

- reducer 写入：`reason: "reducer"`，`path: "*"`（`ModuleRuntime.ts`）
- `runtime.setState`：`reason: "state:set"`，`path: "*"`（`ModuleRuntime.ts`）
- devtools time-travel：`path: "*"`（`ModuleRuntime.ts`）

这会导致：

- dirty converge 基本退化为“全量”；
- deps overlap 无法发挥作用；
- trait 的增量优化变成“只对 trait 自己产生的细粒度 patch 有效”，而对业务最常见写入无效。

**必须把 `*` 消灭掉**，让引擎能自动产出高质量 dirty-set（即使业务只写 reducer）。

### 1.1) 现状的另一层矛盾：Trait 已能产出字段级 patch，但业务最常见写入却是黑盒

Trait/source/validate 都能记录字段级 patch（包含 `path/from/to/reason/stepId/traitNodeId`），但 reducer / `$.state.update/mutate` / `runtime.setState` 仍然是整棵 state 替换，最终把 dirty-set 冲回 `*`。

这会形成非常糟糕的“二元世界”：

- 用 Trait 的部分非常快、非常可诊断；
- 用业务常规写法的部分反而无法优化、无法解释。

### 1.2) 根因：运行时写入已经大量使用 mutative，但 patch 还停留在占位 `*`

这不是“缺一个 diff 算法”，而是“写入契约还没收敛到 patch”：

- primary reducer：`ModuleRuntime.ts` 中明确写了注释“Patch path 暂时统一为 `*`”，并在 reducer 应用时构造 `{ path: "*", reason: "reducer" }`；
- `BoundApi.state.mutate` / `IntentBuilder.mutate`：虽然内部用 `mutative.create(...)` 生成了结构共享的 `nextState`，但最终仍然调用 `runtime.setState(nextState)`，其 patch 仍是 `{ path: "*", reason: "state:set" }`；
- devtools time-travel：同样走 `{ path: "*", reason: "devtools" }`；
- `StateTransaction` 的 `dirtyPaths` 只在 `updateDraft/recordPatch` 接收到“具体路径 patch”时才会细化，否则自然退化为 `*`。

结论：**只要业务写入仍以 `nextState` 作为第一公民，而 patch 只是附属信息，就很难做到“自动性能优化”**。

### 1.3) 最短路径：把 patch/dirty-set 接到“所有写入入口”，并将其变成第一公民

仓库里其实已经出现了“天然的 patch 生成器”：

- `mutative` 支持在不可变更新时生成 JSONPatch 风格 patches（并且可配置 path 格式）；
- core 内多处已经在用 `mutative.create(...)`（reducer mutate / state.mutate / trait converge/source/validate），意味着“为了 patch 引入新机制”的成本很低。

建议（不兼容，强烈偏向极致性能与可诊断性）：

1. **所有可写入口都必须能产出 patch**（至少 `dirtyPaths`，full 模式下还要有 patches）：primary reducer / `state.mutate` / trait/source 写回 / devtools 回放。
2. **禁止业务层 `state.update(nextState)` 这类黑盒写入**（或降级为“工具链专用 API”，只允许生成器显式给出 writes/patch）。
3. **统一 Path 表示**：不要长期使用 string 混杂 `foo.bar` 与 `foo[]` 与 `*`；至少要有一个统一的“内部路径 token 表示”，string 仅作为展示/序列化格式（否则数组、RowID 与冲突合并都会持续扭曲）。

### 2) 事务闭包的“正确性假设”会被逃逸通道破坏（必须封堵）

目前存在一个会直接让事务体系失效的逃逸通道：

- `ModuleRuntime.ref()` 与 `$.state.ref()` 在 selector 为空时返回**可写的** `SubscriptionRef`；
- 业务/Pattern 可以直接 `SubscriptionRef.update(ref, ...)` 写状态（示例见 `examples/logix/src/patterns/long-task.ts`、`examples/logix/src/scenarios/and-update-on-changes.ts`）。

这会导致：

- 写入绕过 `txnQueue`（不再串行、可能与事务并发交织）；
- 写入绕过 converge/validate/syncIdle（派生闭包被破坏）；
- 写入不产生 `state:update` Debug 事件（Devtools 时间线断裂）；
- patch/dirty-set 无从生成（智能化优化彻底失效）。

结论：**如果目标是“像 React 一样引擎自动消化性能”，这种逃逸必须在业务层被彻底禁止**（可保留给内部/工具链，但需要显式隔离与强警告）。

### 3) 事务边界与业务写法未被强制收敛

当前业务仍可以通过多种方式写 state（reducer / update / mutate / watcher 内多次写回），引擎无法假设“每次入口的写入是可分析的”，也就无法做更激进的优化（例如跨 watcher 合并、批量 patch）。

建议（不兼容）：强制收敛写入路径，让运行时可依赖“可推导的写入语义”。

### 3.1) 当前实现允许“在事务窗口内跑 Effect”（必须立刻禁止）

当前 `IntentBuilder.update` 的 reducer 签名允许返回 `Effect`，并且它是在 `runWithStateTransaction` 包裹下执行的——这意味着业务代码可以把 IO/异步逻辑跑进事务窗口，直接破坏你想要的三件事：

- 性能：事务窗口不再是同步/可合并的批处理边界；
- 诊断：txnId 对齐变成“一个可能跨越任意时间的纤程”；
- 正确性：会把“事务内读取的 draft/base”与外界并发写入混在一起，极易产生幽灵状态。

建议（不兼容）：

- `update/mutate` 在语义上必须是“纯同步写入”（只允许同步函数）；
- 一切 IO 都必须通过 `run*Task`（pending→IO→writeback 多事务）或 `run`（事务外）表达；
- `andThen` 这种“按函数参数个数自动分派”的 API 必须移除（否则 LLM/人类都会误入“把 IO 跑进 update”这类灾难路径）。

### 4) Patch/Dirty-set 的语义与稳定标识还未完全统一

Patch 里有 `reason/stepId/traitNodeId`，Debug 事件里有 `txnId/originKind/originName`，EffectOp 里还有 `linkId`、`trace` 等；但这些字段目前来自不同系统，组合关系仍偏松散。

建议：统一成“事务 IR”的强结构（见 `04-diagnostics-and-devtools.md`），并让 trait/source/task 等都只向 IR 汇报，不再各自发明字段。

### 5) 多实例隔离与作用域语义：必须移除全局 registry fallback

`packages/logix-core/src/internal/runtime/ModuleRuntime.ts` 维护了进程级 `runtimeRegistry`，`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts` 在 Env 查不到时会回退到全局 registry（并在 dev 里提示“多实例不稳定”）。

与此同时，`@logixjs/react` + core 已经为“分形模块 / imports scope”收敛了严格语义（strict-only）：

- core：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`：为每个模块实例保存 `__importsScope`（最小 injector：ModuleToken → ModuleRuntime）；
- react：`packages/logix-react/src/internal/resolveImportedModuleRef.ts`：strict-only 从 `parentRuntime.__importsScope` 解析子模块；root/global 单例语义统一走 `Root.resolve(Tag)`（或 `useModule(ModuleTag)` 的“当前运行环境单例”）。

结论：**core 侧全局 registry fallback 属于“向后兼容/便利性”遗留，应当删除**，否则永远无法在多实例场景下做到确定性与可解释性。

## “极致性能”改造建议（不兼容，优先级从高到低）

### A. 让运行时自动生成高质量 dirty-set（立刻做）

目标：业务写 reducer/trait 即可获得增量 converge，且无需增加心智。

方案方向（可组合）：

1. **Reducer patch 化**：将 primary reducer 的写入改为“字段级 patch 流”（而不是整棵 state 替换）
   - 可通过两条路径实现：
     - A1) reducer 只允许 mutative 风格（draft 改写），运行时在事务内直接收集 patch（路径+from+to）；
     - A2) reducer 仍返回 nextState，但运行时在 full instrumentation 下做结构 diff 生成 patch（dev/test 强、prod 可降级）。
2. **统一写入 API，禁止业务直接 `setState(nextState)`**：把业务层写入压到 reducer/trait，运行时只需要优化有限入口。
3. **dirty-set 作为基础设施**：即使 instrumentation=light，也必须维护 `dirtyPaths`（现在已有），但必须确保其不是 `*`。

### A.1) 建议的最终形态：写入路径 = Patch（而不是 NextState）

当写入路径统一为 patch 后，引擎可以同时得到：

- 增量 converge 的最小触发集合（dirty-set）
- Devtools 的可解释变更列表（patch list）
- 冲突检测与合并的基础（同路径多写者、覆盖优先级等）

这也是“所有高层抽象可降解到统一 IR”的必要前提。

### B. 把“同步反应”编译进事务闭包（减少事务次数）

目标：一个 action 导致的所有同步派生（reducer + trait/link + sync watchers）在 **同一笔事务** 内完成，只 commit 一次。

可选策略：

- 将 `$.onAction(...).update/mutate` 明确标记为“同步反应”，在 dispatch 事务内执行（禁止 IO、禁止 fork）；
- 其他 `run/runTask` 保持异步反应，必须在事务外执行，写回作为独立事务（TaskRunner 已具备）。

### C. 资源 Source 的调度进一步智能化

当前 source 已有 keyHash gate 与并发语义，但仍可进一步：

- 将 source 的触发条件（onMount/onKeyChange/manual）编译成 IR，避免在运行时散落判断；
- 引入 per-resource 的全局去重与共享（同 keyHash 的请求跨字段复用）；
- 把 Source 的写回也纳入 patch/dirty-set 统一模型，并与 txn 的 trigger/cause 强绑定。

### D. 预算与降级的策略要更“可解释”

现在 converge 超预算会回退 base，这是正确的安全策略，但需要同时做到：

- 产生明确的 diagnostic（包含 topN step、dirtyRoots、deps、触发入口）；
- 可配置“降级策略”（例如只跳过 computed，保留 link；或只在 dev 环境硬失败）。

## 需要统一的规则（建议写进 specs，并在代码硬实现）

- **deps 是唯一依赖事实源**：任何读取超出 deps 的行为必须被诊断（dev）并最终在 build 阶段硬失败（prod）。
- **单写者规则（single-writer per field）**：computed/link 对同一字段不得共存（`converge.ts` 已有 MULTIPLE_WRITERS），source/check 同理应纳入统一冲突检测。
- **事务窗口禁止 IO**：凡是可能跨越 IO 的逻辑必须使用 Task 模式拆分为多事务。
