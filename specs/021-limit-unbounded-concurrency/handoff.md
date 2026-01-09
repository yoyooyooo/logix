# Handoff: 021-limit-unbounded-concurrency × 020-runtime-internals-contracts 对齐检查

> 目的：由于“上下文不够”，把这次对 020 落地结果的复核结论、可复用落点、未决设计点与下一步执行计划固化到仓库，便于后续继续推进 021。

Date: 2025-12-22  
Scope: `specs/021-limit-unbounded-concurrency/`（并发护栏与预警：限制无上限并发）

## TL;DR（结论摘要）

- `specs/020-runtime-internals-contracts/` 已经把 021 所需的**并发控制面基础设施**落地（Tag/Overrides、RuntimeOptions 注入、resolver、RuntimeInternals.concurrency 等）。
- `specs/021-limit-unbounded-concurrency/tasks.md` 的 Phase 1/2 以及 US1 的“bounded concurrency（默认 16）”部分已与 020 结构对齐并已实现（任务已标 `[X]`）。
- 术语对齐：在 020 的实现与 internal contracts 中，“局部作用域覆盖”对应 `provider`（Effect provider overrides）；因此 021 的 `configScope` 与优先级口径应以 `provider > runtime_module > runtime_default > builtin` 为准（避免 `scope_override`/`provider` 漂移）。
- 外部评估结论一致：当前 bounded concurrency 仅把“无限 fork”的 OOM 风险转移为“无限排队”的 OOM 风险（`ModuleRuntime.txnQueue` 仍为 `Queue.unbounded()`）；因此 US1 的首要阻塞项是 T019（有界背压）与 T020（压力诊断避免 silent slowdown）。
- 021 仍缺的核心闭环是：
  1. **Lossless Backpressure**：入口积压有界（默认 4096）+ 达到上界时入口背压变慢 + 等待不进入事务窗口；
  2. **Diagnostics**：`concurrency::pressure` 预警（冷却/合并、可解释降级字段）；
  3. **Unbounded opt-in**：强制 `allowUnbounded=true` 才能生效 + 只提示一次的高严重度审计事件；
  4. **FR-008 模块销毁收敛**：destroy 时取消 in-flight 并行 fiber，避免“幽灵写回/泄漏”；
  5. 对应的压力/边界测试与用户文档。

---

## Update: US1 已完成（2025-12-22）

- 已完成并勾选：`specs/021-limit-unbounded-concurrency/tasks.md` 的 `T011–T015`、`T018–T021`。
- `dispatch` 的 lossless/backpressure publish 已移出事务窗口与 txnQueue 消费 fiber（避免 bounded PubSub 下的循环等待死锁）。
- `concurrency::pressure` 由 `packages/logix-core/src/internal/runtime/core/ConcurrencyDiagnostics.ts` 统一发射（实例作用域冷却/合并；`trigger.details` 至少包含 `configScope/limit`）。
- 修复一个被“事务内 enqueue 禁止”暴露出来的旧路径：list.item source refresh 的 IO fiber 需要显式 `Effect.locally(TaskRunner.inSyncTransactionFiber, false)`，否则后续写回会被误判为事务窗口内并被阻断（见 `packages/logix-core/src/internal/state-trait/source.ts`）。
- `packages/logix-core/src/internal/runtime/core/runtimeInternalsAccessor.ts` 修正了对 ModuleTag（函数对象）的识别，恢复 `Debug.getModuleTraits*` 在 test/build-env 下读取 `StateTraitProgram` 的能力。

US1 之后的主线：

- US2：unbounded opt-in gate（`allowUnbounded`）+ 一次性高严重度审计（`T022–T025`）。
- US3：诊断降级字段（`degradeStrategy/suppressedCount/...`）+ contracts 对齐测试 + 用户文档/SSoT 同步（`T026–T030`）。
- Polish：对外导出/quickstart/perf 证据（`T031–T034`）。

---

## Update: US2 已完成（2025-12-22）

