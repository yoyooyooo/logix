# Implementation Plan: 039 Trait Derived Converge Perf & Diagnostics Hardening

**Branch**: `039-trait-converge-perf` | **Date**: 2025-12-26 | **Spec**: `specs/039-trait-converge-int-exec-evidence/spec.md`
**Input**: Feature specification from `/specs/039-trait-converge-int-exec-evidence/spec.md`

## Summary

在不改变对外语义（单操作窗口 0/1 commit、事务窗口禁止 IO、稳定标识、统一最小 IR）前提下，把 `StateTrait.converge` 的“整型优化”从现有的 **决策/计划层**（FieldPathId + topo + Int32Array plan）一路打穿到 **执行层**（预编译访问器 + 草稿复用 + bitset/SoA），并提供可复现的性能基线与可解释诊断证据。

交付形态：

- 运行时内核：执行热路径显著降分配、降 CPU；诊断 off 时近零额外开销。
- 证据与协议：不另起一套 converge 证据口径，继续以 `trait:converge` 的可序列化事件为事实源（契约以 `specs/013-auto-converge-planner/contracts/` 为准）。
- 性能基线：新增 converge 专项基线（Node + 至少 1 个 headless browser run），并把 Before/After/Diff 证据落到本 feature 的 `specs/039-trait-converge-int-exec-evidence/perf/*`。

## Technical Context

**Language/Version**: TypeScript 5.8.2（pnpm workspace）
**Primary Dependencies**: `effect` v3、`@logixjs/core`、`mutative`（draft/produce）
**Storage**: N/A
**Testing**: Vitest（必要时 `@effect/vitest`）
**Target Platform**: Node.js 22.x + modern browsers
**Project Type**: monorepo（packages + examples + specs）
**Performance Goals**:

- 在 converge 专项基线下（详见 Phase 1），常见“局部 dirty”场景：p95 time ≥ 3× 改善、heap/alloc delta ≥ 5× 改善；
- “near-full / dirtyAll” 场景：p95 time ≥ 1.5× 改善；
- 诊断关闭（Diagnostics Level=off）时，本特性引入的额外开销 ≤ 3%（time 与 heap/alloc delta）。

**Constraints**:

- 语义红线：单窗口 0/1 commit、事务窗口禁止 IO、配置错误硬失败、运行时错误/超预算软降级回退 base（不提交半成品）。
- IR/协议红线：统一最小 IR（Static IR + Dynamic Trace）、稳定标识去随机化（`instanceId/txnSeq/opSeq`）、诊断事件 Slim 且可序列化。
- 不引入第二套订阅/观测通道；所有“中间态观测”只能走 Debug/Devtools（`trait:*` trace 事件）。

**Scale/Scope**:

- 以 `packages/logix-core/src/internal/state-trait/converge.ts` 为核心热路径，覆盖 dirty 计划生成、执行循环、patch/dirty 记录与 `trait:converge` 证据导出。
- 不扩展 list.item scope 的派生执行（另开特性），不改变用户 `computed.derive(state)` 编程模型。

## Budget & Gate Mapping（补齐口径，避免术语漂移）

- **Runtime decision budget（安全降级预算）**：用于限制单窗口内 converge 的最坏规划/执行成本（`budget cutoff` / `decisionBudgetMs` 等），耗尽时必须走可解释降级（对齐 `FR-006/SC-006`）。
- **Perf budgets（性能判门预算）**：用于验收与回归门禁（time/heap delta/overhead），SSoT 以 `$logix-perf-evidence` 的 `.codex/skills/logix-perf-evidence/assets/matrix.json` 为准（runs/warmup/profile + suite budgets/comparisons）。
- **039 的验收组合拳**：
  - 以 `spec.md` 的 `SC-002/SC-003/SC-005` 作为“本特性收益/无负优化”的硬门；
  - 以 matrix 的 `limitBudgetId` 与 `stability.maxP95Delta*` 作为“宿主抖动/跑道质量”的护栏（不用于替代 `SC-*`，而是用于解释与阻断不可用样本）。

## Negative Optimization Guardrails（必须显式守住）

