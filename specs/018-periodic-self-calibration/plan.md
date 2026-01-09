# Implementation Plan: 018 定期自校准（库侧默认值审计 + 用户侧运行时自校准）

**Branch**: `[018-periodic-self-calibration]` | **Date**: 2025-12-20 | **Spec**: `specs/018-periodic-self-calibration/spec.md`
**Input**: Feature specification from `/specs/018-periodic-self-calibration/spec.md`

## Summary

本特性包含两条互补跑道：

1. **库侧默认值审计**：可周期性运行的审计流程，基于固定工作负载评估“当前库内置默认值 vs 候选集合”，输出“是否建议更新内置默认值”的结论与证据（不确定性/风险提示）。

2. **用户侧运行时自校准**：默认关闭（opt-in），由**应用开发者**显式启用；在终端用户真实环境中探索候选控制面参数并产出“本机推荐配置”，以应用侧默认覆盖生效并可回退；不修改库内置默认值。默认采用 **Worker First + Synthetic Workloads**，只在 Worker 不可用或开发者显式要求跑主线程/DOM 样本时，才降级到“主线程 idle 切片”。

## Code-level Verification（Review 摘要）

经代码级验证，可行性通过（Green）：

- RuntimeProvider Override：`packages/logix-react` 的 `RuntimeProvider` 支持通过 `layer` 合并 Context 到 Runtime Scope，因此“用户侧推荐配置覆盖”可以完全通过传入覆盖 Layer 实现，无需修改 `RuntimeProvider` 源码。
- Core Dynamic Config：`packages/logix-core` 的 `StateTransactionRuntimeConfig` 已包含 `traitConvergeOverridesByModuleId`，Runtime 内核原生支持按 moduleId 动态调整 converge 行为，无需新增 API。
- Workload 复用（Partial）：已将 watchers/diagnostics 相关 workload 抽取到 `packages/logix-react/src/internal/perfWorkloads.ts` 并由 014 的 browser 测试复用；但 converge synthetic workload 仍在 `packages/logix-react/test/browser/perf-boundaries/converge-runtime.ts` 与 `examples/logix-react/src/demos/PerfTuningLabLayout.tsx` 重复定义，需按 `tasks.md` Phase 2（T003–T005）收口后才算“单一事实源”。

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.x（ESM）
**Primary Dependencies**: `effect` v3、`@logixjs/core` / `@logixjs/react` / `@logixjs/devtools-react`；示例场景使用 Vite + React
**Storage**: 审计/校准产物均支持 JSON 导出；用户侧可选 localStorage 保存最近一次推荐与运行历史
**Testing**: Vitest（Node）+ `@effect/vitest`（Effect-heavy）；Vitest browser mode（Playwright）用于浏览器 perf 跑道
**Target Platform**: Node.js 20+（脚本/CI）+ 现代浏览器（校准运行环境）
**Project Type**: pnpm monorepo（packages + examples + scripts）
**Performance Goals**:

- `off`：保持近零额外开销（不新增默认启用的 O(n) 扫描与显著分配）
- `on`：校准默认在安全窗口运行（优先 Worker，必要时主线程 idle 切片），并提供可暂停/可取消能力；暂停响应延迟可控（例如 < 100ms）
- 推荐判断口径：`commit wall-time` 的 median/p95 + `outcome`（禁止推荐 `Degraded`）；必须显式标注波动/不可比样本

**State Hydration Strategy（State Sync）**:
- 校准 workload 默认不依赖业务 State（synthetic + fixtures），避免主线程 structured-clone 的同步阻塞风险。
- 若需要在 Worker 校准中运行“贴近业务”的 workload：必须显式声明 hydration 策略，仅传输最小 State slice 或 action log；大二进制数据必须使用 Transferable；无法满足时必须降级为主线程 idle 切片或跳过该 workload。

**Constraints**: 统一最小 IR + 稳定标识；事务窗口禁 IO；诊断事件 Slim & 可序列化；自动策略“保守可解释、证据不足必回退”