- 已完成并勾选：`specs/021-limit-unbounded-concurrency/tasks.md` 的 `T022–T025`。
- `makeResolveConcurrencyPolicy` 增加 unbounded gate：只有 `allowUnbounded=true` 才允许 `concurrencyLimit="unbounded"` 生效；否则回退到裁决链上最后一次 bounded 值。
- 一次性审计诊断（实例作用域，只提示一次）：
  - `concurrency::unbounded_enabled`：effective unbounded 且 allow=true；
  - `concurrency::unbounded_requires_opt_in`：请求 unbounded 但未 allow，回退 bounded。
- 为了可解释性，policy 额外暴露字段级来源：`concurrencyLimitScope` / `allowUnboundedScope` / `requestedConcurrencyLimit` / `requestedConcurrencyLimitScope`。

---

## Update: US3 已完成（2025-12-22）

- 已完成并勾选：`specs/021-limit-unbounded-concurrency/tasks.md` 的 `T026–T030`。
- contracts 对齐：
  - 所有 `code` 以 `concurrency::` 开头的事件，`trigger.details` 严格对齐 `specs/021-limit-unbounded-concurrency/contracts/concurrency-diagnostic-details.schema.json`（`additionalProperties=false`，禁止额外字段），并通过 JSON 序列化硬门。
  - `concurrency::pressure` 的 `configScope` 语义收敛为“并发上限（limit）来源 scope”（即 `concurrencyLimitScope`），避免出现“limit 来自 builtin，但 configScope 显示 provider/runtime_default”这类误导。
- 诊断降噪/可解释：
  - 冷却窗口内重复 `concurrency::pressure` 合并；下次 emit 时携带 `degradeStrategy="cooldown"` 与 `suppressedCount`；
  - 补齐 `sampleRate/droppedCount` 字段位（当前默认 `sampleRate=1`、`droppedCount=0`）。
- 文档同步：
  - 用户文档新增并接入导航：`apps/docs/content/docs/guide/advanced/concurrency-control-plane.md`、`apps/docs/content/docs/guide/advanced/meta.json`
  - runtime SSoT 补齐并发诊断 code 与 details schema 口径：`docs/ssot/runtime/logix-core/observability/09-debugging.md`

## 已确认可复用/已实现的 020 相关落点（对 021 直接有用）

### 控制面/覆盖（runtime_default/runtime_module/provider）

- `packages/logix-core/src/internal/runtime/core/env.ts`
  - `ConcurrencyPolicyTag` / `ConcurrencyPolicyOverridesTag`
  - `ConcurrencyPolicy` / `ConcurrencyPolicyPatch` / `ConcurrencyPolicyOverrides`
- `packages/logix-core/src/internal/runtime/ModuleRuntime.concurrencyPolicy.ts`
  - `makeResolveConcurrencyPolicy({ moduleId })`
  - 合并优先级：`provider > runtime_module > runtime_default > builtin`
  - builtin 默认（当前实现）：
    - `concurrencyLimit = 16`
    - `losslessBackpressureCapacity = 4096`
    - `allowUnbounded = false`
    - `pressureWarningThreshold = { backlogCount: 1000, backlogDurationMs: 5000 }`
    - `warningCooldownMs = 30_000`
  - **更新**：resolver 已强制 `"unbounded" ⇒ allowUnbounded=true`（否则回退），并在 resolve 时通过 `ConcurrencyDiagnostics` 输出一次性审计诊断。
- `packages/logix-core/src/internal/runtime/AppRuntime.ts`
  - `LogixAppConfig.concurrencyPolicy?: ConcurrencyPolicy`
  - 在 App 层 `Layer.succeed(ConcurrencyPolicyTag, config.concurrencyPolicy)` 注入 runtime_default。
- `packages/logix-core/src/Runtime.ts`
  - `RuntimeOptions.concurrencyPolicy?: ConcurrencyPolicy`
  - `concurrencyPolicyOverridesLayer(overrides)`（provider 覆写）
  - `setConcurrencyPolicyOverride(runtime, moduleId, patch)`（runtime_module 热切换）

### RuntimeInternals（020 的 internal contracts / accessor）

- `packages/logix-core/src/internal/runtime/core/RuntimeInternals.ts`
  - `concurrency.resolveConcurrencyPolicy(): Effect<RuntimeInternalsResolvedConcurrencyPolicy>`
