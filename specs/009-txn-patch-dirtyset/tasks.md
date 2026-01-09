# Tasks: 009 事务 IR + Patch/Dirty-set 一等公民

**Input**: `specs/009-txn-patch-dirtyset/*`（`spec.md`/`plan.md`/`research.md`/`data-model.md`/`contracts/*`/`quickstart.md`）

**Tests**: 本特性触及 `packages/logix-core` 的事务提交、trait converge、诊断采集等核心路径；测试与回归防线视为 REQUIRED（除非在任务中显式给出可复现的替代证据）。

**Organization**: 按用户故事分组，保证每个故事可独立实现与验证。

## 格式：`- [ ] T### [P] [US#] 描述（含绝对路径）`

- `[P]`：可并行（不同文件、弱依赖）
- `[US#]`：仅用户故事阶段任务需要（Phase 3+）
- 本文件中的路径统一使用绝对路径（便于直接执行）
- 若单条任务包含多个绝对路径，执行时建议按文件拆成多个小提交/小步骤，但保持 TaskID 不变（便于对齐规范与评审结论）

## Phase 1: Setup（共享准备）

**Purpose**: 先把“如何衡量/如何验收/如何回归”准备好，避免热路径改动缺少证据链。

- [x] T001 创建性能证据记录文件 `/Users/yoyo/Documents/code/personal/intent-flow/specs/009-txn-patch-dirtyset/perf.md`（记录 Before/After + 环境元信息；每场景运行 30 次、丢弃前 5 次 warmup，报告中位数与 p95；若波动过大不可判定，附加一组更高 warmup/重复次数的补充数据）
- [x] T002 [P] 新增 perf 脚本（典型场景 + 极限场景）`pnpm perf bench:009:txn-dirtyset`
- [x] T003 [P] 列出并冻结“需要去随机化/去时间化”的 id 清单（含文件与符号）`/Users/yoyo/Documents/code/personal/intent-flow/specs/009-txn-patch-dirtyset/research.md`（instanceId/txnSeq/opSeq/eventSeq/txnId/opId/eventId/linkId；并附 `Math.random()` 现状清单）

---

## Phase 2: Foundational（阻塞前置）

**Purpose**: 先锁死 15 个澄清裁决的实现落点与测试形态，再进入用户故事开发。

- [x] T004 [P] 引入统一的 FieldPath 归一化函数（canonical=段数组；例如 `items[].name`/`items.3.name → ["items","name"]`；结构变更 → `["items"]`）并替换现有实现 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/state-trait/converge.ts`
- [x] T005 [P] 更新 dirty 调度测试：去掉 `path="*"` 语义，改为显式 `dirtyAll` 降级 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/test/StateTrait.ConvergeDirtySet.test.ts`
- [x] T006 在 StateTransaction 引入稳定标识与序号：`instanceId` 外部注入、`txnSeq`（instance 内单调）、`opSeq`（txn 内单调），并让 `txnId/opId` 可确定性派生；移除 `Math.random()` 作为默认 id 来源 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- [x] T007 扩展观测分档为 `off`/`light`/`full`：`off` 不写入诊断缓冲区且不得向 DevtoolsHub/ring buffer 写入 txn 摘要/事件；`light` 保留 txn 摘要（至少 `patchCount`/dirty-set/dirtyAll/降级摘要；不得记录 per-op 事件如 `trace:effectop`）；`full` 记录完整 patch 序列与 trace（含 `trace:effectop` SlimOp）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/core/env.ts`、`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/core/StateTransaction.ts`、`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
- [x] T008 [P] 修正 light 模式下的 `patchCount`：即使不保留 `patches[]` 也要能输出一致的计数摘要（避免为了计数构造临时 patch 数组，改为流式计数器；并补齐回归用例）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/test/ModuleRuntime.test.ts`
- [x] T009 为 Patch 增加 `opSeq`（事务内单调）并在 full 模式产出；在 full 模式记录 `from/to` 时必须保证可 `JSON.stringify`，不可序列化时必须省略；在 light 模式仅维护计数/合并结果（不保留完整序列）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- [x] T010 事务内同一路径重复写入裁决：仅允许同一 `stepId` 内重复写入（最终值为 `opSeq` 最后一笔）；跨 `stepId` 视为冲突并使事务稳定失败（可解释）；稳定失败必须原子 abort（不提交任何写入），并在 `light/full` 记录可序列化的 `txn.abort` 证据；同时落实 Decision 8 事务排队语义（事务窗口内重入 `dispatch` 合并到同一事务；commit 收尾阶段 `dispatch` 排队到下一事务；禁止覆盖式开启新事务）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/core/StateTransaction.ts`、`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/ModuleRuntime.ts`
- [x] T011 替换 Runtime 实例 id 的默认随机生成：引入外部注入的 `instanceId`（替代默认 `Math.random()`），并把 `instanceId/txnSeq` 贯穿 Debug/Devtools 事件 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/ModuleRuntime.ts`、`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/core/DebugSink.ts`、`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
- [x] T012 [P] 去随机化 EffectOp/链路 id：将 `effectop.id`、`linkId` 的默认生成从随机/时间改为可确定性派生或单调序号（与 instance/txn 对齐）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/EffectOp.ts`、`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/EffectOpCore.ts`
- [x] T013 把 Static IR 多写者冲突检测前置到 build/install：同一路径多 writer 默认构建期稳定失败，并在错误里输出冲突详情（path + writer/step/node 标识）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/state-trait/build.ts`、`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/state-trait/converge.ts`