> 结论：本特性是“整型链路打穿”的工程化落地，**不允许**停在“只做了 ID 但执行仍走 string split/join”这类中间态；否则极易出现比原版更慢的负优化。

- **Guardrail 1：runWriterStep 的最后半公里必须打穿（严禁 split）**
  - 风险现状：`packages/logix-core/src/internal/state-trait/converge.ts` 的 `runWriterStep` 目前依赖 `getAtPath/setAtPathMutating`，内部直接 `path.split('.')`。
  - 要求：Exec IR 必须包含“预编译访问器”（至少是预分段的 `FieldPath`/segments；更激进可为 get/set lambda），`runWriterStep` 必须用 pathId/stepId 直接驱动访问与写回，**不得**把 id 还原为 string 再 split。

- **Guardrail 2：事务内禁止 string↔array 的往返（严禁 join→split 反复解析）**
  - 风险现状：`packages/logix-core/src/internal/runtime/core/StateTransaction.ts` 的 `StatePatch.path` 目前强类型为 `string`，而 `normalizeFieldPath` 对 string 必然 `splitSegments`。
  - 要求：为了实现“源头零拷贝”（Decision 8），必须放宽内核契约：`StatePatch.path` 允许携带 `FieldPath`（数组段形式），并让 `setStateInternal/updateDraft` 能透传数组路径直到 commit/证据边界；仅在需要对外序列化时 materialize string。

- **Guardrail 3：阶段性落地策略（防止半成品合入）**
  - 若需要阶段性合入：必须保持 legacy 路径作为默认，并把新路径置于显式开关/分支之下；在 Guardrail 1/2 完成前禁止切换默认。
  - 每次切换关键分支（例如启用 Exec IR driver loop 或启用“源头零拷贝”）前必须先跑一轮 quick bench，若出现回归视为 blocker（以证据裁决，不接受“体感应该更快”）。

- **Guardrail 4：mutative draft 复用语义必须先被验证（避免语义漂移）**
  - 风险现状：当前实现是“每 step 调一次 `mutative.create`”，改为“每 converge 单次 create + 多次 mutate”后，必须确认嵌套路径的写入语义一致（Node vs browser 宿主也要一致）。
  - 要求：在切换到“单 draft 多次 mutate”之前，先用 micro-benchmark/回归用例验证：
    - 多次写入同一 draft 的深层路径结果符合预期；
    - budget/error rollback 时直接丢弃 draft 引用回退 base（禁止尝试“撤销 draft”）；
    - 性能不得出现“单 draft 反而更慢”的中间态：至少对比 A/B（per-step create vs single draft）在 Node + headless browser 下的 p95 time 与分配趋势；若 B 回归，则保持 A 为默认路径（B 可作为可选路径或直接放弃，避免引入潜在负优化）。
    - 兼容性：确认当前 `mutative` 版本对“单 draft + finalize”复用模式支持稳定（行为与性能都要证据裁决）。

- **Guardrail 5：diagnostics=off 必须足够激进（避免隐形分配）**
  - 要求：diagnostics=off 下必须跳过 `steps.push(...)`、stepLabel/traceKey 拼接与 topN 统计等所有“只为解释而存在”的分配；top3 计算必须用 O(n)（linear scan / small heap），禁止 `slice().sort()` 的 O(n log n) 长尾抖动。

- **Guardrail 6：EffectOp 中间件 fast path（按证据决定是否下探）**
  - 风险现状：每 step 构造 `EffectOp` + 遍历 middleware stack（即使为空）在大步数场景会放大分配与 CPU。
  - 策略：若证据表明该点仍主导 p95，可在 `stack.length===0` 时直接执行 body（循环外一次性分支），绕过 `EffectOp.run`；否则保持现状以避免引入额外分支与协议耦合。

- **Guardrail 7：bitset 复用与清零成本要可量化（避免 new Uint32Array 每窗口分配）**
  - 要求：bitset 默认应复用 buffer，并在 converge 开始 clear（`fill(0)` 或等价）；若 FieldPathId 数量过大导致 clear 成本显著，必须以证据裁决是否需要阈值降级（回退 Set）或引入“touched words”清零优化。