**Scale/Scope**: 本期仅覆盖 013 控制面中与 converge 直接相关旋钮（requestedMode、budget/decisionBudget、可选 moduleId 粒度覆盖），并复用 014/017 已定义的 workloads 与报告口径；不扩展到缺少证据口径的内置参数

## 用户侧“闲时自校准”方案（细化）

目标：在用户真实设备环境中**周期性探索候选配置**，但对交互体验做到“可暂停/可取消、默认不打扰”。这里把“闲时”定义成**主线程交互低压窗口**，而不仅仅是“把计算放进 Worker”。

前提与边界：

- “用户侧”这里的“用户”指 **使用 Logix 开发应用的程序员（App Developer）**，不是终端消费者；能力默认关闭，必须显式 opt-in。
- **Worker First**：默认只在 Worker 运行校准，且默认仅运行 Synthetic Workloads（来自 fixtures，不依赖业务 State）。
- 仅当 Worker 不可用（少数旧环境）或开发者明确要求跑 UI/DOM 样本时，才允许走主线程 idle 切片模式；并且 UI/DOM 样本必须被标记为“非 Worker 口径”，不能与 Worker 样本混为同一结论。

### 1) 闲时（Idle）判定：多信号合取，默认保守

主线程维护一个 `IdleGate`（仅用于“是否允许 Worker 继续跑”，不做重计算）：

- **交互信号**：监听 `pointerdown/keydown/wheel/scroll/touchstart` 等事件更新 `lastInteractionAt`；满足 `now - lastInteractionAt >= interactionGuardMs` 才允许继续。
- **页面状态**：`document.visibilityState !== "visible"` 或 `!document.hasFocus()` 时默认暂停（避免后台偷跑与节流导致结果不可比）；可作为策略开关允许“后台低速跑”。
- **输入待处理（可选增强）**：若浏览器支持 `navigator.scheduling.isInputPending`，在每次允许继续前检查一次，若为 true 则暂停/让步。
- **Idle Window 触发**：用 `requestIdleCallback` 作为“允许窗口”的触发源（fallback 到 `setTimeout`）；只在 `deadline.timeRemaining()` 高于一个小阈值（例如 ≥ 10ms）时发放 Worker 时间片。

> 约束：IdleGate 的计算必须是 O(1) 且同步开销极小；任何可能导致 structured-clone 的数据准备不得在这里做。

### 2) 主线程 ↔ Worker 的“租约式”协作调度（避免 Worker 抢核导致间接掉帧）

即使计算在 Worker，CPU/温控/省电模式也会让 Worker 影响主线程的可用时间片。因此采用“租约（lease）”模型：

1. 主线程在每个 idle 回调中，计算本轮允许 Worker 使用的时间片 `leaseBudgetMs`（例如 `min(50, deadline.timeRemaining() * 2)`，具体参数由策略决定）。
2. 主线程向 Worker 发送 `resume({ leaseBudgetMs })`；若不满足 IdleGate，则发送 `pause({ reason })`。
3. Worker 侧校准逻辑按 `leaseBudgetMs` **分片推进**：
   - 每个候选/每个 workload/每个 batch 都是可中断边界（Effect Fiber）；
   - 到达预算上限或收到 `pause/cancel` 时立刻让出（`Fiber.interrupt` / 协作式 yield），并回传 `progress`。
4. 主线程不会在 busy 状态下频繁唤醒 Worker；Worker 在无租约时处于等待，不自旋。

这套机制让“闲时自校准”的节奏由主线程掌控，从而把**间接掉帧风险**（抢核/热降频）收敛到可解释的策略参数上。

### 3) 暂停/恢复/取消：状态机与响应目标

