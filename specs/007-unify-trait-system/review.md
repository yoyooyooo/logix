# Review: 007-unify-trait-system（实施后复盘 · 状态已消化）

> 更新：2025-12-14  
> 原则：本文件只保留仍需推进/需决策的事项；已完成或已过时项会标记并收敛到最小证据。

与全库 review 的对齐：本文件的 `[Next]` 项已同步纳入 `docs/reviews/99-roadmap-and-breaking-changes.md` 的 Phase 1/2 行动项，避免“Spec 复盘待办”与“全局不兼容路线图”两套清单并行漂移。

## 状态总览

- [Done] Form 默认 wiring：`blur` / `setValue` → `TraitLifecycle.scopedValidate`（含 `list.item` path 支持）
- [Done] `useFieldArray` 稳定 key：优先 RowID（`RowIdStore.ensureList/getRowId`）
- [Next] Demo 的 errors 事实源口径：从“computed 写 `errors.*`”迁到 “check(writeback=errors) + scopedValidate”
- [Outdated] Query env：已统一使用 `Logix.Env.isDevEnv()`
- [Done] config error diagnostic：`StateTraitConfigError` → `diagnostic(state_trait::config_error)` + 测试
- [Done] converge budget 可配置：`stateTransaction.traitConvergeBudgetMs`（Runtime/Module 两级）
- [Done] 脏集传播/最小触发：`stateTransaction.traitConvergeMode="dirty"` + `dirtyRoots`（基于 deps 的最小调度）
- [Outdated] React selector 订阅模型：已迁到 ExternalStore + `trace:react-selector` 事件口径
- [Done] React 分形模块：支持从父实例 scope 解析 imports 子模块（`useImportedModule`）
- [Done] React 分形模块：链式语法糖 `host.imports.get(ChildModule)`
- [Done] RowID：修复 `trackBy` 的 clone+reorder 盲区 + 回归
- [Outdated] tasks 勾选漂移：`T072` 已为 `[X]`
- [Done] Replay ↔ Debug：`state:update.replayEvent` 可关联最后一条 `ResourceSnapshot` + 测试
- [Next] Benchmarks（SC-005）与 Devtools E2E 回放测试

## 1) US1 Form-first 默认逻辑闭环

### 1.1 `Form.install` 默认行为

**状态**：[Done]

- 落点：`packages/form/src/logics/install.ts`
- 说明：`setValue/blur` 触发 `scopedValidate`；对 `items.0.x` 这类 path 会自动转为 `item` ref（便于 ReverseClosure 做最小校验集合）。

### 1.2 Form React `useFieldArray` 的 key 稳定性

**状态**：[Done]

- 落点：`packages/form/src/react/useFieldArray.ts`
- Demo：`examples/logix-react/src/demos/ComplexTraitFormDemoLayout.tsx`

### 1.3 Complex Form Demo 的 errors 事实源

**状态**：[Next]

- 现状：`examples/logix-react/src/demos/ComplexTraitFormDemoLayout.tsx` 仍用 computed 写 `errors.*`
- 问题：示例口径会误导「errors 是任意派生字段/可随便写」，削弱 Form-first 的统一心智（`scopedValidate` → ReverseClosure → `errors.*` 同构树），也会让后续 Devtools/回放把 errors 当“标准产物”时缺少一致的事实源。
- 决策点（需要先拍板，否则不建议让 LLM 自行发挥）：
  1) 是否将 `errors` 视为“只读派生产物”：只允许由 `check(writeback=errors)` 写回（推荐）？
  2) 错误树清理语义：rule 返回 `undefined` 是否表示“清除该规则错误”；当节点下无剩余错误时是否裁剪子树；数组场景按 index 还是 rowId（当前建议先按 index）。
  3) 现有 demo 是否需要保留“computed 可写任意字段（含 errors）”作为高级玩法？若保留，必须显式标注“非推荐口径”。