- **Guardrail 8：budget 检查也要“低成本”（采样 + loop 外分支）**
  - 风险现状：`packages/logix-core/src/internal/state-trait/converge.ts` 的执行循环当前会频繁调用 `ctx.now()` 做预算检查与计时；在 diagnostics=off/热路径极致优化后，这可能成为“剩余的主要热开销”，抵消整型化收益。
  - 要求：执行预算检查必须支持按 step 计数采样（例如每 32/64/1024 steps 才读一次 clock），并将“采样 vs 严格”分支搬到循环外（一次性选择快路径）；采样仍必须保持“安全降级”语义（超预算回退 base、不提交半成品），且 overshoot 需在 evidence 中可解释。
  - 裁决：只有当 before/after 证据显示 budget 检查仍主导 p95 时才启用更激进的采样；否则保持简单实现，避免引入分支预测负担或行为口径漂移。

- **Guardrail 9：light 模式下 patch 记录必须零分配（Argument-based recording）**
  - 风险现状：当前 `recordPatch(patch)` 的调用点（如 converge/reducer/source/validate）在 `instrumentation=light` 下虽然不会保留 `patches`，但仍会先分配 `{ path, from, to, reason, stepId }` 对象；在高频窗口里会放大 GC 与长尾抖动。
  - 要求：`instrumentation=light` 下必须支持“参数形式记录”（`recordPatch(path, from, to, reason, stepId?)` 或等价 API），直接写入 dirtyPaths/roots，禁止为了兼容而在调用点先创建 patch 对象；并且**禁止**用 `...args`/rest 参数实现（会分配数组），应使用显式参数或预绑定 `recordPatchFull`/`recordPatchLight` 并将分支搬到 loop 外。
  - 对齐：该点与 Guardrail 2（`StatePatch.path` 支持 `FieldPath`、事务内禁 join→split）同属“源头零拷贝/零往返”链路的一部分：light 模式不应为了 dirty-set 而 materialize string 或 patch 对象。

## 预期收益与高风险中间态（审查结论收编）

- **高信心纯赚（应作为默认收益来源）**：bitset 替代 `Set<number>`、Exec IR 预分段 accessors（移除 `split('.')`）、`topoOrderInt32` 复用、plan cache key 复用、diagnostics=off 零分配闸门、light 下 argument-based `recordPatch` 零分配。
- **需要证据裁决的中风险点（可能带来负优化）**：single draft（`mutative.create(base)`）复用模式、极端大 N 下 bitset `clear()` 成本、budget 检查采样的分支预测与 overshoot 解释成本、EffectOp 空栈 fast path 是否值得下探。
- **最大负优化陷阱（必须阻断）**：整型链路只做了一半（id→string→split 回环、事务内 join→split 往返、light 仍分配 patch 对象/数组），这类“半成品态”通常比原版更慢。
- **对应防线**：以 Guardrails 1/2/3/4/7/8/9 为硬约束；并在 `tasks.md` Phase 8 用 quick checkpoints/对抗场景补齐证据，确保每次关键默认切换都能被 Before/After/Diff 拦住。

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Answers (Pre-Design)

