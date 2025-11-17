# Tasks: 044 Trait 收敛诊断的低成本采样（计时/统计）

**Input**: `specs/044-trait-converge-diagnostics-sampling/*`（`spec.md`/`plan.md`）

**Tests**: REQUIRED（runtime 核心路径 + 诊断协议变更）。

**Organization**: 按用户故事分组，保证每个故事可独立实现与验证；所有任务都可直接交给 LLM 执行。

## 格式

每条任务必须严格遵守：

`- [ ] T### [P?] [US?] 动作 + 精确文件路径`

- `[P]`：可并行（不同文件、无未完成依赖）
- `[US1]/[US2]/[US3]`：仅用于用户故事阶段任务；Setup/Foundational/Polish 不加

---

## Phase 1: Setup（共享准备）

**Purpose**: 先把“证据落点/协议裁决/测试入口”定死，避免只改代码导致口径漂移。

- [x] T001 建立 044 perf 证据落点与说明（创建 `perf/` + `perf.md`，对齐 matrix suite `diagnostics.overhead.e2e`）`specs/044-trait-converge-diagnostics-sampling/perf/`、`specs/044-trait-converge-diagnostics-sampling/perf.md`
- [x] T002 [P] 扩展 perf matrix：为 `diagnostics.overhead.e2e` 增加 `diagnosticsLevel=sampled`（不改变其它 suite 的维度数量）`.codex/skills/logix-perf-evidence/assets/matrix.json`

---

## Phase 2: Foundational（阻塞性前置）

**Purpose**: 先把“可配置的 sampled 档位 + 协议 schema”打通，后续用户故事只做实现与验证收口。

- [x] T003 [P] 扩展 Debug diagnostics level：新增 `sampled`，并定义语义为“默认按 light 裁剪，但 trait:converge 允许 Top-N hotspots”`packages/logix-core/src/internal/runtime/core/DebugSink.ts`、`packages/logix-core/src/Debug.ts`
- [x] T004 [P] 增加 trait converge 采样配置入口（FiberRef + Layer；至少支持 `sampleEveryN/topK`）并让 `Debug.devtoolsHubLayer` 可注入该配置 `packages/logix-core/src/internal/runtime/core/DebugSink.ts`、`packages/logix-core/src/Debug.ts`
- [x] T005 [P] 协议裁决（SSoT）：增加 `DynamicTrace.level=sampled` 并为 `trait:converge` 增加 sampled schema（light 约束 + 允许 top3 + 采样配置摘要字段）`specs/009-txn-patch-dirtyset/contracts/schemas/dynamic-trace.schema.json`、`specs/013-auto-converge-planner/contracts/schemas/trait-converge-data.schema.json`、`specs/013-auto-converge-planner/contracts/schemas/trait-converge-data.sampled.schema.json`、`specs/013-auto-converge-planner/contracts/schemas/trait-converge-event.sampled.schema.json`、`specs/013-auto-converge-planner/contracts/schemas/trait-converge-event.schema.json`

---

## Phase 3: User Story 1 - 生产环境可低成本捕获长尾 (Priority: P1) 🎯 MVP

**Goal**: diagnostics=sampled 下，以确定性采样在少量事务上开启 per-step 计时并输出 Top-N hotspots（Slim、可序列化）。

**Independent Test**: core 用例在 sampled 下稳定产出 `diagnosticsSampling` 摘要与 `top3`（采样命中时），且 `dirty` 保持 light 的 Slim 形态。

### Tests (US1)

- [x] T010 [US1] 扩展 diagnostics levels 覆盖：新增 sampled 档位断言（dirty slim + diagnosticsSampling + top3 可出现）`packages/logix-core/test/StateTrait/StateTrait.ConvergeAuto.DiagnosticsLevels.test.ts`
- [x] T012 [US1] 新增确定性测试：采样命中时 Top-N hotspots 稳定命中目标 step（不依赖真实耗时抖动）`packages/logix-core/test/StateTrait/StateTrait.Converge.DiagnosticsSampling.TopKDeterministic.test.ts`

### Implementation (US1)

- [x] T011 [US1] 在 converge 执行中实现确定性采样与 Top-N hotspots（基于稳定 `txnSeq`；不引入 random/time 作为锚；off 档位不读采样配置）`packages/logix-core/src/internal/state-trait/converge.ts`、`packages/logix-core/src/internal/state-trait/model.ts`

---

## Phase 4: User Story 2 - 诊断口径不漂移且可解释 (Priority: P2)

**Goal**: sampled 输出字段语义稳定、可解释：证据中能读出采样策略与本次是否命中采样。

**Independent Test**: 切换采样率/间隔配置，`diagnosticsSampling` 字段稳定且可序列化。

- [x] T020 [US2] 为 sampled 采样摘要补齐字段（strategy/sampleEveryN/topK/sampled），并确保 DebugSink 的裁剪规则不会意外放大 payload `packages/logix-core/src/internal/state-trait/converge.ts`、`packages/logix-core/src/internal/runtime/core/DebugSink.ts`、`specs/013-auto-converge-planner/contracts/schemas/trait-converge-data.schema.json`

---

## Phase 5: User Story 3 - off 档位保持近零成本 (Priority: P3)

**Goal**: diagnostics=off 不启用采样、不新增常驻计时/分配，默认行为不变。

**Independent Test**: 现有 off 档位用例仍通过；并在 perf suite 中对比 off（before/after）无明显回归。

- [x] T030 [US3] 确认 off 档位无采样/计时路径（通过现有用例覆盖；必要时补充断言）`packages/logix-core/test/StateTrait/StateTrait.ConvergeAuto.DiagnosticsLevels.test.ts`、`packages/logix-core/src/internal/state-trait/converge.ts`

---

## Phase 6: Polish & Evidence（质量门禁与证据收口）

**Purpose**: browser perf boundary + 文档心智模型，完成可交接闭环。

- [x] T040 [P] 更新 browser perf boundary：让 `diagnostics.overhead.e2e` 覆盖 sampled，并保持测试时间在可接受范围 `packages/logix-react/test/browser/perf-boundaries/diagnostics-overhead.test.tsx`
- [x] T041 [P] 更新用户文档：补充 `diagnosticsLevel=sampled` 的定位与开销心智模型（不出现内部 PoC 术语）`apps/docs/content/docs/guide/advanced/performance-and-optimization.md`
- [x] T042 运行质量门禁并收敛：`pnpm typecheck:test` + `pnpm test:turbo`（必要时补跑 browser 单测）并在本文件勾选完成项 `package.json`、`packages/*`、`specs/044-trait-converge-diagnostics-sampling/tasks.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1（Setup）→ Phase 2（Foundational）→ Phase 3（US1）→ Phase 4（US2）→ Phase 5（US3）→ Phase 6（Polish）

### Parallel Opportunities

- T002/T003/T004/T005 可并行（不同文件），但完成 Phase 2 后再进入 converge 核心实现与测试（US1）。