- 拆分需求建议（可直接复制为 ticket）：
  - Ticket US1-Demo-Errors-SSOT：Form-first errors 事实源示例对齐
    - 目标：提供一个清晰 demo，完整演示 “`check(writeback=errors)` + `scopedValidate`” 的触发/写回/清理；避免 computed/reducer 二次干预 errors。
    - 方案 A（推荐，风险最小）：新增独立 demo（例如 `FormFirstValidationDemo`），只展示推荐口径；现有复杂 demo 保留为“高级能力”，但 UI 文案必须声明它不是推荐的 errors 事实源。
    - 方案 B（更激进）：直接改造现有 `ComplexTraitFormDemoLayout`，将所有 errors 写入迁到 check，并在 UI 中展示「哪些字段触发了哪些 rule」与清理效果。
    - 验收：用户只改一个字段时，仅相关校验规则生效（ReverseClosure 最小集合）；errors 能随 blur/valueChange/submit 正确出现与清除；数组场景至少覆盖 `items.0.x` 的 item-scope 校验写回。
    - 参考落点：`packages/logix-core/src/internal/state-trait/validate.ts`、`packages/form/src/logics/install.ts`、`examples/logix-react/src/demos/ComplexTraitFormDemoLayout.tsx`

## 2) Runtime / Kernel 相关

### 2.1 converge budget 配置化

**状态**：[Done]

- API：`RuntimeOptions.stateTransaction.traitConvergeBudgetMs`；`ModuleRuntimeOptions.stateTransaction.traitConvergeBudgetMs`
- 覆盖：`packages/logix-core/test/StateTrait.ConvergeBudgetConfig.test.ts`

### 2.2 Replay ↔ Debug 对齐（`replayEvent`）

**状态**：[Done]

- 行为：事务内记录最后一条 `ReplayLogEvent`（当前为 `ResourceSnapshot`），并挂到 `state:update.replayEvent`
- 覆盖：`packages/logix-core/test/StateTrait.ReplayEventBridge.test.ts`

### 2.3 脏集传播/最小触发（US2 / T034）

**状态**：[Done]

- 行为：
  - 新增 `stateTransaction.traitConvergeMode: "full" | "dirty"`（默认 `full`）
  - `dirty` 模式下：基于事务窗口内 `dirtyPaths`（字段级 patch 路径）与 computed/link 的 `deps` 做最小触发，只执行必要 writer
  - 若本窗口只有 `"*"`（未知粒度写入），则退回全量调度；若同时存在 `"*"` 与具体路径，则忽略 `"*"`（避免遮蔽细粒度收益）
- 可观测：
  - `traitSummary.converge` 追加：`mode` / `totalSteps` / `skippedSteps` / `dirtyRoots?`
- 当前粒度：
  - dirtyRoots 归一：遇到 `items[]` 或数字下标（如 `items.0.x`）会折叠为 list 根路径（如 `items`），属于“安全但偏粗”的最小实现；后续如需 rowId/trackBy 级别更精细 dirty，需要单独开需求承接。

### 2.4 分形模块（imports）缺失时，`$.use(ChildModule)` 的报错可读性

**状态**：[Done]

- 落点：`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`
- 行为：dev/test 下若 `$.use(ChildModule)` 找不到实现，会抛 `MissingModuleRuntimeError`，并输出 `requested/from` 与明确修复建议（`imports: [Child.impl]` 或 root layer 提供）。
- 覆盖：`packages/logix-core/test/BoundApi.MissingImport.test.ts`

### 2.5 React：从父实例 scope 解析 imports 子模块（分形模块）

**状态**：[Done]

- 动机：Query 本质是 Module；当 Query 作为子模块被多个父模块实例 imports 时，组件侧读取/派发必须显式绑定到“父实例 scope”，否则容易串实例。
- API：`useImportedModule(parentRef, ChildModule)`（默认 `mode="strict"`；可选 `mode="global"` 用于全局单例语义）
- 约束：`host.imports.get(ChildModule)` 返回稳定 `ModuleRef`（WeakMap 缓存），可直接写在 render 中；单测覆盖 `packages/logix-react/test/hooks/useImportedModule.test.tsx`
- 落点：`packages/logix-react/src/hooks/useImportedModule.ts`
- 覆盖：`packages/logix-react/test/hooks/useImportedModule.test.tsx`

## 3) RowID / 数组语义

### 3.1 `trackBy` 下 clone+reorder 误判

**状态**：[Done]