- **Intent → Flow/Logix → Code → Runtime**：本特性聚焦 Runtime 内核的派生收敛执行面；对外仍以 Trait/Txn/Devtools 的统一链路表现为验收边界，优化必须能被基线与证据解释。
- **Docs-first & SSoT**：converge 证据协议以 `specs/013-auto-converge-planner/contracts/` 为裁决；trace 事件语义以 `.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md` 为裁决；性能证据框架以 `$logix-perf-evidence`（PerfReport/PerfDiff + matrix + collect/diff）为单一事实源。
- **Contracts**：本特性默认不修改 `trait:converge` 事件 shape；如确需新增字段，必须同步更新 013 的 schema（而不是在 039 复制一份）并更新对应 runtime 文档。
- **IR & anchors**：继续使用现有 `ConvergeStaticIrRegistry`（FieldPathId/steps/topo）；新增的“执行 IR/访问器表”仅作为 internal 加速层，不成为新的对外真相源；Static IR 导出仍保持 Slim 且可序列化。
- **Deterministic identity**：诊断与 EffectOp meta 继续使用稳定 `instanceId/txnSeq/opSeq`；禁止引入随机/时间默认值作为排序锚点。
- **Transaction boundary**：不在 converge 内引入 IO/async；任何 async escape 必须仍能被事务诊断捕获。
- **Internal contracts & trial runs**：不新增 process-global 依赖；任何新增协作点优先通过现有 Runtime internals/service 注入边界承载，保证可在 RunSession 下隔离试跑并导出证据。
- **Performance budget**：触及核心路径（txn submit 前 converge）；必须先落基线再优化，且提供 Before/After/Diff；引入的自动策略（如 planner cache/阈值）必须可解释且可配置。
- **Diagnosability & explainability**：`trait:converge` evidence 必须能解释“为什么触发/执行了多少/是否命中缓存/为何降级”；Diagnostics off 时不得产生显著分配或 O(n) 扫描。
- **User-facing performance mental model**：若本特性改变了外部可感知的性能边界或策略口径，需要同步更新对外文档的关键词/成本模型/优化梯子，并保持与证据字段一致（不做同义词漂移）。
- **Breaking changes**：不引入对外 API/事件协议破坏；如发生不可避免的协议调整，必须给迁移说明且不保留兼容层。
- **Public submodules**：改动落在 `packages/logix-core/src/internal/**` 与既有子模块内部实现；不新增对外 export。
- **Quality gates**：合并前至少通过 `pnpm typecheck`、`pnpm lint`、`pnpm test`；涉及 browser 侧证据链时再追加 `pnpm test:browser`（禁止 watch）。

## Project Structure

### Documentation (this feature)

```text
specs/039-trait-converge-int-exec-evidence/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── README.md
└── tasks.md             # Phase 2 output ($speckit tasks)
```

### Source Code (repository root)

```text
packages/logix-core/src/internal/state-trait/
├── build.ts             # ConvergeStaticIrRegistry 构造（FieldPathId/steps/topo）
├── converge-ir.ts       # ConvergeStaticIrRegistry 类型与导出
├── converge.ts          # 收敛决策 + 执行热路径（本特性主落点）
├── plan-cache.ts        # planner cache（命中率保护/禁用）
└── ...

packages/logix-core/src/internal/runtime/core/
├── ModuleRuntime.transaction.ts   # 提交前 converge 入口与预算/证据桥接
├── StateTransaction.ts            # dirtyPaths/patches/0-1 commit 的事务事实源
└── DebugSink.ts                   # trace:trait:* -> trait:*（JsonValue 投影与 light 裁剪）

.codex/skills/logix-perf-evidence/
├── scripts/bench.traitConverge.node.ts   # converge 专项 Node 基线 runner（含 heap delta）
├── scripts/collect.ts                   # headless browser collect（合并多 suite）
└── scripts/diff.ts                      # Before/After diff

specs/013-auto-converge-planner/contracts/
└── schemas/                         # trait:converge evidence schema（本特性输入/口径）

.codex/skills/logix-perf-evidence/assets/
├── matrix.json                       # perf matrix（suite/axes/budgets/comparisons）
└── schemas/                          # perf-report/perf-diff schema（单一事实源）
```

**Structure Decision**: 039 的实现只落在 logix-core 的 state-trait/txn/observability 既有链路中；证据契约复用 013，性能证据框架统一复用 `$logix-perf-evidence`；本 spec 目录只固化“规划、设计产物与证据归档”，不发明第二套协议。

## Phase 0 - Outline & Research

输出：`research.md`

- 明确“整型一路打通”的分层边界：Static IR（build）/ Planner（dirty plan）/ Exec IR（访问器表）/ Driver loop（draft+bitset）/ Evidence（trace）。
- 盘点并量化“字符串往返”的入口热点：`mutative` patch `pathAsArray → join('.')`、txn/commit 的 `dirtyPaths(Set<string>) → split/normalize/canonicalize`；在 Node + browser 基线中验证其是否主导 p95/分配与 GC 抖动。
- 核实 `mutative.create(base)` 的 “draft + finalize” 复用模式在当前版本（仓库实际依赖）下行为稳定，并验证其在 Node 与浏览器宿主上的一致性与收益。
- 统一基线口径：time + heap/alloc delta（warmup/runs/样本裁剪/元信息）；明确 Diagnostics off/light/full 的对比矩阵。
- 明确 contracts 归属：`trait:converge` schema 的变化只能在 013 做；039 只写引用与本特性的 evidence 约束补充。
- 盘点并消除“整型链路内的重复分配点”（纯赚）：例如每次 dirtyAll 分支 `Int32Array.from(ir.topoOrder)`、plan 生成阶段 `number[] → Int32Array.from(plan)`、cache key 的 `Int32Array.from(rootIds)`；优先通过“预生成/复用 TypedArray + 明确只读约束”消除。

