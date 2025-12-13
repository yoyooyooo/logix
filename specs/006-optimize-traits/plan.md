# Implementation Plan: 006-optimize-traits（Trait 事务内收敛“极致优化”）

**Branch**: `006-optimize-traits` | **Date**: 2025-12-13 | **Spec**: `specs/006-optimize-traits/spec.md`  
**Input**: `specs/006-optimize-traits/spec.md`

## Summary

本特性的目标不是“把单条 Trait 算快一点”，而是把 Trait 的派生更新**收敛到同一个 Operation Window（= 一次 action 派发）**里完成，从而把性能上限绑定到事务体系上，并兑现以下硬承诺：

- **每个 Operation Window 对外 0/1 次状态提交**：无可观察变化则 0 次；否则 1 次（SC-001 / FR-003）。
- **最小触发**：只执行“依赖命中”的规则；无依赖关系的规则触发次数为 0（FR-001 / SC-004）。
- **确定性 + 可解释**：同一输入序列结果一致；提供规则触发/跳过/Top3 高成本规则等诊断信号（FR-004 / FR-007）。
- **可预测失败语义**：冲突写回/循环依赖等配置错误硬失败（阻止本次提交）；运行时错误/超预算（默认 200ms）软降级（提交基础字段、派生字段冻结）+ 明确诊断（FR-006 / FR-014 / FR-015 / SC-005 / SC-008）。
- **观测与回归**：同时具备真实复杂表单基准 + 可调合成压力基准（10x 依赖边数）并可重复复现（FR-011 / FR-012）。

## Technical Context

**Language/Version**: TypeScript 5.x（ESM），Node.js 20+，effect v3  
**Primary Dependencies**: `@logix/core`、`@logix/react`、`@logix-devtools-react`、`effect`  
**Testing**: Vitest（含 `@effect/vitest` 风格），质量门：`pnpm typecheck` / `pnpm lint` / `pnpm test --filter @logix/core`  
**Target Platform**: 浏览器（示例/Devtools 验收）+ Node.js（测试/基准运行）  
**Project Type**: pnpm monorepo（核心改动主落点在 `packages/logix-core`，并联动 Devtools 与示例）

## Constitution Check

- Intent → Flow/Logix → Code → Runtime 映射：  
  - Intent/规范侧：本特性以 `specs/006-optimize-traits/spec.md` 为验收口径，明确 Operation Window 与 0/1 commit；  
  - Flow/Logix 侧：业务仍用 `traits` 槽位声明规则；  
  - Runtime 侧：在 `ModuleRuntime.dispatch` 的 StateTransaction 内完成派生收敛与一次性提交；Devtools 以 txnId 作为窗口锚点观测。
- 需要同步更新的事实源（docs-first）：  
  - `docs/specs/runtime-logix/core/05-runtime-implementation.md`（Trait/事务收敛语义、失败语义、预算/降级）；  
  - `docs/specs/runtime-logix/core/09-debugging.md`（Operation Window 诊断信号与 Devtools 展示约定）。  
- 质量门：以类型检查、lint、核心包测试作为 merge 前强制门槛，并新增针对 SC-001/SC-004/SC-005/SC-008 的用例与基准。

## Project Structure

### Documentation（本特性）

```text
specs/006-optimize-traits/
├── spec.md
├── plan.md
├── tasks.md
└── checklists/
    └── requirements.md
```

### Source Code（repository root）

```text
packages/logix-core/
├── src/internal/state-trait/         # Trait Program/Graph/Plan 与运行期执行（本特性主落点）
└── src/internal/runtime/             # ModuleRuntime/StateTransaction/Debug（事务语义与 commit 行为）

packages/logix-devtools-react/        # 消费诊断信号：Timeline/OverviewStrip/Inspector
examples/logix-react/                 # 真实复杂表单基准（ComplexTraitForm…）+ 合成压力基准
docs/specs/runtime-logix/             # 规范与实现语义更新
```

## Implementation Steps（分阶段实施方案）

### Phase 0（Baseline）：把“怎么衡量”先写死

1. **基准场景落点确认**  
   - 真实复杂表单基准：以 `examples/logix-react/src/demos/trait-txn-devtools-demo.tsx`（ComplexTraitForm…）为基准入口，固化可重复的输入序列与采集口径。  
   - 合成压力基准：新增一个可调生成器（规则规模 + 数据规模）并能定义“10x = 单次输入触发依赖边数约 10 倍”。
2. **指标采集口径固化**（与 Success Criteria 一一对应）  
   - 每窗口提交次数（state:update / txnId 分布）  
   - 触发规则数/跳过规则数/Top3 高成本规则  
   - 超预算/软降级触发率与影响范围  
   - 与字段无依赖的规则触发次数（用于 SC-004）

