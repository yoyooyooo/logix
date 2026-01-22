# Tasks: 039 Trait 派生收敛热路径性能与可诊断性达标

**Input**: `specs/039-trait-converge-int-exec-evidence/*`（`spec.md`/`plan.md`/`research.md`/`data-model.md`/`quickstart.md`/`contracts/*`）

**Tests**: 运行时核心路径改动视为 REQUIRED（语义回归 + 诊断协议回归 + 性能基线/对比证据）。

**Organization**: 按用户故事分组，保证每个故事可独立实现与验证；所有任务都可直接交给 LLM 执行。

## 格式

每条任务必须严格遵守：

`- [ ] T### [P?] [US?] 动作 + 精确文件路径`

- `[P]`：可并行（不同文件、无未完成依赖）
- `[US1]/[US2]/[US3]`：仅用于用户故事阶段任务；Setup/Foundational/Polish 不加

---

## Phase 1: Setup（共享准备）

**Purpose**: 先把“证据落点/跑分入口/产物结构”定死，避免后续只有日志无法对照。

- [x] T001 确认/对齐证据目录与模板（存在则校验并补齐）`specs/039-trait-converge-int-exec-evidence/perf/`、`specs/039-trait-converge-int-exec-evidence/perf.md`
- [x] T002 [P] 固化 perf 报告 schema（复用 `$logix-perf-evidence` 的 `PerfReport` 契约；仅允许 `$ref` wrapper，禁止复制内容）`specs/039-trait-converge-int-exec-evidence/contracts/schemas/converge-perf-report.schema.json`
- [x] T003 固化 perf 证据命令入口（collect/diff/tuning/node-runner）`.codex/skills/logix-perf-evidence/package.json`

**Checkpoint**: 有固定落点（`perf/`）与固定入口（`.codex/skills/logix-perf-evidence/package.json` scripts）。

---

## Phase 2: Foundational（阻塞性前置）

**Purpose**: 打通“可复现基线 → 证据落盘 → Before/After 可对比”的最短闭环（先证据，后优化）。

- [x] T004 实现 Node 基线 runner（合成场景 + time/heap delta；先以 diagnostics=off 口径固化 before）`.codex/skills/logix-perf-evidence/scripts/bench.traitConverge.node.ts`
- [x] T005 [P] 固化 Before/After diff 入口（复用 perf-evidence diff 工具 + 039 自己的 out 落点）`.codex/skills/logix-perf-evidence/package.json`
- [x] T006 [P] 确认/补齐 headless browser 基线用例（复用 `$logix-perf-evidence` 的 suites，不新建用例）：`packages/logix-react/test/browser/perf-boundaries/converge-steps.test.tsx`、`packages/logix-react/test/browser/perf-boundaries/form-list-scope-check.test.tsx`、`packages/logix-react/test/browser/perf-boundaries/diagnostics-overhead.test.tsx`、`specs/039-trait-converge-int-exec-evidence/perf.md`
- [x] T007 [P] 固化 browser 采集入口（复用 perf-evidence collect 工具；P1 合并 converge+form，P3 单独采集 diagnostics overhead）`.codex/skills/logix-perf-evidence/package.json`
- [x] T008 记录优化前 Node 基线（用 `pnpm perf bench:traitConverge:node -- --out <file>` 落盘；生成 before 文件 + 记录环境元信息）`specs/039-trait-converge-int-exec-evidence/perf/before.node.worktree.json`、`specs/039-trait-converge-int-exec-evidence/perf.md`
- [x] T009 记录优化前 browser 基线（P1 converge+form + P3 diagnostics overhead；生成 before 文件 + 记录环境元信息）`specs/039-trait-converge-int-exec-evidence/perf/before.browser.worktree.json`、`specs/039-trait-converge-int-exec-evidence/perf/before.browser.diagnostics-overhead.worktree.json`、`specs/039-trait-converge-int-exec-evidence/perf.md`

**Checkpoint**: 已固化 before 证据；后续任何优化必须产出 after 并跑 diff。