## Phase 1 - Design & Contracts

输出：`data-model.md`、`contracts/`、`quickstart.md`

### 1) Execution IR（整型打穿到执行层）

- 在 `ConvergeStaticIrRegistry` 之上定义 internal 的 Exec IR：
  - `stepOutPathId` / `stepDepPathIds`（Int32Array + offsets，避免嵌套数组分配）
  - `pathSegmentsById`（复用 registry.fieldPaths：`FieldPath = string[]`，避免 `split('.')`）
  - `stepKind` / `derive` / `equals` 的紧凑表（SoA）
  - `topoOrderInt32`（Int32Array）：full 模式与 dirtyAll 分支可直接复用，避免每窗口 `Int32Array.from(ir.topoOrder)` 的重复分配
- 目标：driver loop 不再依赖字符串 path 解析，不再每 step 创建新对象图。
- 生命周期约束：Exec IR 必须是 per-program-generation 的加速视图（可挂在 `program.convergeIr` 上并按 generation 失效），不得做 process-global 缓存；模块实例销毁或 generation bump 后应可被 GC 回收。

### 1.5) Dirty Ingress / Txn / Patch 的整型化（中收益以上，但影响面更广）

目标：把“热路径入口的脏信息”也尽可能从字符串形态收敛到稳定的数值 ID，以减少 normalize/sort/canonicalize 的分配与 O(n log n) 成本；同时保证对外语义与观测协议不变。

现状（主要热分配点）：

- `mutative` patch 默认以 `pathAsArray` 产出，但源头仍会 materialize 字符串 path（`join('.')`），随后 converge/commit 又会再次 `split('.')` 做归一化与 canonicalize（典型“字符串往返”）。
- txn 在 instrumentation=light 下也会保留 `dirtyPaths:Set<string>`（虽然不保留完整 patches），因此“只为了 dirty-set 而生成字符串”在 high-frequency mutate 场景里容易放大 p95/长尾抖动。

- converge 入口（txn→converge）新增 internal 形态：`ConvergeDirtyInput`（`dirtyAll` + `rootIds(Int32Array)` + 可选 `rootBitset`），并提供 string fallback：
  - 若 txn 能提供 `dirtyRootIds`（已是 FieldPathId 列表）→ 直接走整型路径；
  - 否则仍按现有 `dirtyPaths(Set<string>) → dirtyPathsToRootIds` 走（保守兼容），并在证据里标注 fallback 原因（用于决定是否继续下探）。
- txn 侧补齐“可提供 dirtyRootIds”的落点：
  - 在 `StateTransaction` 内部保留 `dirtyPaths:Set<string>` 作为最终 dirtySet 的事实源，同时**可选**增量维护 `dirtyRootIds`/`dirtyAllReason`（基于 `ConvergeStaticIrRegistry.fieldPathIdRegistry`）。
  - 关键前提：build 阶段的 `fieldPaths` 已按 `compareFieldPath` 排序，`FieldPathId` 因而是稠密且“prefix 在前”的稳定序；因此 roots 的 canonicalize 可用 `id sort + prefix check(fieldPathsById)` 完成，避免重建 `FieldPath[]`。
  - 启用策略（防负优化）：默认仅在 txn instrumentation=light 或 diagnostics=off 时启用 rootIds 维护；full 模式保留现状（需要完整 patch 证据），但允许并行维护 rootIds 作为后续加速依据。
  - 回退策略（保守可解释）：任一路径不可追踪/不可映射/registry 缺失 → 立刻 `dirtyAll=true` 并记录 `dirtyAllReason`（`nonTrackablePatch/fallbackPolicy/unknownWrite/customMutation`），同时停止本窗口的 rootIds 维护；converge/commit 走既有 full/fallback 语义。
  - 微优化（纯赚）：txn 内维护 `hasSpecificDirtyPath:boolean` / `hasDirtyAll:boolean` 等 O(1) 标志位，避免诸如 `setStateInternal` 为判断“是否已有字段级 dirty”而遍历 `dirtyPaths:Set<string>`。