- **状态机**：`idle -> running -> paused -> running -> completed|cancelled|failed`。
- **暂停触发**：任何交互信号命中 `interactionGuardMs`、输入待处理、页面不可见/失焦、或达到策略节流条件，均触发 `pause`。
- **取消触发**：用户显式取消、超过 `maxCalibrationDurationMs`、或连续多次无法获得 idle 租约（视为“当前不适合校准”）则取消并标注原因。
- **响应目标**：主线程发出 `pause/cancel` 后，Worker 在“下一个可中断边界”内停止推进，并回传可序列化的 `progress`（不要求保留完整中间态，但要保证可解释）。

### 4) 周期与节流：把“需要重校准”转成可审计策略

复用 `CalibrationPolicy`：

- `minIntervalMs`：两次校准之间的硬间隔（避免频繁后台跑）。
- `ttlMs`：推荐过期时间（到期才允许进入 “eligible”）。
- `interactionGuardMs`：交互保护窗口（决定“闲时”的最小静默期）。
- `maxCalibrationDurationMs`：单次校准总预算（超出即取消并写入不确定性）。

失效条件最小集合（必须可审计、可解释）：

- **版本变化**：`@logixjs/*` 版本或应用 buildId 变化（避免跨版本误用旧推荐）。
- **环境变化**：`userAgent` / `hardwareConcurrency` / `deviceMemory` 变化（或变化超阈）。
- **观测信号**：连续 N 次无法完成校准（超时/无 idle 租约/失败），或推荐在轻量 smoke check 下触发 `Degraded` / 硬门失败 / 波动超阈。

每次调度决策需要写入 Slim 事件/记录：为什么触发、为什么判定过期、为什么暂停、为什么跳过（例如“交互活跃”“不可见”“冷却期未到”“版本变化”“环境变化”“健康检查回归”）。

### 5) 与 State Sync 风险的配合（关键）

- Worker 校准默认只使用 `packages/logix-react/src/internal/perfWorkloads.ts` 中的 synthetic workloads，不请求业务 State。
- 若某 workload 必须依赖业务 State：必须在策略中声明其 hydration 方式与数据上限，并把“hydrate 是否发生 / 发送的字节量级 / 是否使用 Transferable”写入 evidence；否则该 workload 在用户侧校准中必须标记为 `skipped`。

### 6) 开发者如何“主动开启”（Opt-in 入口）

原则：默认关闭；**必须由应用开发者显式开启**，且必须可随时关闭/回退。

- **MVP（落在 `examples/logix-react`）**：把 018 的 `enabled` / `autoApply` / `persist` 等开关与运行入口，**作为 013 控制面面板的一部分**展示（同一张卡片/同一处配置中心），避免出现两套“调参入口”。
  - 013：手动 overrides（RequestedMode / budgets / moduleId patch）
  - 018：自校准产出 recommended overrides（默认不自动应用，除非开发者勾选 `autoApply`）
  - **优先级**：手动 overrides > recommended overrides > builtin defaults
  - 落点：`examples/logix-react/src/sections/ConvergeControlPlanePanel.tsx`（同一面板内完成：开启/运行/暂停/取消/应用/回退/导出）。