---

## Phase 3: User Story 1 - 复杂联动下仍流畅 (Priority: P1) 🎯 MVP

**Goal**: 在不改语义的前提下，把整型优化从“计划/决策层”打穿到“执行层”，显著降低 converge 的 CPU 与分配。

**Independent Test**:

- 语义：现有 converge 相关测试 + 新增执行语义测试全部通过；
- 性能：跑出 Node+browser 的 after，并用 diff 显示 local dirty 与 near-full 的指标改进（对照 `spec.md` 的 `SC-002/SC-003`）。

### Tests (US1)

- [x] T010 [US1] 新增执行语义回归：多 step 链路在同一窗口内必须读到前序写回（覆盖 draft 复用）`packages/logix-core/test/StateTrait/StateTrait.Converge.ExecutionSemantics.test.ts`

### Implementation (US1)

- [x] T011 [US1] 定义并实现 Exec IR（SoA + TypedArray + prefixIds 索引 + `topoOrderInt32` 复用；必须包含预分段 accessors/segments，禁止 id→string→split）`packages/logix-core/src/internal/state-trait/converge-exec-ir.ts`
- [x] T012 [US1] 新增 dense id bitset 工具（TypedArray；默认复用 buffer + `clear()`（`fill(0)`）；必要时支持“touched words”清零优化；禁止每窗口 `new Uint32Array`）`packages/logix-core/src/internal/state-trait/bitset.ts`
- [x] T013 [US1] 将 Exec IR 生命周期绑定到 program generation（generation bump 严格失效；不做 process-global 缓存）`packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`
- [x] T014 [US1] 用 Exec IR + bitset 重写 dirty-prefix 判定与计划扫描（替代 Set + trie Map walk）`packages/logix-core/src/internal/state-trait/converge.ts`
- [x] T015 [US1] 重构 `runWriterStep`：执行 loop 内彻底移除 `path.split('.')`（`getAtPath/setAtPathMutating`）；改为 pathId/stepId 驱动并使用 Exec IR 的预分段 accessors/segments（必要时同步移除 `stepId` 字符串拼接）；同时移除 `makePatch(...)` 的 patch 对象分配，改为 argument-based `recordPatch(path, prev, next, reason, stepId?)`（依赖 T022，light 下 zero-allocation）`packages/logix-core/src/internal/state-trait/converge.ts`
- [x] T016 [US1] 将执行改为单次 `mutative.create(base)` 的 draft+finalize（替代每 step create；先验证“单 draft 多次 mutate”的嵌套路径语义在 Node+browser 一致；并做 A/B 对照（per-step create vs single draft）避免出现“单 draft 反而更慢”的中间态；budget/error 时直接丢弃 draft 回退 base）`packages/logix-core/src/internal/state-trait/converge.ts`
- [x] T017 [US1] 整型化 converge 入口 dirty 信息（txn 侧可选维护 dirtyRootIds/dirtyAllReason；维护 `hasSpecificDirtyPath/hasDirtyAll` O(1) 标志位；commit dirtySet 复用 canonical roots 快速 materialize；优先 rootIds/bitset，保留 string fallback）`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`、`packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`、`packages/logix-core/src/internal/state-trait/converge.ts`
- [x] T018 [US1] 减少 plan cache key 分配：避免每次 `Int32Array.from(rootIds)`（cache 接受 ReadonlyArray 或复用 key）`packages/logix-core/src/internal/state-trait/converge.ts`、`packages/logix-core/src/internal/state-trait/plan-cache.ts`、`packages/logix-core/src/internal/field-path.ts`
- [x] T019 [US1] 复用 TypedArray 资产以消除重复分配：full/dirtyAll 分支复用 `topoOrderInt32`；planner 生成 plan 避免 `number[] → Int32Array.from(plan)` 二次拷贝（用 builder/scratch buffer，确保只读与无串扰）`packages/logix-core/src/internal/state-trait/converge.ts`、`packages/logix-core/src/internal/state-trait/converge-exec-ir.ts`
- [x] T020 [US1] 内部 stepId 整型化：热路径用 `stepId:number`，仅在需要序列化时 materialize string（避免 per-step 拼接）`packages/logix-core/src/internal/state-trait/converge.ts`
- [x] T021 [US1] 确认 plan cache 仍只缓存 `planStepIds`（不捕获 Exec IR/闭包）且“低命中率自我保护/禁用原因”不被回归（覆盖 thrash edge case；必要时更新既有回归）`packages/logix-core/src/internal/state-trait/plan-cache.ts`、`packages/logix-core/test/StateTrait/StateTrait.ConvergeAuto.PlanCacheProtection.test.ts`
- [x] T022 [US1] 更新内核契约以支持“源头零拷贝”+“light 零分配 patch 记录”：`StatePatch.path` 放宽为 `string | FieldPath` 并允许 txn/patch 流水线透传 `pathAsArray`（仅在序列化/调试边界 materialize string；避免 join→split 往返）；同时升级事务记录 API 支持 argument-based recording（例如 `recordPatch(path, from, to, reason, stepId?)` 或等价 `recordPatchLight/recordPatchFull` 形态）：light 下不允许在调用点创建 patch 对象（只更新 dirtyPaths/roots），full 下在事务内部 materialize `StatePatch` 并保留历史；禁止使用 rest 参数（`...args`）以免产生隐藏数组分配，分支需搬到 loop 外。`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`、`packages/logix-core/src/internal/runtime/core/mutativePatches.ts`、`packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`、`packages/logix-core/src/internal/state-trait/converge.ts`、`packages/logix-core/src/internal/field-path.ts`
- [x] T023 [US1] diff/patch 源头避免字符串往返：对 `mutative` 的 patch `pathAsArray` 优先在 txn 内直接映射 FieldPathId roots；在 instrumentation=light 时不为 dirty-set materialize path string（仅在 full/debug 需要时生成）`packages/logix-core/src/internal/runtime/core/mutativePatches.ts`、`packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`、`packages/logix-core/src/ModuleTag.ts`、`packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`、`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`、`packages/logix-core/src/internal/field-path.ts`
- [x] T024 [US1] 产出优化后 Node 基线与 diff 结果（用 `pnpm perf bench:traitConverge:node -- --out <file>` 落盘；生成 after + 写入 perf.md 摘要，并判定 `SC-003/SC-005`；必须显式确认无“半成品负优化”回归）`specs/039-trait-converge-int-exec-evidence/perf/after.node.worktree.json`、`specs/039-trait-converge-int-exec-evidence/perf.md`
- [x] T025 [US1] 产出优化后 browser 基线与 diff 结果（P1 converge+form + P3 diagnostics overhead；生成 after + 写入 perf.md 摘要，并判定 `SC-002/SC-005`；必须显式确认无“半成品负优化”回归）`specs/039-trait-converge-int-exec-evidence/perf/after.browser.worktree.json`、`specs/039-trait-converge-int-exec-evidence/perf/after.browser.diagnostics-overhead.worktree.json`、`specs/039-trait-converge-int-exec-evidence/perf.md`

