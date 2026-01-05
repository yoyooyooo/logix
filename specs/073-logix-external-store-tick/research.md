# Research: ExternalStore + TickScheduler（跨外部源/跨模块强一致）

## 0. 现状证据（Repo Reality）

### 0.1 React 侧：每模块一个 ExternalStore（潜在跨模块 tearing）

- `@logix/react` 当前通过 `useSyncExternalStoreWithSelector` 订阅模块运行时：
  - `packages/logix-react/src/internal/hooks/useSelector.ts`
  - store 实现为 per-module 缓存：
    - `packages/logix-react/src/internal/store/ModuleRuntimeExternalStore.ts`
    - `packages/logix-react/src/internal/store/ModuleRuntimeSelectorExternalStore.ts`
- 该模型能够保证 **单模块** 的订阅不漏更新（内部有 best-effort 的 `refreshSnapshotIfStale`），但当组件在同一次 render 同时订阅多个模块时：
  - 每个模块独立调度 notify（microtask/raf/timeout）
  - React 可能观察到 “模块 A 已更新而模块 B 仍是旧值” 的组合（跨模块 tearing）

### 0.2 Core 侧：事务闭包与 Trait 收敛已经具备“同窗派生”的基础

- `ModuleRuntime` 的事务闭包在提交前做 converge/validate/source-idle 同步（避免 tearing）：
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`
  - `packages/logix-core/src/internal/state-trait/source.ts`：`syncIdleInTransaction`（key 变空必须同步回 idle）
- `StateTrait.source` 已实现 keyHash gate/并发语义/两阶段写回（loading → async writeback），且严格避免在事务窗口内执行 IO。

### 0.3 DevtoolsHub 的 token 不变量（可复用的 tearing 防线）

- DevtoolsHub 使用 `snapshotToken` 作为订阅安全锚点，并要求 “token 未变则对外可见字段不得变化”：
  - `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
- 这为 RuntimeStore 的 `tickSeq`/token 设计提供了现成不变量与实现经验（microtask 批量通知、避免 per-event O(n) 拷贝）。

## 1. 核心裁决（Decisions）

### D1：同时交付 Level 1 + Level 2（同一条主线闭环）

**Decision**：本特性不拆分为“先 Level1 再 Level2”的两期；直接以 “Logix-as-React” 为目标一体化设计与实现。

**Rationale**：

- Level1 单独交付仍会留下跨模块 tearing（React 订阅模型未改），难以验证 “Route → State → Query” 等真实链路；
- Level2 没有 Level1 的外部输入归一化，则 tick scheduler 无法识别外部变化的依赖图，强一致会退化为黑盒。

**Alternatives considered**：

- 只做最佳实践（用户手写 `$.on(external).mutate` + `$.onState().refresh`）：依赖不可解释、难以 gate tearing 与性能。

---

### D2：ExternalStore<T> 必须有同步 getSnapshot；Stream 只能做语法糖

**Decision**：`ExternalStore<T>` 的最低契约为同步 `getSnapshot(): T` + `subscribe(listener): () => void`（或等价 Stream 形态），且 `getSnapshot` 必须无 IO。

**Rationale**：

- Tick 稳定化/事务闭包要求“同步、纯读”的 current；否则会把一致性问题推迟到异步边界，破坏可推导性与可解释链路；
- React external store 心智与实现（`useSyncExternalStore`）也基于同步 snapshot。

**Alternatives considered**：

- 直接接受 `Stream<T>`：Stream 没有可靠 current，需要额外约定（首帧即 current）或强制 initial；否则无法实现“原子 subscribe + getSnapshot”语义。

---

### D3：React 订阅点必须唯一：RuntimeStore（单一 ExternalStore）

**Decision**：`@logix/react` 的订阅从 per-module ExternalStore 迁移为 RuntimeStore（单一订阅点），`useSelector` 读取同一 `tickSeq` 的 runtime snapshot。

**Rationale**：

- 多 store 无法从根上消灭跨模块 tearing；
- 单 store 让 tick 成为唯一可解释单位：订阅/刷新/预算/降级都可用同一事件序列解释。

**Alternatives considered**：

- 维持 per-module store，并依赖 React `startTransition` 或业务“容忍撕裂”：无法满足本特性的 P1 目标与可解释性要求。

---

### D4：强一致只对 declarative IR 生效；黑盒 link 保留但降级

**Decision**：TickScheduler 只保证对“可识别 IR”无 tearing（ExternalStoreTrait + StateTraitProgram + DeclarativeLinkIR）。现有 `Process.link`/任意 Effect 黑盒仍允许存在，但不承诺进入强一致稳定化。