- **应用集成（建议形态）**：提供一个明确的 `calibration` 配置入口（enabled/autoApply/persist/strategy/TTL 等），由应用入口代码传入；该入口只负责“是否运行校准与如何调度”，不直接暴露 stateTransaction 细节（避免应用层也出现第二套 converge 语义）。
- **生效方式**：校准产出的推荐最终转换为 `StateTransactionOverrides`，并与手动 overrides 进行确定性合并（手动字段覆盖推荐字段）；合并后的单一 overrides 再转成 `Logix.Runtime.stateTransactionOverridesLayer(...)`，通过 `RuntimeProvider layer` 注入生效；从而保持 `RuntimeProvider` 本身不新增 stateTransaction props。

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- Answer the following BEFORE starting research, and re-check after Phase 1:
  - Intent → Flow/Logix → Code → Runtime：审计/校准属于“控制面策略”的上层能力，最终落到 Runtime 的 `stateTransaction` 配置；库侧审计评估内置默认值，用户侧校准产出应用侧覆盖（Provider override / runtime options）；证据来自 converge Trace（`traitSummary.converge`）与 perf 证据体系（`logix-perf-evidence`）。
  - 依赖 specs：`specs/013-auto-converge-planner`（控制面参数与策略）、`specs/017-perf-tuning-lab`（调参实验场与推荐口径）。性能证据口径与 runner 统一以 `logix-perf-evidence` 为事实源（collect/diff/tuning + matrix/schema）。
  - Contract 变更：不新增 DSL；新增/固化的是“审计/校准产物 schema + 默认值更新建议（库侧）+ 推荐应用方式（用户侧覆盖）”的契约与口径，需要与 `logix-perf-evidence` 的字段解释保持一致，避免并行真相源。
  - IR & anchors：不改变统一最小 IR；校准只消费既有 Static IR（stepCount 等）与 Dynamic Trace 字段（budget/outcome/reasons）。
  - 稳定标识：校准 runId/seq 必须可重建（localStorage 单调序号即可）；不得以随机/时间作为唯一锚点（时间仅作元信息）。
  - 事务边界：校准本身不进入事务窗口；任何 IO（持久化/导出）必须在事务外；不允许引入 SubscriptionRef 可写逃逸。
  - 性能预算：默认关闭无额外开销；如需在核心路径补齐证据字段或事件，将提供可复现的基线与测量方式，并把成本写入 `logix-perf-evidence` 的证据产物与本 plan。
  - 可诊断性：新增校准调度/结果事件必须 Slim & 可序列化；并声明 `off/light/full` 诊断级别下的额外成本。
  - 对外心智模型：关键词（≤5）+ 粗成本模型 + 优化梯子（默认 → 观测 → 缩小写入 → 稳定 rowId → 覆盖/调参 → 拆分/重构）必须与跑道/证据口径一致（统一在 `logix-perf-evidence` 内维护）。
  - Breaking changes：不引入对外 API 破坏；若 schema/字段口径调整，必须提供迁移说明（不做兼容层）。
  - Quality gates：`pnpm typecheck`、相关包 `pnpm -C packages/logix-core typecheck:test && pnpm -C packages/logix-core test`、`pnpm -C packages/logix-react typecheck:test && pnpm -C packages/logix-react test`（浏览器项目按需跑）。

## Project Structure

### Documentation (this feature)

```text
specs/018-periodic-self-calibration/
├── plan.md              # This file ($speckit plan command output)
├── research.md          # Phase 0 output ($speckit plan command)
├── data-model.md        # Phase 1 output ($speckit plan command)
├── quickstart.md        # Phase 1 output ($speckit plan command)
├── contracts/           # Phase 1 output ($speckit plan command)
└── tasks.md             # Phase 2 output ($speckit tasks command - NOT created by $speckit plan)
```

### Source Code (repository root)

```text
logix-perf-evidence（统一 perf 证据体系入口）
└── `pnpm perf calibration:*` / `pnpm perf tuning:*` / `pnpm perf collect` / `pnpm perf diff`

specs/017-perf-tuning-lab/               # 调参实验场与推荐策略（复用/对齐）

packages/logix-core/                     # 控制面参数/证据字段/内置默认值（必要时补齐 + 变更建议落点）
packages/logix-react/                    # RuntimeProvider / Provider override（推荐应用方式）
packages/logix-react/src/internal/perfWorkloads.ts  # 014/017/018 共用 workload fixtures（internal）
examples/logix-react/                    # Demo / Lab 页面（运行校准、导出、应用与回退）
```

**Structure Decision**: 以 `specs/018-*` 作为事实源，复用 `specs/017` 的 tuning lab；perf 证据体系统一走 `logix-perf-evidence`（不再新增第二套 runner/口径）。代码优先落在 `logix-perf-evidence` + `examples/logix-react`，仅在需要“可注入/可解释/可序列化证据字段”时最小化触及 `packages/logix-core`/`packages/logix-react`（避免侵入 runtime 热路径）。

## Complexity Tracking

本特性无宪章违规项，无需登记。