- `packages/logix-core/src/internal/runtime/ModuleRuntime.internalHooks.ts`
  - 安装 `RuntimeInternals` 并把 `resolveConcurrencyPolicy` 透出给 BoundApi/Flow/TaskRunner 使用
- `packages/logix-core/src/internal/runtime/core/runtimeInternalsAccessor.ts`
  - `getRuntimeInternals/getBoundInternals`（缺失/instanceId mismatch 会在 dev 抛错并给出修复建议）
- 相关测试：`packages/logix-core/test/Runtime.InternalContracts.Accessor.test.ts`
  - 注意：该测试里已经包含 concurrency policy 的 shape 示例（说明 020 已为 021 预埋契约位）。

### bounded concurrency 已落地（021/US1 的一部分已完成）

- `packages/logix-core/src/internal/runtime/core/FlowRuntime.ts`
  - `runParallel` 不再 hardcode `{ concurrency: "unbounded" }`，而是读取 `resolveConcurrencyPolicy().concurrencyLimit`（fallback=16）。
- `packages/logix-core/src/internal/runtime/core/TaskRunner.ts`
  - `parallel/exhaust` 读取 `resolveConcurrencyPolicy().concurrencyLimit`（fallback=16）。
- 已有回归测试：
  - `packages/logix-core/test/ConcurrencyPolicy.FlowRuntimeBounded.test.ts`
  - `packages/logix-core/test/ConcurrencyPolicy.TaskRunnerBounded.test.ts`

### 021 perf 证据落点与 runner

- `.codex/skills/logix-perf-evidence/package.json` 已有：
  - `collect` / `collect:quick`（通过 `--out` 落盘到 `specs/<id>/perf/*`）
  - `diff`（通过 `--out` 落盘到 `specs/<id>/perf/*`）
- `specs/021-limit-unbounded-concurrency/perf/README.md`
- `specs/021-limit-unbounded-concurrency/perf.md`

### 021 contracts 预检

- `specs/021-limit-unbounded-concurrency/contracts/concurrency-policy.schema.json`
- `specs/021-limit-unbounded-concurrency/contracts/concurrency-diagnostic-details.schema.json`
- `packages/logix-core/test/Contracts.021.LimitUnboundedConcurrency.test.ts`

---

## 021 当前仍未覆盖/需要决策的点（相对 spec.md/FR）

### 1) Lossless Backpressure（FR-011/FR-012/SC-006）

现状：

- `packages/logix-core/src/internal/runtime/ModuleRuntime.txnQueue.ts` 仍是 `Queue.unbounded`，没有内部 backlog 上界，也没有背压等待。
- `dispatch` 路径仍是“入口 enqueueTransaction → runWithStateTransaction → txn window 内 `PubSub.publish`”，且 actionHub 默认 `PubSub.unbounded`，不会背压。

关键风险点：

- 若直接把 txnQueue 改成 bounded（或新增等待 gate），必须处理“**在 `inSyncTransactionFiber` 内调用 `dispatch`/`setState`**”的场景：队列满时若发生等待会违反 FR-012，并可能死锁（当前之所以没问题，是因为 offer 不会阻塞）。

待决策略（需要先拍板再写代码）：

1. **禁止事务内 dispatch**：抛错/诊断并失败事务（风险：语义变化 + 与“必达”冲突）。
2. **事务内 dispatch 走 post-commit flush**：事务窗口内只记录“待派发列表”，提交后再执行可等待的 enqueue（需要新增可靠的 post-commit 阶段/flush 机制）。
3. **两级队列/软 gate**：保持底层物理 queue 可容纳，但用计数+Deferred 控制“运行时内部有效 backlog”不超过 capacity；并对事务内调用使用“先记账、后等待”的机制，把等待推到事务之外。

补充注意：

- `makeEnqueueTransaction` 当前只捕获 `StateTransactionOverridesTag`（provider overrides）与 `Debug.currentDiagnosticsLevel`，如果 backpressure capacity/阈值希望 provider 覆写真正生效，需要决定：
  - 是否也捕获 `ConcurrencyPolicyOverridesTag`，或
  - 在 enqueue 点先解析 policy（闭包捕获数值）避免后台 fiber env 不一致。