**Checkpoint**: US1 完成后应满足“性能改进可复现 + 语义不变”，可作为 MVP 交付点。

---

## Phase 4: User Story 2 - 性能回归可定位 (Priority: P2)

**Goal**: 诊断证据可解释、协议不漂移、且 diagnostics=off 时开销近零；回归时能用证据定位“为什么/影响范围/最贵步骤/是否降级”。

**Independent Test**:

- 诊断：`off/light/sampled/full` 行为符合既有约束（off 不导出、light Slim、sampled 仅采样摘要、full 可解释）；
- 开销：Node+browser 基线里能量化 off→light/sampled/full 的 overhead，且满足 `spec.md` 的阈值（`SC-005`）。

### Tests (US2)

- [x] T026 [US2] 补齐/加严 diagnostics 分档回归（off、light、full 的导出与裁剪口径稳定；sampled 见 044）`packages/logix-core/test/StateTrait/StateTrait.ConvergeAuto.DiagnosticsLevels.test.ts`
- [x] T027 [US2] 补齐/加严 converge evidence shape 回归（确保与 013 schema 对齐且可序列化），并显式覆盖“静态配置错误硬失败”（cycle/multiple writers）与“不得被 cache/self-protection 吞掉”的边界 `packages/logix-core/test/StateTrait/StateTrait.ConvergeAuto.EvidenceShape.test.ts`、`packages/logix-core/test/StateTrait/StateTrait.ConfigErrors.test.ts`、`packages/logix-core/test/StateTrait/StateTrait.ConvergeAuto.CorrectnessInvariants.test.ts`
- [x] T028 [US2] 新增事务窗口边界回归：converge/txn 窗口内禁止 IO/async；任何 escape 必须可检测并产出最小证据（`FR-002/NFR-004`）`packages/logix-core/test/StateTrait/StateTrait.ConvergeAuto.TransactionBoundary.test.ts`
- [x] T029 [US2] 新增稳定标识回归：`instanceId/txnSeq/opSeq` 去随机化且可预测（无 random/time default；`NFR-003`）`packages/logix-core/test/StateTrait/StateTrait.ConvergeAuto.DeterministicIds.test.ts`