3. **把“真实复杂表单基准”固化为自动化回归用例**  
   - 新增一个 headless integration/regression test：`examples/logix-react/test/complex-trait-form.baseline.integration.test.ts`。  
   - 测试体用 `@logix/test` 跑 `ComplexTraitFormModule + ComplexTraitFormImpl`，执行一段固定的 action 序列（模拟输入/增删行/修改价格等），并断言两类结果：  
     - **语义正确**：关键派生字段（如 `profile.fullName`、`shipping.*`、`validation/errors/summary`）与预期一致；  
     - **结构指标**：对每个 action，`result.trace` 中 `_tag: "State"` 的增长量 ≤ 1（对应“每 Operation Window 0/1 次提交”的可观测近似）。  
   - 该用例用于锁死“真实场景下的 0/1 commit 语义 + 派生正确性”，避免后续重构把性能换成不可解释的行为。

输出：最小化的“基准运行说明 + 自动化回归用例 + 指标提取口径”，用于后续回归。

### Phase 1（Core）：事务内 Trait 收敛引擎（依赖图 + 脏集传播 + 固定点）

1. **规则编译与静态校验**（安装期一次性完成）  
   - 从 `StateTraitProgram` 编译出运行期 Rule IR（仅包含会写回的派生：computed/link；source 不进入派生收敛循环）。  
   - 构建索引：  
     - `targetPath -> rule`（用于冲突写回检测）  
     - `depPath -> rules[]`（用于最小触发）  
   - 静态校验：  
     - 同一 Operation Window 内“多写同一目标字段” → **配置错误硬失败**（FR-014）。  
     - 结构性循环依赖（在图上可判定） → **配置错误硬失败**（FR-006）。

2. **运行期收敛循环**（每个 Operation Window 执行一次）  
   - 输入：`initialState`、`baseDraftAfterReducer`、`dirtyPaths`（由 reducer 变更推导）、预算 `200ms`。  
   - 过程：对 dirtyPaths 进行传播；只运行“依赖命中”的规则；每次规则执行：  
     - 计算 next；与当前目标值做“对外可观察等价”判断；等价则跳过并计数；不等价则写回 draft、记录 Patch，并把 targetPath 加入 dirtyPaths。  
   - 停止条件：dirtyPaths 为空（fixed point）或触发失败策略：  
     - **配置错误**（冲突写回/循环/振荡）：终止窗口并阻止本次提交。  
     - **运行时错误/超预算**：终止派生，回滚到 `baseDraftAfterReducer`（派生冻结），允许提交基础字段，并记录软降级诊断。

3. **确定性与振荡检测**  
   - 规则执行顺序必须稳定（例如按 targetPath/stepId 排序），避免“依赖运气”。  
   - 为每个 targetPath 维护窗口内写回计数/指纹；超过阈值或检测到重复循环即判定振荡，按配置错误处理。

### Phase 2（Wiring）：把派生收敛纳入 Operation Window（dispatch 事务）

1. **dispatch 事务内执行顺序调整**（`ModuleRuntime.dispatch`）  
   - 在一次 `runWithStateTransaction({ kind: "action" })` 内执行：  
     1) 应用 Primary Reducer（基础字段写入草稿）  
     2) 执行 Trait 收敛引擎（派生字段写入草稿）  
     3) 记录 action:dispatch Debug 事件（txnId 作为 Operation Window id）  
     4) 发布 Action（watchers/flow）  
   - 目标：任何派生写回都不会再开启独立事务，不会产生额外 state:update；所有事件共享同一 txnId。

2. **移除 watcher 驱动的派生写回**（`StateTrait.install`）  
   - computed/link 不再注册 `onState` watcher（避免 commit 后再开新事务）。  
   - source 仍保留显式入口 `$.traits.source.refresh(fieldPath)`（它是独立 Operation Window），并与本特性保持一致的诊断/patch 语义。

3. **0 次提交语义落地**（SC-001）  
   - StateTransaction/ModuleRuntime 在“无可观察变化”时不得写入底层状态，也不得产出新的 `state:update` 事件；确保一次 no-op action 的提交次数为 0。

### Phase 3（Diagnostics & Devtools）：把“可解释”做成默认能力

1. **诊断事件模型**  
   - 为每个 Operation Window 产出一条聚合摘要（rulesTriggered/rulesSkipped/topCosts/status/budgetMs/elapsedMs）。  
   - 配置错误：输出明确的冲突目标字段/循环范围/建议动作，并绑定本次窗口 txnId（但本次窗口不提交）。  
   - 软降级：输出“已提交基础字段、派生冻结”的影响范围与原因（超预算/运行时错误）。

2. **诊断等级与保留策略**  
   - 默认高可观测：至少包含 per-rule 计时与 Top3；可切换到低开销摘要模式。  
   - 默认保留 60s 的诊断历史（本地），用于排查长尾抖动；超出窗口自动淘汰。

3. **Devtools 对齐**  
   - Timeline/OverviewStrip 的聚合以 txnId 为窗口；点击 bucket 仍可聚焦到窗口区间。  
   - Inspector 增加“本窗口 Trait 收敛摘要”展示（与 spec 中 SC-007 对齐）。

### Phase 4（Bench & Regression）：把“极致”变成可持续回归

1. **真实复杂表单基准**：验证 SC-002/SC-003/SC-007/SC-008。  
2. **合成压力基准（10x）**：验证 SC-006，并确保与 SC-004 的“无关规则不触发”可观测。  
3. **回归门禁**：新增用例覆盖冲突/循环/振荡/超预算/运行时错误路径，避免性能优化回退成“不可解释的快”。