### 2) 并发压力诊断与降噪（FR-005/FR-006/FR-013/SC-002）

现状（已完成 US1/US2）：

- 已实现 `concurrency::pressure`（冷却窗口合并；`trigger.details` 至少含 `configScope/limit`）：`packages/logix-core/src/internal/runtime/core/ConcurrencyDiagnostics.ts`
- 已实现 unbounded gate + 一次性审计诊断：
  - `concurrency::unbounded_enabled`
  - `concurrency::unbounded_requires_opt_in`

待实现要点（US3）：

- 补齐可解释降级字段：`degradeStrategy/suppressedCount/sampleRate/droppedCount` 等（并补测试与 contracts 对齐）。

### 3) Unbounded opt-in gate（FR-004/FR-009/SC-004）

现状（已完成 US2）：

- resolver 已强制 `"unbounded" ⇒ allowUnbounded=true`（否则回退到最后一次 bounded 值）。
- 已补齐两类诊断事件（实例作用域只提示一次）：
  - `concurrency::unbounded_enabled`
  - `concurrency::unbounded_requires_opt_in`

### 4) FR-008 模块销毁收敛（避免 zombie tasks）

现状待确认：

- 并行 watcher / runParallelTask 启动的 fiber 是否都绑定到实例 `Scope`，destroy 时会被 interrupt；
- 需要补齐回归测试，覆盖“destroy 后不再写回/不泄漏”。

### 5) Spec Edge Cases：嵌套并发 / 多模块饥饿

已在 021 tasks 里加了测试任务，但最终判定口径依赖 backpressure/diagnostic 的实现细节，需在实现时一起对齐。

---

## 对 021 tasks.md 的调整建议（基于 020 已实现）

- Phase 1/2 的“控制面/DI/基础设施”无需再拆新任务：**020 已提供并且 021 已落地**（保持现有 `[X]` 即可）。
- 剩余工作建议聚焦 3 条主线：
  1. txnQueue lossless backpressure（含“事务内调用 + 队列满”策略拍板）；
  2. concurrency diagnostics + cooldown/降级；
  3. unbounded opt-in gate + 审计提示 + 文档/迁移说明。
- 建议把“事务内 dispatch + 队列满”策略写入 `specs/021-limit-unbounded-concurrency/research.md`（或另开小节），避免实现中途口径漂移。

---

## Next Actions（我准备继续做的事）

1. **先拍板 backpressure 策略**（事务内 dispatch/queue 满时的语义）：在 `specs/021-limit-unbounded-concurrency/research.md` 固化裁决。
2. 实现 US1 剩余部分：
   - `packages/logix-core/src/internal/runtime/ModuleRuntime.txnQueue.ts`：入口积压有界（默认 4096）+ 背压等待不进事务窗口（配合策略实现）。
   - `packages/logix-core/src/internal/runtime/ModuleRuntime.dispatch.ts`：必要的分层/flush/诊断提示接入点。
3. 新增/实现 `packages/logix-core/src/internal/runtime/core/ConcurrencyDiagnostics.ts`（或等价落点）：
   - 统一发射 `concurrency::pressure` / `concurrency::unbounded_enabled`
   - cooldown/合并/可解释降级字段
4. `packages/logix-core/src/internal/runtime/ModuleRuntime.concurrencyPolicy.ts`：
   - 强制 `unbounded ⇒ allowUnbounded=true`（否则回退并诊断）
5. 补齐测试（对应 021 tasks 里新增的用例）：
   - destroy cancels in-flight
   - nested concurrency
   - multi-module starvation
   - pressure warning & diagnostics degrade
6. 文档与证据：
   - `apps/docs/content/docs/guide/advanced/concurrency-control-plane.md` + `meta.json`
   - perf：按 `specs/021-limit-unbounded-concurrency/perf/README.md` 用 `pnpm perf collect:quick -- --out ...` / `diff -- --out ...` 采集 before/after/diff，并把摘要写到 `specs/021-limit-unbounded-concurrency/perf.md`。

---