### Implementation (US2)

- [x] T030 [US2] 在 converge 热路径增加“诊断分配闸门”+“预算检查采样快路径”（diagnostics=off：不分配 steps 数组、不做 stepLabel/traceKey 拼接、不做 topN；同时避免 per-step `ctx.now()`：用 stepOps + mask 采样读 clock；需要 top3 时用 O(n)（linear scan / small heap）替代 `slice().sort()`）`packages/logix-core/src/internal/state-trait/converge.ts`
- [x] T031 [US2] 若证据字段/裁剪策略发生变化：同步更新 013 converge schema + runtime 投影裁剪 + Devtools 协议文档（禁止在 039 复制 schema）`specs/013-auto-converge-planner/contracts/schemas/trait-converge-*.schema.json`、`packages/logix-core/src/internal/runtime/core/DebugSink.ts`、`docs/ssot/runtime/logix-core/observability/09-debugging.md`
- [x] T032 [US2] 在 perf runner 中加入 diagnostics overhead 维度（off、light、full；sampled 见 044）并输出可对比的 ratio/delta 结果（用于门禁）`.codex/skills/logix-perf-evidence/scripts/bench.traitConverge.node.ts`、`packages/logix-react/test/browser/perf-boundaries/converge-runtime.ts`、`packages/logix-react/test/browser/perf-boundaries/converge-steps.test.tsx`

**Checkpoint**: 发生回归时可以用 `trait:converge` 证据解释“为什么走 full/dirty、是否 cache 命中、是否 budget cutoff”，并且 off 档位开销可量化且达标。

---

## Phase 5: User Story 3 - 超预算/错误安全降级 (Priority: P3)

**Goal**: 超预算与运行时错误时不产生半成品可观察状态；降级口径稳定且可解释。

**Independent Test**: 人为触发 budget exhaustion 与 derive throw，两种情况都保证 0-commit（回退 base），并产生可序列化降级证据。

### Tests (US3)

- [x] T033 [US3] 新增 budget exhaustion 回归：强制超预算时必须回退 base 且无 commit（覆盖 draft 复用）`packages/logix-core/test/StateTrait/StateTrait.Converge.DegradeBudgetRollback.test.ts`
- [x] T034 [US3] 新增 runtime error 回归：derive 抛错时必须回退 base 且无 commit，并产出 errorSummary（可序列化）`packages/logix-core/test/StateTrait/StateTrait.Converge.DegradeRuntimeErrorRollback.test.ts`

### Implementation (US3)

- [x] T035 [US3] 确保 draft 复用路径下的 rollback 不遗留部分写入（budget/error 分支统一回退 base 引用）`packages/logix-core/src/internal/state-trait/converge.ts`