- commit dirtySet 快速路径：当 txn 已具备“可解释且完整”的 canonical roots（例如已有 `dirtyRootIds` 且未触发 dirtyAll/fallback）时，允许直接 materialize `dirtySet.paths` 并复用（跳过二次 normalize/canonicalize）；否则回退现有 `dirtyPathsToDirtySet`。
- diff/patch 源头避免字符串往返：对 `mutative` 的 patch `pathAsArray` 结果，优先在 txn 内直接映射到 `FieldPathId`（并做 roots/prefix 的 canonicalize），在 instrumentation=light 或 diagnostics=off 时不应为了 dirty-set 而 `join('.')`/`split('.')`；仅在需要对外序列化/调试展示时才 materialize string。
  - 为了避免“每笔写入都 parse”，`StatePatch.path` 必须允许携带 `FieldPath`（数组段形式），并让 txn 内部尽可能透传 `pathAsArray`；commit/证据导出阶段再按需 `toPathString`。
- Argument-based recording（纯赚）：`recordPatch(patch)` 在 `instrumentation=light` 下应升级为“参数形式记录”，以避免调用点创建 patch 对象；full 模式再在事务内部 materialize `StatePatch` 对象并保留历史。
  - 约束：禁止使用 rest 参数（`recordPatch(...args)`）以免产生隐藏数组分配；应使用显式参数或预绑定 `recordPatchFull/recordPatchLight` 并把分支搬到 loop 外。
- 对 trait 写回（computed/link）这条内生链路：优先从 `stepOutPathId` 直接更新 `dirtyPrefixBitset` / `rootBitset`，避免再经过 `path` 字符串回环。
- plan cache key：避免每次 converge 都 `Int32Array.from(rootIds)` 分配；优先让 cache 接受 `ReadonlyArray<number>` 或复用 `Int32Array` key（保持 per-module-instance cache 语义 + 低命中率保护）。
- patch/trace 的 stepId：热路径内部只使用 `stepId:number`（Static IR 的 step index），仅在 instrumentation=full 或 diagnostics=light/full 需要序列化时才生成可读 string（避免每次 `computed:${fieldPath}` 拼接）。

> 边界（明确暂不做）：把整个 `StateTransaction` 的通用 patch/dirty 体系完全替换为 pathId（包含 reducer/devtools/customMutation 的全链路迁移）属于更大范围的协议/工具联动，先在本特性中以“converge 入口 + trait 内生写回直通”为主，后续再按证据决定是否扩面。

### 2) Driver loop（draft 复用 + bitset）

- 使用 `mutative.create(base)` 的 draft/finalize 形态：一次 converge 只创建一次 draft，step 内直接写 draft，保证后续 step 读取能看到前序更新；需要回退时丢弃 finalize 结果即可。
- dirtyPrefixSet 从 `Set<number>` 升级为 bitset（TypedArray），并预计算 prefix-id 列表，降低 trie Map 查找成本。
  - 约束：本仓 `FieldPathIdRegistry` 的 id 是按表顺序 0..N-1 分配（稠密），bitset 不会出现“稀疏导致浪费”的典型问题；仍需为极端 N 提供上界与降级路径（例如退回 Set）。
- 执行预算检查改为“快路径友好”：在 diagnostics=off 等快路径下避免 per-step 读 clock，用 step 计数器 + mask 采样读取 `now()`；仅在发生降级/接近预算或 diagnostics 需要逐步计时时才提高检查频率。
- 收敛 summary/topN：仅在需要时收集（例如 diagnostics=full 或发生降级），避免默认构造长数组与排序。

### 3) Evidence 与诊断开销控制

- `trait:converge` 事件保持现有字段语义，并在 diagnostics=light 下继续裁剪重字段（以 `DebugSink` 的 JsonValue 投影为准）。
- 明确“诊断开启的代价”测量方式，并把开销纳入基线对比。

