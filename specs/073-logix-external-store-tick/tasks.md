# Tasks: ExternalStore + TickScheduler（跨外部源/跨模块强一致，无 tearing）

**Input**: Design documents from `specs/073-logix-external-store-tick/`
**Prerequisites**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/*`, `quickstart.md`
**Tests**: REQUIRED（`spec.md` 的 SC-001/SC-004 要求自动化语义测试 + perf evidence）

## Format: `[ID] [P?] [Story] Description with file path`

- `[P]`：可并行（不同文件/无强前置）
- `[US1]/[US2]`：对应 `spec.md` 的 User Story
- `GATE:`：主干道语义护栏（优先落地；后续任务以它为阻断项）

## Milestones（按 073 疏通后的交付节奏）

- **M1（Reference Frame Cutover）**：完成 Phase 3 + Phase 4 + Phase 6，使 `RuntimeStore + tickSeq` 成为 React 唯一订阅真相源，并具备 `trace:tick` 证据闭环与 perf gate（此里程碑完成后，后续所有 Flow/Action 能力都默认以 tick 为参考系）。
- **M2（IR Strong Consistency）**：完成 Phase 5，为跨模块强一致补齐“可识别依赖 IR”（DeclarativeLinkIR/Module-as-Source），并把强一致边界（declarative vs blackbox）写入测试与诊断证据。
- **M3（HostScheduler + act-like TestKit）**：收敛宿主调度入口（microtask/macrotask/raf/timeout）到可注入 Runtime Service，并提供统一 flush 口径（类似 React `act` 但以 `tickSeq` 为锚点），用于反饥饿治理、可诊断证据与稳定测试。
- **Out-of-scope（拆到后续 spec）**：自由工作流（多步协议/时间算子）与 source 自动触发内核化不在 073 主干里强塞，避免把“自由度”误塞进 field meta；相关工作以新 spec 单独推进。

---

## Phase 1: Setup（Docs / Baselines）

- [x] T001 Create perf evidence folder `specs/073-logix-external-store-tick/perf/` (per `plan.md#Perf Evidence Plan`)
- [x] T002 [P] Sync Runtime SSoT entry points (if public API changes): `docs/ssot/runtime/logix-core/api/*` + `docs/ssot/runtime/logix-react/*`
- [x] T003 [P] Write user docs (减少 useEffect 数据胶水) for ExternalStore + FieldKernel.externalStore + Module-as-Source in `apps/docs 当前 guide/runtime 口径文档` and add it to `apps/docs/content/docs/guide/recipes/meta.json` (user-doc style; avoid内部术语；include “何时用 ReadQuery vs fromModule vs externalStore vs link” decision guide)
- [x] T004 [P] Add API doc page for ExternalStore in `apps/docs 当前 core/guide 口径文档` and update `apps/docs/content/docs/api/core/meta.json` (focus on usage + constraints: sync getSnapshot, Signal Dirty, SSR getServerSnapshot, fromStream fail-fast, fromModule IR-recognizable)
- [x] T005 [P] Decompose `packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts` (1500+ LOC) into mutually-exclusive `ModuleRuntime.*.ts` flat modules per `plan.md#Large File Decomposition` (no behavior change; keep public surface stable)
- [x] T006 [P] Decompose `packages/logix-core/src/internal/runtime/core/DebugSink.ts` (1600+ LOC) into mutually-exclusive `DebugSink.*.ts` flat modules per `plan.md#Large File Decomposition` (no behavior change; keep event shapes stable)
- [x] T007 [P] Decompose `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.ts` (1300+ LOC) into mutually-exclusive `ProcessRuntime.*.ts` flat modules per `plan.md#Large File Decomposition` (no behavior change; keep ProcessProtocol stable)
- [x] T008 [P] Decompose `packages/logix-core/src/internal/state-field/{source,converge-in-transaction,validate}.ts` (1000+ LOC) into mutually-exclusive `*.ts` flat modules per `plan.md#Large File Decomposition` (no behavior change; preserve exports)

---

## Phase 2: Level 1（ExternalStore + FieldKernel.externalStore）

**Goal**：把外部输入从“订阅胶水”升级为 declarative field，保证初始化无竞态，并且写回进入事务窗口。

- [x] T009 [US2] Harden FieldKernel deps contract: change `FieldKernel.source({ key })` from `key(state)` to **deps-as-args** `key(...depsValues)` (DSL lowers into internal `key(state)`); migrate all callsites + `@logixjs/query` field lowering + runtime SSoT docs under `docs/ssot/runtime/logix-core/**` (align with computed; reduces deps mismatch risk and makes Static IR dependency story tighter)
- [x] T010 [US2] Define `ExternalStore<T>` public contract in `packages/logix-core/src/ExternalStore.ts` (`getSnapshot/subscribe` + optional `getServerSnapshot` for SSR) (FR-001)
- [x] T011 [P] Implement ExternalStore sugars in `packages/logix-core/src/ExternalStore.ts` (`fromService` / `fromSubscriptionRef` / `fromStream` / `fromModule`) (FR-002; `fromStream` missing `initial/current` must Runtime Error fail-fast; `fromSubscriptionRef` assumes pure read; all sugars must carry an internal **descriptor** for field build/IR export; `fromModule` descriptor MUST include resolvable moduleId + `ReadQueryStaticIr` so Module-as-Source is IR-recognizable (no blackbox subscribe): moduleId must resolve, selectorId must be stable (deny `unstableSelectorId`), otherwise fail-fast; include stale-start + purity + module-as-source warnings in docstring + quickstart)
- [x] T012 [P] Export `ExternalStore` as a public submodule in `packages/logix-core/src/index.ts` and satisfy `scripts/public-submodules/verify.ts` (plan.md#Project Structure)
- [x] T013 [US2] Add `FieldKernel.externalStore` DSL in `packages/logix-core/src/FieldKernel.ts` (include `lane/ownership/source` policy hooks; IR-exportable; must support `priority: "nonUrgent"` as an explicit lane downgrade entry) (FR-003 / FR-011)
- [x] T014 [US2] Implement externalStore field runtime/install in `packages/logix-core/src/internal/state-field/external-store.ts` (FR-003/FR-005; listener must be Signal Dirty + tick scheduling dedup, no payload task queue storm)
- [x] T015 [US2] Wire field registry/build pipeline to recognize `kind: "externalStore"` in `packages/logix-core/src/internal/state-field/model.ts` + `packages/logix-core/src/internal/state-field/build.ts` (emit first-class plan step, e.g. `external-store-sync`) and export `source/ownership/lane` policy into `packages/logix-core/src/internal/state-field/ir.ts` (Static IR digest must reflect structural changes)
- [x] T016 [US2] Implement atomic init semantics (no missed updates between `getSnapshot` and `subscribe`) in `packages/logix-core/src/internal/state-field/external-store.ts` (FR-004)
- [x] T019 [P] [US2] Enforce external-owned field ownership: build/install-time conflict detection + runtime fail-fast on non-field writes to the same fieldPath (no eslint/type-level static write analysis). build-time governance MUST cover “single writer per fieldPath” across computed/link/source/externalStore and must also protect root reset/patch paths. Implement in `packages/logix-core/src/internal/state-field/external-store.ts` + build pipeline + runtime dirty-set guard, with tests in `packages/logix-core/test/internal/FieldKernel/FieldKernel.ExternalStoreTrait.Ownership.test.ts` (FR-003)
- [x] T017 [P] Add tests for init atomicity + equals/select gating + Signal Dirty dedup (e.g. 100 emits in same microtask does not enqueue 100 writes) + `getSnapshot()` throw → field fuse + `fromStream` missing `initial/current` → Runtime Error + Static IR export contains ExternalStoreTrait node/policy (source/priority/ownership) in `packages/logix-core/test/internal/FieldKernel/FieldKernel.ExternalStoreTrait.Runtime.test.ts` (FR-001 / FR-002 / FR-004)
- [x] T018 [P] Add tests proving writeback happens inside txn and never performs IO in txn-window (best-effort runtime guard) in `packages/logix-core/test/internal/FieldKernel/FieldKernel.ExternalStoreTrait.TxnWindow.test.ts` (FR-005 / NFR-004)

**Checkpoint**：不用手写 `$.on(external).mutate(...)` 也能把外部输入写回 state，并可稳定触发 computed/link/source（模块内无 tearing）。

---

## Phase 3: Level 2（TickScheduler + RuntimeStore）

**Goal**：把跨模块一致性与可解释链路归一到 tick，提供稳定 `tickSeq`，并支持预算/软降级。

- [x] T020 [US1] Add runtime `TickScheduler` internal service in `packages/logix-core/src/internal/runtime/core/TickScheduler.ts` (FR-006 / FR-010 / FR-011; budget degrade must never defer urgent lane and may only defer nonUrgent backlog)
- [x] T021 [P] [US1] Add public runtime API surface for batching in `packages/logix-core/src/Runtime.ts` (e.g. `Runtime.batch(() => A)` sync-only; nested batches flatten; no rollback, errors are partial commit but must still flush in finally; docs MUST warn this is not atomic/all-or-nothing and must not be used as a transaction; also warn against `await` expecting mid-flush) (FR-006)
- [x] T022 [US1] Implement `RuntimeStore` (single subscription point snapshot) in `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts` (FR-007)
- [x] T023 [US1] Implement stable `tickSeq` allocation + correlation fields in `packages/logix-core/src/internal/runtime/core/*` (FR-008 / NFR-003)
- [x] T024 [US1] Wire module commit notifications to RuntimeStore (and ensure token invariants), including selector-topic version routing for `ModuleInstanceKey::rq:${selectorId}` (static ReadQuery only; reuse SelectorGraph indexing; no per-commit scan; T035 prerequisite) in `packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts` + `RuntimeStore.ts` + `DevtoolsHub.ts` as needed (SC-001)
- [x] T025 [P] [US3] GATE: Add `trace:tick` diagnostics event (start/settled/budgetExceeded) gated by devtools/diagnostics in `packages/logix-core/src/internal/runtime/core/LogicDiagnostics.ts` (or equivalent) (NFR-002 / NFR-005 / SC-003; include `backlog.deferredPrimary` when nonUrgent external input is deferred; when deferredPrimary has active React subscribers, also emit `warn:priority-inversion` per `contracts/diagnostics.md`)
- [x] T026 [P] [US3] Add tests for tick fixpoint + budget exceeded evidence + urgent-lane cycle/step-cap safety break (must not freeze; emits `trace:tick.result.stable=false` with `cycle_detected/budget_steps`) in `packages/logix-core/test/internal/runtime/TickScheduler.fixpoint.test.ts` (FR-010 / FR-011 / SC-003; budgetExceeded implies partial fixpoint + eventual consistency for deferred nonUrgent; if deferred work includes external input, `trace:tick.backlog.deferredPrimary` must be present in diagnostics=on)
- [x] T027 [P] [US1] Add tests proving diagnostics off has no trace emission and minimal allocations (smoke gate) in `packages/logix-core/test/internal/runtime/TickScheduler.diag-gate.test.ts` (NFR-002)
- [x] T028 [P] [US1] Make TickScheduler/RuntimeStore injectable runtime services (Context Tag + Layer) and provide test stubs in `packages/logix-core/src/internal/runtime/core/env.ts` (NFR-006)
- [x] T029 [P] [US1] Add tests for tickSeq ↔ txnSeq/opSeq correlation (or explicit no-op tick reason) in `packages/logix-core/test/internal/runtime/TickScheduler.correlation.test.ts` (FR-008 / SC-002)

**Checkpoint**：多个模块在同一 tick 的提交可以被 RuntimeStore 作为“单一快照”对外观察，并可用 `trace:tick` 解释 settled/超预算行为。

---

## Phase 4: React Integration（RuntimeStore single subscription）

**Goal**：对外不改用法，底层从 per-module store 切到 RuntimeStore，消灭跨模块 tearing。

- [x] T030 [US1] Implement runtime-level external store adapter in `packages/logix-react/src/internal/store/RuntimeExternalStore.ts` using ExternalStore facade pattern (topic-keyed facade store: `ModuleInstanceKey` → `{ subscribe,getSnapshot,getServerSnapshot }`, cached by `(runtime, topicKey)`; notify must preserve low-priority throttling semantics: normal→microtask, low→raf/timeout+maxDelay; listeners=0 must detach and `Map.delete` to avoid retained growth/key retention; avoid render-path long topicKey concat) to avoid global O(N) selector execution (FR-007 / NFR-008)
- [x] T033 [P] [US1] GATE: Add browser semantic test asserting `tickSeq` consistency across modules AND sharded-notify behavior: (1) unrelated module update does not re-run selectors, (2) within the same module, unrelated field update does not re-run ReadQuery static-lane selectors (guards T035) in `packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx` (SC-001 / FR-007)
- [x] T036 [P] [US1] GATE: Add browser semantic test asserting multi-instance isolation: same `moduleId` with different `instanceId` must not cross-wake selectors (topicKey includes `ModuleInstanceKey`) in `packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx` (FR-007)
- [x] T031 [US1] Switch `useSelector` to select the correct topic facade (not a single global store) in `packages/logix-react/src/internal/hooks/useSelector.ts` (keep `equalityFn` support via with-selector; SSR uses `store.getServerSnapshot ?? store.getSnapshot`) (SC-001)
- [x] T035 [P] [US1] Preserve selector-level caching for ReadQuery static lane: when `ReadQueryCompiled.lane==="static"` and `readsDigest` exists and `fallbackReason` is empty, subscribe to selector-topic (`${ModuleInstanceKey}::rq:${selectorId}`); otherwise fall back to module-topic. Requires core RuntimeStore provides selector-topic versions (see T024); React adapter only selects topic facade (**CRITICAL PATH**: `[P]` means parallelizable, not optional; must land before cutover to avoid module-internal regressions)
- [x] T032 [P] Remove per-module stores (`packages/logix-react/src/internal/store/ModuleRuntimeExternalStore.ts` / `ModuleRuntimeSelectorExternalStore.ts`) and all references; enforce “single subscription truth” (React must not subscribe to `moduleRuntime.changes*` directly) (NFR-007)
- [x] T034 [P] [US1] Add “Route/State/Query-like chain” demo scenario in `examples/logix/src/scenarios/external-store-tick.ts`

**Checkpoint**：业务侧 `useSelector` 不变；同一 commit 里多个模块 selector 观测到的 `tickSeq` 一致。

---

## Phase 5: DeclarativeLinkIR（跨模块强一致可识别依赖）

**Goal**：为“多外部源 → 下游 source/query → UI”链路提供可识别 IR，使 TickScheduler 能稳定化并可解释；黑盒 `orchestration process link surface` 保持降级语义。

- [x] T040 [US1] Define Static IR shape for ExternalStoreTrait + DeclarativeLinkIR (dispatch-only; no direct state writes). DeclarativeLinkIR read nodes MUST reuse `ReadQueryStaticIr` (no parallel selector-like IR) in `packages/logix-core/src/internal/runtime/core/DeclarativeLinkIR.ts` (and connect export via `ConvergeStaticIrCollector.ts` as needed) (FR-009)
- [x] T041 [US1] Implement minimal DeclarativeLink execution path (readQuery/static deps → write) in `packages/logix-core/src/internal/runtime/core/*` without IO in txn-window (FR-009 / NFR-004)
- [x] T042 [P] [US1] Add tests proving strong consistency only applies to declarative IR; blackbox links remain “best-effort” and are flagged in diagnostics in `packages/logix-core/test/internal/runtime/DeclarativeLinkIR.boundary.test.ts` (FR-009)
- [x] T043 [US1] Define and export Static IR encoding for Module-as-Source (ExternalStoreTrait `source.kind=\"module\"`: moduleId/instanceKey/selectorId/readsDigest) and make TickScheduler treat it as a cross-module dependency edge (module readQuery → field writeback) so it can be stabilized within the same tick (FR-012 / SC-005; add recognizability gate: moduleId must resolve + selectorId must be stable; deny `unstableSelectorId`; non-static selectors may fall back to module-topic edge but must not become blackbox subscribe; update IR export path per `contracts/ir.md`)
- [x] T044 [P] [US1] Add tests for Module-as-Source semantics: B uses `FieldKernel.externalStore({ store: ExternalStore.fromModule(A, selector) })`, A updates multiple times in one tick, B's committed value and downstream derived (e.g. source keyHash) settle in the same observable flush with the same tickSeq (no A-new/B-old tearing) in `packages/logix-core/test/internal/runtime/ModuleAsSource.tick.test.ts` (SC-005)
- [x] T045 [P] [US1] Add tests for Module-as-Source recognizability gate: (1) module handle without resolvable moduleId fails-fast at install/build, (2) selector with `fallbackReason=unstableSelectorId` fails-fast, (3) selector without `readsDigest` routes via module-topic edge (still IR-recognizable, no blackbox subscribe) and emits a diagnostic in dev/diagnostics=on in `packages/logix-core/test/internal/runtime/ModuleAsSource.recognizability.test.ts` (FR-012)

**Checkpoint**：强一致边界清晰：可识别 IR 无 tearing、可解释、可预算；黑盒 link 不承诺但不会破坏系统稳定性（至少可观测到降级原因）。

---

## Phase 6: Perf Evidence & Gates（必做）

- [x] T050 [US1] Add perf boundary test(s) for tick+notify baseline in `packages/logix-react/test/browser/perf-boundaries/*runtime-store*` (NFR-001)
- [x] T051 Collect before/after perf reports (include `*runtime-store*` + `diagnostics-overhead.test.tsx` click→paint guard) and write baseline numbers back to `specs/073-logix-external-store-tick/plan.md#Perf Evidence Plan` (SC-004 / NFR-001)
- [x] T052 Run workspace gates via root scripts: `pnpm typecheck`, `pnpm lint`, `pnpm test:turbo` (Quality gate)
- [x] T053 [P] Ensure forward-only migration notes are accurate in `specs/073-logix-external-store-tick/contracts/migration.md` after code lands (NFR-007)

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 (Level1) → Phase 3 (Level2 core) → Phase 4 (React) → Phase 5 (IR) → Phase 6 (Evidence)
- 大文件拆分（T005–T008）是 “触及同一文件的后续任务” 的软前置：在实现 `T014/T019/T024/T025` 等改动之前先完成拆分，避免在 >1000 LOC 单体文件上继续堆叠语义。
- Gate（Tick Core）：在进入 Phase 4 之前必须完成并通过 `T025/T026/T029`（`trace:tick` 证据口径 + fixpoint/降级语义 + tickSeq 关联锚点），否则核心语义容易漂移。
- React cutover（尤其 `T032` 删除 per-module stores）必须被 `T024/T035/T033/T036` 阻断：先把语义护栏跑绿，再删除旧真相源；否则容易走回“双真相源/tearing 回归”。
- Field 下沉（Static governance + IR 导出）必须先到位：`T011（descriptor）→ T015（plan step + IR policy）→ T019（external-owned/单 writer 治理）` 是 Module-as-Source 与后续 TickScheduler/RuntimeStore 消费 IR 的硬前置。
- US2（declarative 外部输入）是 Level1 的主体。
- US3（超预算/循环软降级 + 可解释）主要落在 Phase 3（尤其 `T025/T026`），并作为 React 切换前的语义护栏（必须能解释“为何降级/推迟了什么/何时追赶”）。
- US1（ABCD 链路 + 无 tearing）需要 Level2 + React 切换完成后才能用最小 demo 验证；Phase 5 的 IR 工作把“跨模块强一致”从黑盒提升为可识别依赖。

---

## Phase 7: Post-Acceptance Fixes（补齐 coded points 全 PASS）

- [x] T054 [P] Emit diagnostics on externalStore fuse (getSnapshot throw) in `packages/logix-core/src/internal/state-field/external-store.ts` and assert via Debug ring buffer sink in `packages/logix-core/test/internal/FieldKernel/FieldKernel.ExternalStoreTrait.Runtime.test.ts` (FR-001)
- [x] T055 Wire `FieldKernel.externalStore({ priority: "nonUrgent" })` to runtime commit priority (low) in `packages/logix-core/src/internal/state-field/external-store.ts` + `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts` and add regression test in `packages/logix-core/test/internal/FieldKernel/FieldKernel.ExternalStoreTrait.Runtime.test.ts` (FR-011)
- [x] T056 Add externalStore ingest perf boundary suite + retained heap gate in `packages/logix-react/test/browser/perf-boundaries/external-store-ingest.test.tsx` (NFR-001 / NFR-008)
- [x] T057 Collect and diff perf reports for the new suite and update `specs/073-logix-external-store-tick/perf/*` + `specs/073-logix-external-store-tick/plan.md#Perf Evidence Plan` (NFR-001 / NFR-008 / SC-004)
- [x] T058 Record updated acceptance matrix + gaps and rerun workspace gates in `specs/073-logix-external-store-tick/notes/sessions/2026-01-06.md` (Quality gate)

---

## Phase 8: Scheduler Hardening（单一调度闭环：Signal→Queue→Tick→Yield→Snapshot→Notify→Evidence/Test）

- [x] T059 [P] Add scheduler contract and wire it into plan/docs: `specs/073-logix-external-store-tick/contracts/scheduler.md` + update `specs/073-logix-external-store-tick/contracts/diagnostics.md` + update `specs/073-logix-external-store-tick/plan.md` + update `specs/073-logix-external-store-tick/research.md` + update `specs/073-logix-external-store-tick/quickstart.md`
- [x] T060 [P] Introduce internal Runtime Service `HostScheduler` (Tag + default Node/Browser impl) and route all core-path scheduling through it (ban direct `queueMicrotask/setTimeout/requestAnimationFrame` in TickScheduler/RuntimeStore/ExternalStore/DevtoolsHub/state-field) (see `contracts/scheduler.md`)
- [x] T061 [P] Make TickScheduler queue explicit (JobQueue): Signal Dirty only enqueues/dedups, tick flush pulls latest snapshots and drives fixpoint; record `coalescedCount`/backlog summaries for diagnostics (align with `plan.md#调度抽象与反饥饿`)
- [x] T062 [P] Implement yield-to-host (anti-starvation) for TickScheduler: when `budgetExceeded/cycle_detected/microtaskChainDepth` triggers, continue backlog via macrotask and emit Slim evidence (`trace:tick.schedule` + `warn:microtask-starvation`); `microtaskChainDepth` must be maintained internally (reset on macrotask boundary) (see `contracts/scheduler.md` + `contracts/diagnostics.md`)
- [x] T063 [P] Provide act-like TestKit API (flushAll/advanceTicks) backed by deterministic HostScheduler; migrate new tests away from ad-hoc `flushMicrotasks/sleep` (align with React `act`, but anchor on `tickSeq`); add at least 1 React integration regression test for yield-to-host (React can insert higher-priority updates; no-tearing anchored on `tickSeq`)
- [x] T064 [P] Extend perf evidence (if HostScheduler/yield changes core path): add/adjust perf boundary to capture yield overhead and ensure click→paint observation remains acceptable (update `specs/073-logix-external-store-tick/plan.md#Perf Evidence Plan`)
- [x] T065 [P?] Add optional production telemetry for degraded ticks (opt-in, sampled): observe frequency of `result.stable=false` / `forcedMacrotask` even under `diagnostics=off` (see `contracts/diagnostics.md#1.3`)

---

## Phase 9: Follow-ups（HostScheduler 的“公开/稳定注入面”与用法固化）

> 说明：Phase 8 已把 HostScheduler 做成 **internal Runtime Service + Layer**（T060 已完成）；本 Phase 关注“是否需要对外暴露/稳定化注入面”，避免把 internal Tag 直接变成业务依赖。

- [x] T066 [P] Decide & implement **public** HostScheduler injection surface (one of):
  - A) `@logixjs/core` 新增 public submodule `HostScheduler`（提供 `layer(...)` / `makeDefault...` / `makeDeterministic...` *仅测试*）；或
  - B) `Logix.Runtime.make(..., { hostScheduler })` 形式的高层选项（内部用 `Layer.succeed(HostSchedulerTag, ...)` 注入，并确保 build-time 依赖正确）。
  - 同步更新 runtime SSoT + 用户文档（明确 internal-only vs public）。
  - Non-goals：不暴露 TickScheduler/RuntimeStore internal Tag 给业务层（除非另开 spec）。
- [x] T067 [P] 固化 Layer build-time 注入的“坑与标准写法”到文档与示例：覆盖 `Layer.provide(hostLayer)` vs `Layer.mergeAll(...)` 的差异，并给出最小示例（优先落在 `examples/logix` 或 `apps/docs` 对应章节）。

---

## Phase 10: Perf Follow-ups（CI sweep=default：`converge-steps` 的回归点归因与修复）

> 背景：GitHub Actions `perf-sweep=default`（`converge-steps`）显示 `converge.txnCommit / auto<=full*1.05` 在部分 `dirtyRootsRatio` slice 出现 `maxLevel` 下降（见 `specs/073-logix-external-store-tick/perf/README.md` 的 “CI（sweep=default）解读”）。

- [x] T068 [P] 归因：为 `packages/logix-react/test/browser/perf-boundaries/converge-steps.test.tsx` 增加最小“可解释证据”，把 `runtime.txnCommitMs` 拆成可归因的组成（至少区分 `converge decision` vs `converge execution` vs `tick flush` 干扰）；在不引入大量新 budgets 的前提下，把证据写回 `specs/073-logix-external-store-tick/perf/README.md`。
- [x] T069 [P] 修复：基于 T068 的证据，对 `convergeMode=auto` 的策略/实现做最小修复，使 CI sweep 的 `auto<=full*1.05` 在回归 slice 上恢复（或给出明确的“为何该 budget 不再适用”的裁决并同步更新 matrix/门禁口径）；必要时用 `profile=soak` 复测确认稳定性。