**Rationale**：

- 黑盒闭包不可推导依赖图，无法做稳定化与预算控制；
- 保留黑盒作为 escape hatch，避免阻塞旧写法，但通过语义边界倒逼系统性收敛。

---

### D5：Module-as-Source 进入同一套声明式图谱（模块组合）

**Decision**：支持把模块 A 的 selector 结果作为模块 B 的 ExternalStore 来源（对外心智：`ExternalStore.fromModule(...) + StateTrait.externalStore(...)`），并要求该依赖进入统一最小 IR，使 TickScheduler 能在同 tick 内稳定化它（避免 “订阅胶水升级版” 变成不可解释黑盒）。

**Rationale**：

- Module 本身天然符合 ExternalStore 的形状（sync current + subscribe signal），把它纳入同一抽象后，外部源/模块源都能以同一套声明式语言表达；
- 关键不是“能订阅”，而是“依赖可导出、可诊断、可预算”，否则最终会回到 tearing/不可解释的 state glue。

---

### D6：fromModule 不做值拷贝（按引用共享）

**Decision**：`ExternalStore.fromModule` 的 selector 返回值不会被 Runtime 自动 clone；下游 `StateTrait.externalStore` 写回按引用存储 selector 返回值本身。该能力用于“必要输入纳入收敛图谱”，禁止用它做全量 state 镜像；selector 应保持小、稳定、可解释。

**Rationale**：

- Runtime 核心路径不允许为“跨模块输入”引入隐式深拷贝/结构化拷贝：这会放大分配与 retained，直接冲击 perf budget 与可诊断性（事件体积/快照压力）。
- Logix 的状态快照心智为“只读 + 结构共享”：把 selector 返回值按引用传播更符合当前模型，也避免多份对象图导致的漂移与额外 GC 压力。

**Alternatives considered**：

- Runtime 自动深拷贝 selector 返回值：成本不可控且与“性能优先/诊断 Slim”冲突；需要隔离时应由 selector 显式投影/拷贝，并把成本纳入预算。

---

### D7：Trait 下沉边界（Static governance + IR 单一事实源）

**Decision**：ExternalStoreTrait 必须作为 `StateTrait` 的一等 kind 进入 `StateTraitProgram.graph/plan` 并参与 Static IR 导出；traits 只负责“模块内字段能力 + 静态治理 + IR 导出”，Runtime（TickScheduler/RuntimeStore）只消费 IR 做调度与快照一致性。禁止把 tick/React 订阅逻辑塞进 traits，也禁止 Runtime 通过 subscribe 黑盒“猜”Module-as-Source。

**Rationale**：

- 避免双真相源：若 React/Runtime 自己推导“哪些外部源来自 module/selector”，最终一定会与 trait 声明漂移（诊断与回放失真）。
- 静态治理前置：external-owned/单 writer/可识别性门禁必须在 build/install 阶段 fail-fast，否则错误会在热路径被放大成 tearing/回归。
- 便于跨内核复现：core-ng 只要遵循同一组 Runtime Services 合同并消费同一 Static IR，即可复现语义；不依赖“闭包内容”这种不可移植信息。

**Alternatives considered**：

- 把 ExternalStoreTrait 作为 runtime 层胶水（不进 StateTraitProgram/IR）：实现短期快，但长期必然产生不可解释黑盒与难以 gate 的回归（尤其 T035/Topic routing 与 Module-as-Source）。

## 2. 未决问题（需要在实现前拍板）

本次 `spec.md` 已明确方向，但仍有 3 类细节需要在 `tasks.md`/实现阶段固化为“可测口径”：

1. **Tick 边界策略细分**：默认 microtask + 显式 batch 已定，但 “平台事件（router/location）是否强制进入 batch” 需要结合 React 侧事件源确认。
2. **预算口径**：本 plan 给出 first-cut hard ceilings；实现完成后必须采集 baseline 并以 baseline 回写预算（默认 20% 相对阈值）。
3. **DeclarativeLinkIR 的最小形态**：如何将 ReadQuery/static deps 作为依赖事实源，并与 module handle/controller 的写侧安全组合（避免事务窗口写逃逸）。

## 3. 结论

本特性的关键不在“再加一个 helper”，而在于把外部输入与跨模块联动纳入统一最小 IR，并以 tick 作为唯一一致性与解释单位，最终在 React 侧通过单一 RuntimeStore 消灭 tearing。
