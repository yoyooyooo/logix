# Tasks: 018 定期自校准（库侧默认值审计 + 用户侧运行时自校准）

**Input**: Design documents from `/specs/018-periodic-self-calibration/`
**Prerequisites**: `spec.md` (required), `plan.md` (required), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 让 018 的代码入口/产物落点可发现、可复跑

- [ ] T001 Add 018 perf scripts to `packages/logix-perf-evidence/package.json`（例如 `calibration:audit`、`calibration:validate`）
- [ ] T002 [P] Define 018 artifact naming & output dirs in `specs/014-browser-perf-boundaries/perf/tuning/README.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 统一工作负载与协议，避免 014/017/018 口径漂移

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Extract converge synthetic workload builder into `packages/logix-react/src/internal/perfWorkloads.ts` (move logic from `packages/logix-react/test/browser/perf-boundaries/converge-runtime.ts` and dedupe `examples/logix-react/src/demos/PerfTuningLabLayout.tsx`)
- [ ] T004 Update `packages/logix-react/test/browser/perf-boundaries/converge-runtime.ts` to reuse `packages/logix-react/src/internal/perfWorkloads.ts`
- [ ] T005 Update `examples/logix-react/src/demos/PerfTuningLabLayout.tsx` to reuse `packages/logix-react/src/internal/perfWorkloads.ts` (avoid a second PerfConvergeSteps implementation)
- [ ] T006 [P] Align calibration run schema with idle/worker strategy + trigger/invalidation snapshot in `specs/018-periodic-self-calibration/contracts/calibration-run.schema.json`
- [ ] T007 Align calibration data model with schema changes in `specs/018-periodic-self-calibration/data-model.md`

**Checkpoint**: Workloads + schema are now stable; US1/US2/US3 can proceed in parallel

---

## Phase 3: User Story 1 - 库侧“定期默认值审计” (Priority: P1) 🎯 MVP

**Goal**: 周期性跑一遍固定工作负载，输出“是否建议调整库内置默认值”的可审查结论与证据

**Independent Test**: 运行脚本后生成 `kind=libraryAudit` 的 JSON 产物，包含 baseline vs candidates 的对比与结论，并可按 `meta.repro` 复跑得到一致结论

- [ ] T008 [US1] Implement audit runner CLI（统一纳入 `logix-perf-evidence`，例如入口 `pnpm perf calibration:audit`）(reuse 017 collect/recommend logic; enforce FR-008 safety/hard gates; output `CalibrationRun` JSON with per-candidate rejection reasons + `meta.repro`)
- [ ] T009 [US1] Generate human-readable audit summary + “默认值变更建议”（同上入口）(write `audit.latest.md` next to JSON; include target builtin defaults at `packages/logix-core/src/internal/runtime/ModuleRuntime.ts`)
- [ ] T010 [US1] Write audit artifacts to `specs/014-browser-perf-boundaries/perf/tuning/audit.latest.json`
- [ ] T011 [US1] Write audit artifacts to `specs/014-browser-perf-boundaries/perf/tuning/audit.latest.md`
- [ ] T012 [US1] Document audit usage & review checklist in `specs/018-periodic-self-calibration/quickstart.md`

**Checkpoint**: 审计可以在任意时刻复跑，给出“建议更新/不建议更新/证据不足”的结论与证据

---

## Phase 4: User Story 2 - 用户侧“闲时自校准（Worker First）” (Priority: P2)

**Goal**: 应用开发者 opt-in 后，在终端用户环境里闲时运行校准，产出推荐并可应用为 Provider 覆盖/可回退

**Independent Test**: 在 `examples/logix-react` 的 `/perf-tuning-lab` 页面启用自校准，交互活跃时能暂停/降速，闲时恢复；产出推荐后可应用/回退且导出 JSON

- [ ] T013 [US2] Define main↔worker message protocol in `examples/logix-react/src/demos/perf-tuning-lab/calibration/protocol.ts`
- [ ] T014 [US2] Implement idle gate (interaction tracking + visibility/focus + rIC lease) in `examples/logix-react/src/demos/perf-tuning-lab/calibration/idleGate.ts`
- [ ] T015 [US2] Implement worker calibration runner in `examples/logix-react/src/demos/perf-tuning-lab/calibration/calibration.worker.ts` (synthetic workloads only; supports `pause/resume/cancel`; enforce FR-008 safety/hard gates and record rejection reasons)
- [ ] T016 [US2] Implement main-thread controller (state machine + localStorage persistence + throttling/TTL + trigger/invalidation bookkeeping) in `examples/logix-react/src/demos/perf-tuning-lab/calibration/controller.ts`
- [ ] T017 [US2] Add 018 Self Calibration section into `examples/logix-react/src/sections/ConvergeControlPlanePanel.tsx` (enabled/run/pause/cancel/apply/revert/export)
- [ ] T018 [US2] Wire calibration state into `examples/logix-react/src/demos/PerfTuningLabLayout.tsx` (merge manual overrides + recommended overrides and pass effective layer to benches/demos)
- [ ] T019 [US2] Define override precedence (manual 013 panel vs 018 recommendation) in `examples/logix-react/src/demos/PerfTuningLabLayout.tsx`
- [ ] T020 [US2] Add Worker unavailability fallback (main-thread idle slice, synthetic only) in `examples/logix-react/src/demos/perf-tuning-lab/calibration/controller.ts`
- [ ] T021 [US2] Implement invalidation rules in `examples/logix-react/src/demos/perf-tuning-lab/calibration/controller.ts` (version/env fingerprint + observational signals: repeated failures/timeouts/no-idle, or smoke-check detects Degraded/hard-gate failure)
- [ ] T022 [US2] Enforce State Hydration Strategy: skip workloads requiring big State unless explicitly configured in `examples/logix-react/src/demos/perf-tuning-lab/calibration/calibration.worker.ts`

**Checkpoint**: 用户侧可 opt-in 启用，闲时跑校准且不打扰交互；推荐可应用为覆盖并可回退

---

## Phase 5: User Story 3 - 可解释、可审计、LLM 友好 (Priority: P3)

**Goal**: 每次校准产物可解释、可导出、可复现；淘汰/推荐理由可追溯

**Independent Test**: 导出的 JSON 能被 `contracts/calibration-run.schema.json` 校验，并能从 UI 直接读到“关键指标 + 淘汰原因 + 置信度/不确定性”

- [ ] T023 [P] [US3] Add schema validation helper（统一纳入 `logix-perf-evidence`，例如入口 `pnpm perf calibration:validate`）(validate JSON against `specs/018-periodic-self-calibration/contracts/calibration-run.schema.json`)
- [ ] T024 [US3] Persist per-run scheduling/evidence snapshot (trigger/invalidation reasons, pause reasons, lease budgets, runner mode) into exported JSON in `examples/logix-react/src/demos/perf-tuning-lab/calibration/controller.ts`
- [ ] T025 [US3] Render explainable summary (baseline vs winner + rejection reasons) in `examples/logix-react/src/demos/perf-tuning-lab/calibration/summary.ts`
- [ ] T026 [US3] Add “Copy summary / Download JSON” actions in `examples/logix-react/src/sections/ConvergeControlPlanePanel.tsx`
- [ ] T027 [P] [US3] Update “how to read” docs for 018 calibration outputs in `specs/014-browser-perf-boundaries/perf/tuning/README.md`

**Checkpoint**: 人与 LLM 都能从产物里复现/解释推荐，且能定位不确定性来源

---

## Phase N: Polish & Cross-Cutting Concerns

- [ ] T028 [P] Add/refresh internal docs entrypoints for opt-in calibration in `packages/logix-perf-evidence/references/*`
- [ ] T029 Run `specs/018-periodic-self-calibration/quickstart.md` validation and update any mismatched steps in `specs/018-periodic-self-calibration/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: Depend on Foundational completion; can proceed in parallel
- **Polish (Final Phase)**: Depends on desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational - no dependencies on US2/US3
- **US2 (P2)**: Can start after Foundational - benefits from schema alignment (T006/T007)
- **US3 (P3)**: Depends on US1/US2 producing real artifacts; schema validation (T023/T024) can be parallel

---

## Parallel Example: Foundational

```text
Task: "Extract converge synthetic workload builder into packages/logix-react/src/internal/perfWorkloads.ts"
Task: "Align calibration run schema with idle/worker strategy in specs/018-periodic-self-calibration/contracts/calibration-run.schema.json"
```
