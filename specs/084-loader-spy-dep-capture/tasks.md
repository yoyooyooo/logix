---
description: "Task list for 084-loader-spy-dep-capture (SpyEvidenceReport@v1, report-only)"
---

# Tasks: Loader Spy 依赖采集（084：加载态自描述证据·不作权威）

**Input**: `specs/084-loader-spy-dep-capture/spec.md`  
**Prerequisites**: `specs/084-loader-spy-dep-capture/plan.md`（required）, `specs/084-loader-spy-dep-capture/data-model.md`, `specs/084-loader-spy-dep-capture/contracts/`, `specs/084-loader-spy-dep-capture/quickstart.md`

**Tests**: 本特性会在 `$.use` 处插桩，必须保证默认零成本（不注入 SpyCollector 时不记录、不改变错误语义），并覆盖确定性/预算/超时/对照 diff 的关键用例。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无依赖）
- **[US1]/[US2]**: 对应 `spec.md` 的 User Story
- 任务描述必须包含明确文件路径

---

## Phase 1: Setup（contracts 预检 + 入口骨架）

- [ ] T001 [P] 补齐 084 contracts README（schema 清单 + coverage marker 语义）`specs/084-loader-spy-dep-capture/contracts/README.md`
- [ ] T002 [P] 增加 contracts 预检测试（084 schema JSON 可解析 + $ref 可解析）`packages/logix-core/test/Contracts/Contracts.084.SpyEvidenceReport.test.ts`

---

## Phase 2: Foundational（SpyCollector 注入点 + report-only 导出）

**⚠️ CRITICAL**: 本阶段完成前，不开始任何“对照 diff/CLI 暴露”（US2/Phase 5）。  
**Checkpoint**: 在注入 SpyCollector 时能采集到 use 证据；不注入时行为与输出不变。

- [ ] T003 定义 SpyCollector Tag（可注入、默认缺席；记录 use 证据）`packages/logix-core/src/internal/observability/spy/SpyCollector.ts`
- [ ] T004 在 `$.use` 实现处 best-effort 记录（不改变业务语义；记录失败不得影响原错误）`packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`
- [ ] T005 组装并导出 `SpyEvidenceReport@v1`（稳定排序/去重 + `occurrences` 聚合计数/coverage marker）`packages/logix-core/src/internal/observability/spy/exportSpyEvidenceReport.ts`
- [ ] T006 [P] 增加对外入口（可选：`Logix.Observability.*` 导出）`packages/logix-core/src/Observability.ts`
- [ ] T007 [P] 单测：未注入 SpyCollector 时不记录且不引入额外失败 `packages/logix-core/test/Spy/SpyCollector.disabled.test.ts`

---

## Phase 3: User Story 1 - 加载态采集服务使用证据（Priority: P1）

**Goal**: 在受控加载/构造窗口中采集 `$.use(Tag)` 的实际调用证据，并输出可序列化、确定性的 `SpyEvidenceReport@v1`（best-effort）。  
**Independent Test**: 同一输入重复采集输出一致；未触达分支依赖不被误报。

- [ ] T008 [US1] 实现受控采集 Harness（runId/预算/超时；默认不提供业务 Service）`packages/logix-core/src/internal/observability/spy/spyHarness.ts`
- [ ] T009 [P] [US1] 单测：基础采集输出 usedServices 稳定、去重且 `occurrences` 累加正确 `packages/logix-core/test/Spy/SpyCollector.capture.basic.test.ts`
- [ ] T010 [P] [US1] 单测：条件分支未触达不出现在 usedServices `packages/logix-core/test/Spy/SpyCollector.capture.branch.test.ts`

---

## Phase 4: User Story 2 - 声明 vs 实际偏离对照（Priority: P2）

**Goal**: 把 Spy 证据与显式声明（services/servicePorts/manifest）对照输出 `diff`（used-but-not-declared / declared-but-not-used）。  
**Independent Test**: 构造声明缺失/声明冗余样例，diff 输出稳定且可解释。

- [ ] T011 [US2] 实现 diff：SpyEvidenceReport 与声明快照对照（稳定排序）`packages/logix-core/src/internal/observability/spy/diffDeclaredVsUsed.ts`
- [ ] T012 [P] [US2] 单测：used-but-not-declared / declared-but-not-used 的稳定输出 `packages/logix-core/test/Spy/SpyCollector.diff.test.ts`

---

## Phase 5: Polish & Tooling

- [ ] T013 [P] 在 quickstart 固化“证据≠权威”的展示/消费口径 `specs/084-loader-spy-dep-capture/quickstart.md`
- [ ] T014 （可选）在 CLI 暴露 spy 子命令（M3 之后再做，默认 report-only）`packages/logix-cli/src/internal/commands/spyEvidence.ts`

---

## Phase 6: Perf Evidence（$.use 热路径回归防线，MUST）

**Goal**: 为 `BoundApiRuntime.$.use` 插桩提供可对比的性能证据：disabled（默认未注入）接近零成本；enabled（注入）开销可解释且在预算内。  
**Independent Test**: `pnpm perf collect` 的 before/after 可比（`meta.comparability.comparable=true`），且 diff 不显示 disabled 回归。

- [ ] T015 新增 perf suite：覆盖 disabled/enabled 两种模式的 `$.use` 热路径 `packages/logix-core/test/perf/BoundApiRuntime.use.spy.perf.test.ts`
- [ ] T016 采集 before/after 并落盘到 `specs/084-loader-spy-dep-capture/perf/`（同 profile/同 envId），并生成 `PerfDiff` `specs/084-loader-spy-dep-capture/perf/diff.local.<envId>.default.json`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2（BLOCKS all user stories）
- US1（采集）完成后再做 US2（对照 diff）；任何写回均禁止（写回必须走 079/082）。