## 2025-12-22 实施完成（以本节为准）

> 说明：上方“当前仍未覆盖/Next Actions”是早期阶段的记录，现已全部落地；请以本节的最终状态与证据为准。

### 完成状态

- `specs/021-limit-unbounded-concurrency/tasks.md`：T001–T034 已全部标记为 `[X]`
- Quality Gates：
  - typecheck：`pnpm -C packages/logix-core typecheck:test` ✅
  - typecheck（全仓）：`pnpm typecheck` ✅
  - test：`pnpm -C packages/logix-core test` ✅
  - lint：`pnpm lint` ✅
- Perf（diagnostics=off, profile=quick）：
  - Before：`specs/021-limit-unbounded-concurrency/perf/before.worktree.quick.off.json`
  - After：`specs/021-limit-unbounded-concurrency/perf/after.worktree.quick.off.json`
  - Diff：`specs/021-limit-unbounded-concurrency/perf/diff.worktree.off.json`
  - 结论：`diff.summary` regressions=0 / budgetViolations=0（详见 `specs/021-limit-unbounded-concurrency/perf.md`）

### 关键实现/落点回顾（便于快速定位）

- 并发策略裁决与字段级来源：`packages/logix-core/src/internal/runtime/ModuleRuntime.concurrencyPolicy.ts`
- txnQueue lossless 背压与事务窗口约束：`packages/logix-core/src/internal/runtime/ModuleRuntime.txnQueue.ts`
- dispatch 分层 + publish 背压诊断：`packages/logix-core/src/internal/runtime/ModuleRuntime.dispatch.ts`
- 诊断信号（pressure / unbounded opt-in / cooldown 合并）：`packages/logix-core/src/internal/runtime/core/ConcurrencyDiagnostics.ts`
- contracts gate：`specs/021-limit-unbounded-concurrency/contracts/concurrency-diagnostic-details.schema.json`
  - 对应测试：`packages/logix-core/test/Contracts.021.LimitUnboundedConcurrency.test.ts`
- 用户文档：`apps/docs/content/docs/guide/advanced/concurrency-control-plane.md`

### 工程性修复（本次为通过 typecheck/test 的必要收敛）

- 将若干 state-trait helper 的 `Effect` 环境类型从 `any` 收敛为 `never`，避免 runtime hot path 的 `any` 泄漏：
  - `packages/logix-core/src/internal/state-trait/converge.ts`
  - `packages/logix-core/src/internal/state-trait/validate.ts`
  - `packages/logix-core/src/internal/state-trait/source.ts`
- 修复示例包的类型推导漂移（`Effect.gen` 在 `any` 上退化为 `unknown`），避免全仓 typecheck 被 `@examples/logix-react` 阻塞：
  - `examples/logix-react/src/demos/PerfTuningLabLayout.tsx`
- 调整一条 converge auto 决策测试用例，使其符合“先提供字段级 dirty-set 证据，再进行 setState”的既有约束：
  - `packages/logix-core/test/StateTrait.ConvergeAuto.BasicDecision.test.ts`

### 非阻塞改进建议（review 吸收，已落地）

- FlowRuntime 的 `runtime:any` 收敛：已移除热路径上的 `(runtime as any).moduleId/instanceId` 读取，改为最小 scope 读取（兼容测试里的 `FlowRuntime.make(undefined as any)`），相关落点：`packages/logix-core/src/internal/runtime/core/FlowRuntime.ts`、`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`。
- 配置校验的统一入口：已把分散的 `normalize*` 收敛到 `packages/logix-core/src/internal/runtime/core/normalize.ts`，并在 `Runtime.make` / overrides API 上补了 dev-only 校验提示（基于 `effect/Schema`，不引入 `@effect/schema`）：`packages/logix-core/src/internal/runtime/core/configValidation.ts`、`packages/logix-core/src/Runtime.ts`。

### Perf baseline worktree（可选清理）

- 本次为了采集 Before，在本机创建了 git worktree：
  - 路径：`/Users/yoyo/Documents/code/personal/intent-flow-perf-before`
  - 清理：`git worktree remove /Users/yoyo/Documents/code/personal/intent-flow-perf-before`
