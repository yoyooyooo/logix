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

## 2. 未决问题（需要在实现前拍板）

本次 `spec.md` 已明确方向，但仍有 3 类细节需要在 `tasks.md`/实现阶段固化为“可测口径”：

1. **Tick 边界策略细分**：默认 microtask + 显式 batch 已定，但 “平台事件（router/location）是否强制进入 batch” 需要结合 React 侧事件源确认。
2. **预算口径**：本 plan 给出 first-cut hard ceilings；实现完成后必须采集 baseline 并以 baseline 回写预算（默认 20% 相对阈值）。
3. **DeclarativeLinkIR 的最小形态**：如何将 ReadQuery/static deps 作为依赖事实源，并与 module handle/controller 的写侧安全组合（避免事务窗口写逃逸）。

## 3. 结论

本特性的关键不在“再加一个 helper”，而在于把外部输入与跨模块联动纳入统一最小 IR，并以 tick 作为唯一一致性与解释单位，最终在 React 侧通过单一 RuntimeStore 消灭 tearing。