**Checkpoint**: 降级路径 deterministic，且不会污染后续窗口（无残留 draft/缓存串扰）。

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 质量门禁、文档互引与交接收口。

- [x] T036 [P] 更新微观优化备忘（说明 Exec IR + bitset + draft 复用的边界与风险）`docs/ssot/handbook/reading-room/impl-notes/01-micro-optimizations.md`
- [x] T037 写清楚“如何生成/更新 before/after/diff”的流程与命名约定 `specs/039-trait-converge-int-exec-evidence/perf.md`
- [x] T038 跑通质量门禁（typecheck/lint/test + browser）并记录一次 after 证据 `package.json`、`specs/039-trait-converge-int-exec-evidence/perf.md`
- [x] T039 [P] 若本特性改变了“性能边界/自动策略/可调旋钮”的对外口径：同步更新用户文档心智模型与优化梯子（本轮无对外口径变更，无需更新）`apps/docs/content/docs/guide/advanced/performance-and-optimization.md`、`apps/docs/content/docs/guide/advanced/converge-control-plane.md`

---

## Phase 7: Backlog（明确暂不做）

**Purpose**: 记录“潜在收益更大但可能引入负优化/复杂度上升”的整型化/热路径微优化点；默认不做，只有在 US1 的 after/diff 证据显示对应成本仍主导 p95（且现有 bitset/Exec IR/诊断闸门已不足以覆盖）时才启用。

- [x] T040 （明确暂不做）将 `FieldPathIdRegistry` 从 `Map<string, node>` trie 升级为 `SegmentId` + array-trie/compact DFA，并让 prefix 检查与 `getFieldPathId` 映射走纯数值路径（需同步更新 build/exec 与测试，避免内存膨胀与共享数组被写坏）`packages/logix-core/src/internal/field-path.ts`、`packages/logix-core/src/internal/state-trait/build.ts`、`packages/logix-core/src/internal/state-trait/converge.ts`、`packages/logix-core/test/StateTrait/*`
- [x] T041 （明确暂不做）EffectOp 中间件空栈 fast path：仅当 after/diff 证据显示该点仍主导 p95 时，增加 `stack.length===0` 直接执行 body 的路径（并将分支搬到 loop 外）`packages/logix-core/src/internal/state-trait/converge.ts`

---

## Phase 8: Perf Evidence Extensions（建议，统一用 `$logix-perf-evidence` 落盘）

**Purpose**: 除 P1/P3 的验收基线外，为“负优化边界 / 半成品态 / 关键热点拆解”补齐证据任务，确保每个高风险点都有可复现对照。