- 修复：`trackBy` 场景下优先使用 key 序列判断“是否重排”，避免引用级 fast-path 误判
- 覆盖：`packages/logix-core/test/StateTrait.RowIdMatrix.test.ts`

## 4) Benchmarks / E2E 回放

### 4.1 性能基准（SC-005）

**状态**：[Next]

- 背景：`specs/007-unify-trait-system/spec.md` 中的 **SC-005** 需要一个可重复执行的 benchmark 来验证“规模 10x 时局部输入的 95% 劣化不超过 2x”。当前仓库缺少统一的 benchmark 入口/场景生成器/输出格式。
- 关键决策（需要先定口径，避免 benchmark 变成一次性脚本）：
  1) 是否作为 CI gate（强制阈值）？建议先“产出报告不 gate”，后续再固化阈值。
  2) 指标口径：至少包含 `converge.totalDurationMs` 的 p50/p95、`executedSteps/totalSteps/skippedSteps`、降级次数（budget/runtime_error），以及一次交互总耗时。
  3) 1x/10x 的放大策略：建议同时放大规则数/依赖深度/数组长度，确保单次输入触发的依赖边数接近 10 倍。
- 拆分需求建议（可直接复制为 ticket）：
  - Ticket SC-005-Benchmark-TraitConverge：Trait converge 压力基准
    - 方案：新增 `benchmarks/`（或 `packages/logix-core/benchmarks/`）+ `pnpm bench:trait` 脚本；生成合成模块（N rules / depth / array length），warmup 后采样 `traitSummary.converge` 并输出 JSON 报告。
    - 需要覆盖：`traitConvergeMode: "full"` vs `"dirty"` 的对比（注意：若事务里只有 `"*"` 粒度的写入，dirty 会退回全量调度；想体现 dirty 收益需要字段级 dirtyPaths 或 demo/action payload.path 作为脏源）。
    - 验收：本地可一键运行、自动结束、无网络；输出包含 1x/10x、p50/p95、full/dirty 对比，并能复现实验参数。
    - 参考：`packages/logix-core/src/internal/state-trait/converge.ts`、`docs/specs/drafts/topics/runtime-readiness/01-watcher-perf-check.md`

### 4.2 Devtools 端到端回放（Record → Serialize → Replay → Verify）

**状态**：[Next]

- 背景：当前 ReplayMode 已有单测（`packages/logix-core/test/ReplayMode.*.test.ts`），但缺少跨会话的“证据包”与端到端校验链路：Record → Serialize → Replay → Verify。没有这条链路，就很难把 Devtools 的记录/回放当成稳定能力对外承诺。
- 关键决策（必须先定，否则不同实现会彼此不兼容）：
  1) 证据包包含哪些字段？建议最小：`ReplayLogEvent[]` + initialState + finalState；进阶再加 Debug 时间线（`Debug.Event[]`）。
  2) 序列化边界：是否要求 JSON-safe？`Error/Cause` 等不可 JSON 的对象如何降阶（推荐结构化为 `{name,message,stack}`）。
  3) 回放时 `runtimeId/moduleId` 的对齐策略：事件里保留录制值还是覆盖为当前 runtime？（建议事件保留原始值，但验收断言不要求 runtimeId 相等，只要求语义字段相等）。
- 拆分需求建议（可直接复制为 ticket）：
  - Ticket Devtools-E2E-EvidenceReplay：证据包序列化 + 回放一致性测试
    - 方案：新增 `EvidencePack`（encode/decode）+ 新增集成测试：录制场景（含 source snapshot 序列与 link/computed）→ `JSON.stringify/parse` roundtrip → replay 模式运行同一入口 → 断言最终 state 一致 + `state:update.replayEvent` 语义对齐。
    - 验收：测试稳定通过；证据包可 JSON roundtrip；回放结果与录制一致。
    - 参考：`packages/logix-core/src/internal/runtime/core/ReplayLog.ts`、`packages/logix-core/src/internal/runtime/core/DebugSink.ts`、`packages/logix-core/src/internal/state-trait/source.ts`

## 下一步建议（按价值/风险排序）

1. 明确并落地 demo 的 errors 事实源口径（US1 对外示例）
2. 建立可参数化 benchmark（SC-005）
3. 增补 Record→Serialize→Replay→Verify 的 E2E 测试