### 4) Performance Baseline（可复现证据）

- 新增 converge 专项 runner（Node）并落证据文件到 `specs/039-trait-converge-int-exec-evidence/perf/*`：
  - 场景维度：local dirty / near-full / dirtyAll、diagnostics off/light/full、不同 step 数量档位。
  - 输出：统计（p50/p95）+ heap/alloc delta + 运行元信息（runs/warmup/版本/commit/dirty）。
- 新增至少 1 个 headless browser run（自动化）：
  - browser 基线必须同时覆盖：1 个业务型场景（`form.listScopeCheck`）+ 1 个可调合成场景（`converge.txnCommit`），用于满足 `FR-003/SC-001`；
  - 诊断开销证据（`NFR-002`）：复用 `diagnostics.overhead.e2e` suite（P3），用于量化 diagnostics off/light/full 的开销曲线；
  - 优先复用 `$logix-perf-evidence` 的 collect/diff；其中 P1（converge+form）可合并为同一份 report，而 diagnostics overhead 建议单独采集为独立 report（避免不同 suite 采用不同 runs/warmup 口径导致 meta 混淆）。

### 5) Plan Cache 生命周期与内存边界

- 现状 `ConvergePlanCache` 是 per-module-instance（LRU + 容量上界 + 低命中率自我保护），缓存内容仅为 `planStepIds`（Int32Array）。
- 本特性不把 Exec IR 放进 plan cache；Exec IR 的生命周期由 “program generation” 管理（generation bump => 失效），避免短生命周期模块导致缓存泄漏。

## Phase 1 - Constitution Re-check (Post-Design)

- Exec IR 与 driver loop 的新结构仅为 internal 加速层，不成为新的对外协议；`trait:converge` contract 仍以 013 为裁决。
- 诊断 off 的默认开销可被基线量化且满足预算；light/full 的裁剪与字段语义不漂移。
- dirty ingress 的整型化链路保持“保守可解释”：遇到不可映射/不可追踪写入必须降级 dirtyAll（并在 evidence 的 dirty.reason 与 reasons 中可归因），且必须可随时通过配置回退到旧路径以规避潜在负优化。
- 所有自动策略（near-full 阈值、cache 保护、budget cutoff）都能通过 evidence 字段解释原因与配置来源范围。

## Explicit Non-Goals (for this feature)

- 不改变用户 `computed.derive(state)` 的编程模型（不引入 slot/句柄读取 API）；如果未来要做到“用户逻辑也整型化”，必须另开特性并给迁移说明。
- 不实现 list.item scope 的按行派生执行（`items[].x`）；该缺口单独排期。
- 不引入“time-slicing/帧节流”的延迟收敛策略（会改变对外语义与调度心智模型）；见 `specs/043-trait-converge-time-slicing/`。
- 不引入“诊断采样（计时/统计）”的新档位或采样口径（会引入新字段/心智模型）；见 `specs/044-trait-converge-diagnostics-sampling/`。

## Complexity Tracking（债务/风险登记）

- **事务窗口边界与稳定标识**：新增/重构热路径后，必须用回归测试守住“禁止 IO/async + 可检测（`FR-002/NFR-004`）”与“去随机化 stable ids（`NFR-003`）”，避免优化引入不可回放/不可解释行为。
- **TypedArray/bitset 的内存边界**：bitset 默认假设 `FieldPathId` 稠密；若出现极端规模导致内存膨胀或清零成本上升，必须有阈值/降级（回退到 Set）并在 `trait:converge` evidence 中解释原因。
- **Exec IR 生命周期**：Exec IR 必须严格绑定 program generation；任何跨实例/跨代缓存都视为泄漏风险，只有在有 before/after 证据证明收益且可控时才允许引入。
- **FieldPathIdRegistry trie 升级（Backlog）**：`SegmentId + array-trie/compact DFA` 潜在收益更大但也更易负优化；仅在 after/diff 证据显示 trie Map 查找仍主导 p95 且现有 bitset/prefixIds 不足时才启用（对应 `tasks.md` 的 backlog 任务）。