- [x] T042 [P] 采集 P2 负优化边界（Before，quick 探路）：`pnpm perf collect:quick -- --out specs/039-trait-converge-int-exec-evidence/perf/before.browser.negative-dirty-pattern.worktree.quick.json --files test/browser/perf-boundaries/negative-dirty-pattern.test.tsx`（suite=`negativeBoundaries.dirtyPattern`：覆盖 cache thrash/失效/列表膨胀等对抗场景）`specs/039-trait-converge-int-exec-evidence/perf/before.browser.negative-dirty-pattern.worktree.quick.json`、`packages/logix-react/test/browser/perf-boundaries/negative-dirty-pattern.test.tsx`、`specs/039-trait-converge-int-exec-evidence/perf.md`
- [x] T043 [P] 采集 P2 负优化边界（After，quick 探路）：`pnpm perf collect:quick -- --out specs/039-trait-converge-int-exec-evidence/perf/after.browser.negative-dirty-pattern.worktree.quick.json --files test/browser/perf-boundaries/negative-dirty-pattern.test.tsx`（与 `T042` 同机同配置）`specs/039-trait-converge-int-exec-evidence/perf/after.browser.negative-dirty-pattern.worktree.quick.json`、`packages/logix-react/test/browser/perf-boundaries/negative-dirty-pattern.test.tsx`、`specs/039-trait-converge-int-exec-evidence/perf.md`
- [x] T044 [P] 对比 P2 负优化边界（Diff，quick）：`pnpm perf diff -- --before specs/039-trait-converge-int-exec-evidence/perf/before.browser.negative-dirty-pattern.worktree.quick.json --after specs/039-trait-converge-int-exec-evidence/perf/after.browser.negative-dirty-pattern.worktree.quick.json --out specs/039-trait-converge-int-exec-evidence/perf/diff.browser.negative-dirty-pattern.worktree.quick.json`（识别 cache thrash / invalidation / budget cutoff 边界回退）`specs/039-trait-converge-int-exec-evidence/perf/diff.browser.negative-dirty-pattern.worktree.quick.json`、`specs/039-trait-converge-int-exec-evidence/perf.md`
- [x] T045 [P] 半成品态回归哨兵（Node quick checkpoints）：在切换关键默认路径前后各跑一次 `pnpm perf bench:traitConverge:node -- --profile quick --out ...` 并落盘 diff（至少覆盖：Exec IR driver loop、single draft、txn 零拷贝/argument-based recording、diagnostics 闸门+budget sampling）；任何回归视为 blocker（Guardrails 3/4/8/9）。命名建议：`perf/checkpoint.node.<tag>.worktree.quick.json` + `perf/diff.checkpoint.node.<tag>.worktree.quick.json`（`<tag>` 例如 `exec-ir`/`single-draft`/`txn-zero-copy`/`diag-budget-sampling`）。`specs/039-trait-converge-int-exec-evidence/perf/*`、`specs/039-trait-converge-int-exec-evidence/perf.md`
- [x] T046 [P] txn/dirtyset 热点补充证据（Before/After，Node microbench）：用 `$logix-perf-evidence` 的 `pnpm perf bench:009:txn-dirtyset` 在 `INSTRUMENTATION=light`（以及必要的 `STEPS/EXTREME_DIRTY_ROOTS/RUNS/WARMUP_DISCARD`）档位下分别采集改动前/后输出（对齐 `T022/T023`：FieldPath 透传 + light 零分配记录），落盘到 039 perf 目录（允许先用 `> file.json` 重定向；后续如需纳入 PerfReport/PerfDiff 再升级脚本）`specs/039-trait-converge-int-exec-evidence/perf/before.node.txn-dirtyset.json`、`specs/039-trait-converge-int-exec-evidence/perf/after.node.txn-dirtyset.json`、`specs/039-trait-converge-int-exec-evidence/perf.md`
- [x] T047 [P] 采集 P4 React 宿主抖动护栏（Before，quick）：`pnpm perf collect:quick -- --out specs/039-trait-converge-int-exec-evidence/perf/before.browser.react-strict-suspense-jitter.worktree.quick.json --files test/browser/perf-boundaries/react-strict-suspense-jitter.test.tsx`（suite=`react.strictSuspenseJitter`；用于覆盖宿主/调度抖动，对 converge 优化的“非直接热点回归”做护栏）`specs/039-trait-converge-int-exec-evidence/perf/before.browser.react-strict-suspense-jitter.worktree.quick.json`、`packages/logix-react/test/browser/perf-boundaries/react-strict-suspense-jitter.test.tsx`、`specs/039-trait-converge-int-exec-evidence/perf.md`
- [x] T048 [P] 采集 P4 React 宿主抖动护栏（After，quick）：`pnpm perf collect:quick -- --out specs/039-trait-converge-int-exec-evidence/perf/after.browser.react-strict-suspense-jitter.worktree.quick.json --files test/browser/perf-boundaries/react-strict-suspense-jitter.test.tsx`（与 `T047` 同机同配置）`specs/039-trait-converge-int-exec-evidence/perf/after.browser.react-strict-suspense-jitter.worktree.quick.json`、`packages/logix-react/test/browser/perf-boundaries/react-strict-suspense-jitter.test.tsx`、`specs/039-trait-converge-int-exec-evidence/perf.md`
- [x] T049 [P] 对比 P4 React 宿主抖动护栏（Diff，quick）：`pnpm perf diff -- --before specs/039-trait-converge-int-exec-evidence/perf/before.browser.react-strict-suspense-jitter.worktree.quick.json --after specs/039-trait-converge-int-exec-evidence/perf/after.browser.react-strict-suspense-jitter.worktree.quick.json --out specs/039-trait-converge-int-exec-evidence/perf/diff.browser.react-strict-suspense-jitter.worktree.quick.json`（识别 UI 宿主侧的长尾回归/抖动放大）`specs/039-trait-converge-int-exec-evidence/perf/diff.browser.react-strict-suspense-jitter.worktree.quick.json`、`specs/039-trait-converge-int-exec-evidence/perf.md`
- [x] T050 [P] 采集 P4 “用户感知”护栏（Before，quick）：`pnpm perf collect:quick -- --out specs/039-trait-converge-int-exec-evidence/perf/before.browser.watchers-click-to-paint.worktree.quick.json --files test/browser/watcher-browser-perf.test.tsx`（suite=`watchers.clickToPaint`；用于覆盖“事件→commit→paint”的端到端感知指标）`specs/039-trait-converge-int-exec-evidence/perf/before.browser.watchers-click-to-paint.worktree.quick.json`、`packages/logix-react/test/browser/watcher-browser-perf.test.tsx`、`specs/039-trait-converge-int-exec-evidence/perf.md`
- [x] T051 [P] 采集 P4 “用户感知”护栏（After，quick）：`pnpm perf collect:quick -- --out specs/039-trait-converge-int-exec-evidence/perf/after.browser.watchers-click-to-paint.worktree.quick.json --files test/browser/watcher-browser-perf.test.tsx`（与 `T050` 同机同配置）`specs/039-trait-converge-int-exec-evidence/perf/after.browser.watchers-click-to-paint.worktree.quick.json`、`packages/logix-react/test/browser/watcher-browser-perf.test.tsx`、`specs/039-trait-converge-int-exec-evidence/perf.md`
- [x] T052 [P] 对比 P4 “用户感知”护栏（Diff，quick）：`pnpm perf diff -- --before specs/039-trait-converge-int-exec-evidence/perf/before.browser.watchers-click-to-paint.worktree.quick.json --after specs/039-trait-converge-int-exec-evidence/perf/after.browser.watchers-click-to-paint.worktree.quick.json --out specs/039-trait-converge-int-exec-evidence/perf/diff.browser.watchers-click-to-paint.worktree.quick.json`（识别 converge 优化对 e2e 指标的溢出影响/负优化）`specs/039-trait-converge-int-exec-evidence/perf/diff.browser.watchers-click-to-paint.worktree.quick.json`、`specs/039-trait-converge-int-exec-evidence/perf.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1（Setup）→ Phase 2（Foundational）→ Phase 3（US1）
- US2/US3 依赖 US1（主要为了避免在同一热路径文件上产生交叉改动与难以解释的性能证据）
- Polish 依赖 US1（建议在 US2/US3 后执行）

### Parallel Opportunities

- Phase 2：T004（Node runner）、T006（browser 用例）、T007（采集脚本）、T005（diff）可并行推进（不同文件）
- Phase 3：T011 与 T012 可并行（不同文件），但 T014–T016 需要串行（同一热路径文件）
- Phase 4/5：测试补齐（T026/T027/T028/T029/T033/T034）可与部分实现并行，但需要在对应实现稳定后最终收口

---

## Implementation Strategy（建议）

1. 先完成 Phase 1–2，把 before 基线固化（T001–T009），避免“优化无证据”。
2. 做 US1 的执行链路打通（T010–T023），然后产出 after + diff（T024–T025）。
3. 做 US2 的诊断闸门与协议回归（T026–T032），确保 off 档位开销达标。
4. 做 US3 的降级回归与回退语义收口（T033–T035）。
5. 最后做文档与质量门禁收口（T036–T039）。