**Checkpoint**: 15 个澄清裁决已在代码与测试中落地；可进入按用户故事推进。

---

## Phase 3: User Story 1 - 事务增量化（只做必要工作） (Priority: P1) 🎯 MVP

**Goal**: `dirty-set` 成为调度硬输入；在 dirty 模式下只执行受影响步骤；未知写入显式降级且可解释。

**Independent Test**: 在 ≥100 steps 的场景中只写入一个字段，断言 executedSteps 接近最小集合；遇到未知写入时标记 `dirtyAll` 且全量收敛可解释。

### Tests for User Story 1

- [x] T014 [P] [US1] 增加“字段写入只触发受影响步骤”的回归用例（含 list 场景 `items.name`）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/test/StateTrait.ConvergeDirtySet.test.ts`
- [x] T015 [P] [US1] 增加“未知写入 → dirtyAll 降级”用例（不得使用 `path="*"`）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/test/StateTrait.ConvergeDirtySet.test.ts`

### Implementation for User Story 1

- [x] T016 [US1] 统一 `dirty-set` 生成入口：写入发生时同步产出归一化且 prefix-free 的 canonical dirty roots（不得做全量 diff；`dirtyRootCount` 以 canonical 结果计数；`dirty.roots` 按 FieldPath 段数组逐段字典序稳定排序）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- [x] T017 [US1] 在 StateTrait dirty 模式下使用归一化 roots 做 overlaps 过滤，并确保“过滤本身负优化”可降级：默认支持 `dirtyRootCount` 阈值与 `affectedSteps/totalSteps` 阈值（任一触发→`dirtyAll`；默认阈值：`dirtyRootCount > 32` 或 `affectedSteps/totalSteps > 0.5`；可配置），并在 trace 中记录触发原因与阈值 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/state-trait/converge.ts`

---

## Phase 4: User Story 2 - 统一最小 IR（可合并、可冲突检测） (Priority: P2)

**Goal**: Static IR + Dynamic Trace 成为唯一事实源；冲突检测确定性且可输出可对齐证据。

**Independent Test**: 构造两条 writer 写同一路径，构建期稳定失败并输出冲突详情；对同一事务输出的 txn meta/trace 可被 schema 校验并可稳定对比。

- [x] T018 [P] [US2] 导出/校验最小 Static IR（nodes/reads/writes/conflicts）并对齐 schema：`/Users/yoyo/Documents/code/personal/intent-flow/specs/009-txn-patch-dirtyset/contracts/schemas/static-ir.schema.json`、`/Users/yoyo/Documents/code/personal/intent-flow/specs/009-txn-patch-dirtyset/contracts/schemas/field-path.schema.json`（FieldPath=段数组）；实现落点：`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/state-trait/build.ts`（必要时新增 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/state-trait/ir.ts`）
- [x] T019 [P] [US2] 导出/校验 Dynamic Trace（txn meta + events）并对齐 schema：`/Users/yoyo/Documents/code/personal/intent-flow/specs/009-txn-patch-dirtyset/contracts/schemas/dynamic-trace.schema.json`、`/Users/yoyo/Documents/code/personal/intent-flow/specs/009-txn-patch-dirtyset/contracts/schemas/txn-meta.schema.json`；要求 `eventSeq` 为实例内单调序号、`eventId` 为实例内确定性派生（推荐 `${instanceId}::e${eventSeq}`），且 `TxnOrigin.details`/`TraceEvent.data` 需遵循默认预算（2KB/4KB，超限截断/省略）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`、`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/core/DebugSink.ts`

---

## Phase 5: User Story 3 - 可诊断且低开销（默认不拖慢） (Priority: P3)

**Goal**: 诊断默认接近零成本；开启时 Slim & 可序列化且可解释。

**Independent Test**: `off` 与 `full` 跑同一事务，off 不向 DevtoolsHub 写入 trace/patch；full 的 events 可 JSON.stringify 且包含 txn/step/op 因果链关键字段。

- [x] T020 [P] [US3] 将 `trace:effectop` payload 收敛为 SlimOp（禁止携带 `effect`/闭包；`payloadSummary` 默认 <=256 chars；`meta` 仅原始类型/小对象白名单；单事件默认软上限 4KB，超限截断/丢字段；默认仅 `full` 采集，`light` 不得产生）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/Middleware.ts`
- [x] T021 [P] [US3] 更新 Debug 归一化逻辑以适配 SlimOp，并在归一化时执行 SlimOp 预算（<=256 chars / <=4KB）与序列化约束（不得把不可序列化对象写入 snapshot；确保 `light` 不包含 `trace:effectop`）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- [x] T022 [P] [US3] 更新/新增回归测试：SlimOp 形状与可序列化断言（含 `payloadSummary` 截断、`meta` 白名单、单事件 4KB 软上限；以及 `light` 不产生 `trace:effectop`）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/test/Middleware.DebugObserver.test.ts`、`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/test/Debug.test.ts`、`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/test/Runtime.Devtools.test.ts`

---

## Phase 6: User Story 4 - 变更前后性能可对比（基线与极限） (Priority: P4)

**Goal**: Before/After 基线可复现；极限场景有可判定结论；避免增量化引入负优化。

- [x] T023 [US4] 记录 Before 基线到 `/Users/yoyo/Documents/code/personal/intent-flow/specs/009-txn-patch-dirtyset/perf.md`（典型场景 + 极限场景；每场景运行 30 次、丢弃前 5 次 warmup，报告中位数与 p95；必要时附加更高 warmup/重复次数的补充数据）
- [x] T024 [US4] 记录 After 对比到 `/Users/yoyo/Documents/code/personal/intent-flow/specs/009-txn-patch-dirtyset/perf.md`（同脚本同机器；每场景运行 30 次、丢弃前 5 次 warmup，报告中位数与 p95；必要时附加更高 warmup/重复次数的补充数据）

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T025 [P] 同步文档：`/Users/yoyo/Documents/code/personal/intent-flow/docs/ssot/runtime/logix-core/observability/09-debugging.md`、`/Users/yoyo/Documents/code/personal/intent-flow/apps/docs/content/docs/guide/advanced/debugging-and-devtools.md`（SlimOp + 诊断分档 + 可序列化约束；避免暗示可塞入完整 EffectOp）
- [x] T026 [P] 同步路线图/迁移说明：`/Users/yoyo/Documents/code/personal/intent-flow/docs/reviews/99-roadmap-and-breaking-changes.md`（如有 breaking change；包含 Static IR 单写者/多写者冲突的常见修复指南）
- [x] T027 运行质量门并修复回归：按 `/Users/yoyo/Documents/code/personal/intent-flow/package.json` scripts 执行 `pnpm typecheck`、`pnpm test`（核心路径变更需补充 perf 证据）
- [x] T028 [P] Devtools 消费侧对齐 SlimOp：更新 `trace:effectop` 相关过滤/展示逻辑以适配 SlimOp（禁止假定 `data=EffectOp`）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-devtools-react/src/state/compute.ts`、`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-devtools-react/src/ui/inspector/Inspector.tsx`、`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-devtools-react/src/state/model.ts`
- [x] T029 [P] React 集成层 best-effort 路径不再静默吞错：替换 `.catch(() => { })` 并在 dev/test 下输出可诊断信息 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-react/src/components/RuntimeProvider.tsx`、`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-react/src/internal/ModuleCache.ts`
- [x] T030 [P] React 回归用例：为 T029 增加测试覆盖（至少覆盖 Scope.close / Debug.record 的非 interrupt 失败不会被静默吞掉；应断言 dev/test 下可见诊断输出：`console.debug + Cause.pretty` 或等价 Debug 事件）`/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-react/test/internal/bestEffortCleanup.diagnostic.test.tsx`

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1（Setup）：无依赖，可立即开始
- Phase 2（Foundational）：依赖 Phase 1，且阻塞所有用户故事（必须先锁死稳定标识/诊断分档/路径归一化/冲突裁决）
- Phase 3+（US1–US4）：全部依赖 Phase 2 完成后才能开始；建议优先完成 US1（MVP），再并行推进 US2/US3/US4
- Phase 7（Polish）：依赖所有选定用户故事完成后再收敛

### User Story Dependencies

- US1（P1）：无其他故事依赖（推荐先做 MVP）
- US2（P2）：可与 US1 并行，但其导出/校验应以 US1/Phase 2 的稳定标识与 dirty 语义为前提
- US3（P3）：可与 US1/US2 并行；但 `off/light/sampled/full` 与 SlimOp 改动会影响基线与 Devtools，因此建议尽早完成（P0）
- US4（P4）：依赖 Phase 1 的 perf 证据与脚本（T001–T002），并在关键改动前后各跑一次（T023/T024）

### Parallel Opportunities

- 任何标记 `[P]` 的任务可并行推进（不同文件、弱依赖）

### Parallel Examples

#### US1

```bash
Task: "T014 [US1] ... /Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/test/StateTrait.ConvergeDirtySet.test.ts"
Task: "T015 [US1] ... /Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/test/StateTrait.ConvergeDirtySet.test.ts"
```

#### US2

```bash
Task: "T018 [US2] ... /Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/state-trait/build.ts"
Task: "T019 [US2] ... /Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts"
```

#### US3

```bash
Task: "T020 [US3] ... /Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/Middleware.ts"
Task: "T021 [US3] ... /Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/core/DebugSink.ts"
Task: "T022 [US3] ... /Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/test/Runtime.Devtools.test.ts"
```

#### US4

```bash
Task: "T023 [US4] ... /Users/yoyo/Documents/code/personal/intent-flow/specs/009-txn-patch-dirtyset/perf.md"
Task: "T024 [US4] ... /Users/yoyo/Documents/code/personal/intent-flow/specs/009-txn-patch-dirtyset/perf.md"
```

---

## Implementation Strategy（MVP 优先）

- 先完成 Phase 1/2，确保稳定标识、诊断分档、路径归一化、冲突裁决都已落地。
- 优先完成 US1（MVP）端到端闭环（T014–T017），让增量调度具备可解释的最小价值。
- 并行推进 US3（T020–T022）与 Phase 7 的 Devtools/React 对齐（T028–T030），尽早清理“不可序列化/吞错”风险，避免污染基线与排障链路。
- US2（T018–T019）在 MVP 稳定后推进，将导出/校验的 IR 变成平台/Devtools 唯一事实源。
- US4 的 Before/After（T023/T024）按 `spec.md` 的统计口径执行并写入 perf.md，作为回归判断依据。
