# Implementation Plan: Effect v4 前向式全仓重构（无兼容层）

**Branch**: `103-effect-v4-forward-cutover` | **Date**: 2026-03-01 | **Spec**: `specs/103-effect-v4-forward-cutover/spec.md`
**Input**: Feature specification from `specs/103-effect-v4-forward-cutover/spec.md`

## Summary

本计划采用 `v4-only + forward-only` 方案：

- 不保留兼容层，不做双栈，不设弃用期。
- 以 `feat/perf-dynamic-capacity-maxlevel` 合入 `main` 作为性能放行前置条件（实现轨道可并行推进）。
- 实施轨道（S0~S5）与性能证据轨道（P-1 + S6.5）并行推进，最终在 G5 汇合。
- S2 拆分为 `S2-A`（热路径确定性收益）与 `S2-B`（边界硬化收口），并引入 `Gate-A/Gate-B` 子门禁。
- 先过 `logix-core` 的 P0 语义迁移门槛（G1），再插入 STM 局部 PoC（G2）。
- S3 增加 `Gate-C`（并发矩阵 + replay + 稳定标识 diff）作为 G2 前置条件。
- STM 决策只影响局部实现策略，不影响 v4 主线推进。

## Deepening Notes

- Decision: 迁移过程中允许重构模块实现思路，不以“保持旧结构”作为边界（source: user align 2026-03-01）。
- Decision: STM 只在 `WorkflowRuntime` / `ProcessRuntime` 局部试点，严格排除 `ModuleRuntime.transaction` 与 `TaskRunner` 核心边界（source: user align 2026-03-01）。
- Decision: Gate 结论必须绑定证据；`perf diff comparable=false` 直接判定 gate 不通过（source: project constitution）。
- Decision: 用户确认采用“rebase main + 单提交增量对比”口径；因此允许实现并行推进，但性能 gate 仅在单提交 sweep 证据后放行（source: user align 2026-03-02）。
- Decision: `G1/G2` 性能判定采用双门语义：`Gate-Abs(绝对预算)` + `Gate-Rel(相对回归)`；`before` 已超预算切片按 `no-worse` + baseline debt 台账治理（source: perf investigation 2026-03-03）。

## Dependencies

- 官方迁移依据：`https://github.com/Effect-TS/effect-smol/tree/main/migration`
- 前置分支：`feat/perf-dynamic-capacity-maxlevel`（合入 `main` 后方可放行性能 gate）
- Runtime SSoT：`docs/ssot/runtime/logix-core/*`
- Platform SSoT：`docs/ssot/platform/*`
- Perf SSoT：`.codex/skills/logix-perf-evidence/assets/matrix.json`

## Technical Context

**Language/Version**: TypeScript 5.8.2（workspace）  
**Primary Dependencies**: `effect` v4 beta（目标）、`@effect/*` 生态同版本收敛  
**Testing**: Vitest + `@effect/vitest`  
**Target Platform**: Node.js + Browser（React/Sandbox）  
**Project Type**: pnpm workspace（packages/apps/examples/docs）

**Constraints**:

- 统一最小 IR（Static IR + Dynamic Trace）不变。
- 稳定标识（`instanceId/txnSeq/opSeq`）不可漂移。
- 事务窗口禁止 IO，业务不可写 `SubscriptionRef`。
- 诊断事件 Slim 且可序列化；off 档位近零成本。

## Constitution Check

_GATE: 进入实现前必须 PASS；S2 设计后复核一次。_

### Pre-Implementation Gate

- **Perf 前置条件**: CONDITIONAL（未 PASS 前允许推进实现任务，但不得宣称 G1/G2/G5 性能 gate 通过）。
- **Forward-only**: PASS。无兼容层、无双栈、无弃用期。
- **统一最小 IR**: PASS。未引入并行真相源。
- **稳定标识**: PASS。沿用 `instanceId/txnSeq/opSeq` 链路。
- **事务边界**: PASS。明确事务窗口禁 IO；STM 禁区已锁定。
- **性能预算**: PASS。定义 G1/G2 数值阈值与复测规则。
- **诊断成本**: PASS。要求 off 档位 <=1% 额外开销。
- **Docs-first / SSoT 回写**: PASS。S5 强制文档与 SSoT 收口。
- **迁移说明替代兼容层**: PASS。1.0 发布稿作为唯一迁移面。
- **Quality Gates**: PASS。最终执行 `typecheck/typecheck:test/lint/test:turbo`。

### Post-Design Re-check（S2 后）

- 需确认 Service/Reference/Runtime/Cause 主干重构已落在统一拓扑。
- 需确认 diagnostics/perf 证据链未断裂。

## Phase Topology

## P-1 - Perf 前置收口（性能放行门）

目标：在性能放行前，确保 perf 基础设施已随 `main` 收敛并可直接作为最终 gate 基座。

产物：

- `specs/103-effect-v4-forward-cutover/inventory/perf-prerequisite.md`
- 前置核验记录（merge commit、workflow/scripts 对齐结论）

Gate GP-1：以下全部满足才可宣称性能 gate 通过。

- `origin/main` 已包含 `feat/perf-dynamic-capacity-maxlevel` 关键提交。
- `logix-perf-sweep.yml` / `logix-perf-quick.yml` 已具备 strict diff 分流、并发保护与超时保护配置。
- `.github/scripts/logix-perf-normalize-ci-reports.cjs`、`.github/scripts/logix-perf-quick-summary.cjs` 已就位并可调用。
- `.codex/skills/logix-perf-evidence/scripts/{collect.ts,diff.ts,validate.ts,bench.traitConverge.node.ts}` 已就位并可调用。
- workflow 已具备 pinned matrix + reports normalize 步骤，确保 before/after 可比性。

## S0 - Baseline 与命中台账冻结

目标：冻结迁移前事实面，建立“可对比”前后证据；在并行模式下允许先完成台账/诊断，性能 before 可在 S6.5 用单提交父提交补采。

产物：

- `specs/103-effect-v4-forward-cutover/inventory/api-ledger.md`
- `specs/103-effect-v4-forward-cutover/perf/s0.before.<envId>.default.json`
- `specs/103-effect-v4-forward-cutover/diagnostics/s0.snapshot.md`

Gate G0：上述产物齐备且可复现。

## S1 - 依赖与工具链收敛

目标：锁定 v4 beta 版本矩阵，避免迁移期间依赖漂移。

范围：

- 根 `package.json` 与 workspace 子包 `effect/@effect/*` 版本统一策略。
- 清点所有 `@effect/platform`、`@effect/sql`、`@effect/cli` 等生态包升级路径。

Gate G1.0：依赖矩阵冻结，升级路径文档化。

## S2 - `logix-core` 语义主干迁移（P0，拆分 S2-A/S2-B）

目标：完成 core 的 v4 原生重构，并把“热路径确定性收益”与“边界硬化收口”拆成两波执行。

## S2-A（第一波：确定性热路径收益）

范围（Tier-1 第一波 + Tier-2 基础收口）：

- `#2` Workflow 端口解析前移 setup（禁止 run 期兜底解析）。
- `#1` `triggerStreams` 动态 Module Tag -> `ModuleRuntimeRegistry`。
- `#3` txnQueue 上下文注入扁平化（保持事务/取消/replay 语义不变）。
- `DebugSink.record` FiberRef 读取聚合收敛（诊断链路不降级）。

Gate-A（S2-A 结束）：

- run 期端口兜底解析命中为 0。
- 新增 `Context.GenericTag` 命中为 0（最少 warning，目标 error）。
- Stage 2A 的 perf/diagnostics/replay 证据齐备且可复现。

## S2-B（第二波：边界硬化与迁移封口）

范围（Tier-1 第二波 + Tier-2 收口）：

- `#4` 全仓 `Context.GenericTag -> Tag class` 清理与禁回流。
- `ExternalStore` 收敛到 runtime/scope 生命周期，禁止新增长直连 `runSync/runFork`。
- `TaskRunner` 从全局 `inSyncTransaction` 深度迁到 scope 隔离影子模式（主路径退场全局深度）。
- CI fail-fast 规则固化：事务窗口 IO、业务写 `SubscriptionRef`、遗留入口调用。

Gate-B（S2-B 结束，G1 前置）：

- 旧执行入口（`runSync/runFork` 直连）新增命中为 0。
- `TaskRunner` 全局深度变量不再主路径生效（仅影子验证保留）。
- Stage 2B 的 strict perf diff + diagnostics + replay 证据齐备。

## S2 通用 P0 范围（跨 S2-A/S2-B）

- `Context.* -> ServiceMap.Service`
- `FiberRef/Effect.locally -> ServiceMap.Reference/Effect.provideService`
- `Runtime.run*` 散落调用收敛
- `catch/fork/scope` rename + 并发/错误语义校验
- Cause 扁平化后的诊断策略重写
- Schema v4 高价值链路（`logix-form` 错误管线、`logix-core` 安全解码、`logix-query` 动态 Union/Literal）

Gate G1（P0 最终）：

- Gate-A、Gate-B 必须已 PASS。
- `pnpm -C packages/logix-core typecheck:test`
- `pnpm -C packages/logix-core test`
- v3 关键 API 在 core 生产路径命中为 0
- 性能证据双通道：
  - Browser 通道：`pnpm perf collect` + `pnpm perf diff`
  - Node 通道：`pnpm perf bench:traitConverge:node` + `pnpm perf diff`
- 性能预算：p95 <= +5%，吞吐 >= -3%，内存 <= +8%
- 诊断预算：off 档位 <= +1%
- 双门判定（强制）：
  - `perf_abs_gate_passed`：hard budgets 不得出现新的 `head budgetExceeded`；已登记 debt 切片仅允许 `no-worse`。
  - `perf_rel_gate_passed`：hard budgets 的 `summary.regressions==0`；debt 切片仅在“超过 no-worse 阈值”时阻断。
  - `baseline_debt_declared`：所有采用 `no-worse` 的切片都必须有 owner/阈值/退出条件/证据路径。
- Schema gate：
  - 禁止新增旧语法：`Schema.partial(`、`Schema.Record({ key:`、`Schema.pattern(`、variadic `Schema.Union(`、多参 `Schema.Literal(`
  - `ParseResult.TreeFormatter` 在生产路径清零（至少 `logix-form`）

## S3 - STM 局部 PoC（滞后半步，Gate-C + G2）

目标：验证 STM 是否在局部状态仲裁中“1+1>2”，并完成 Tier-2 语义闭环。

允许点位：

- `WorkflowRuntime`（ProgramState 局部）
- `ProcessRuntime`（实例状态迁移局部）

禁区：

- `ModuleRuntime.transaction`
- `TaskRunner` 三段式边界
- 含外部 IO 的 workflow step 执行体

Gate-C（S3 结束，G2 前置）：

- 并发/取消/超时/重试矩阵全绿。
- replay 一致性与稳定 `instanceId/txnSeq/opSeq` diff 校验通过。
- 影子路径退场计划与证据明确。

Gate G2（go/no-go）：

- MUST：
  - Gate-C 必须已 PASS。
  - 正确性回归全通过；无新增乱序/重复提交/重复取消
  - 性能不超过 G1 预算红线
  - 诊断链路可解释性不下降
- SHOULD（至少 2 项）：
  - 目标代码复杂度下降 >=10%
  - 回归覆盖率提升（并发/取消/重试场景）
  - 排障路径缩短（关键场景排查步骤减少）

决策：

- `GO`：允许在批准范围内继续使用 STM 模式。
- `NO-GO`：回退到非 STM v4 实现，主线继续推进。

## S4 - 基础设施与能力包迁移

顺序（强约束）：

1. `packages/logix-react`
2. `packages/logix-sandbox` + `packages/i18n`
3. `packages/logix-query` + `packages/logix-form` + `packages/domain`
4. `packages/logix-cli`

Gate G3：各包 `typecheck:test` + `test` 全通过，且执行策略与 G2 一致。

## S5 - apps/examples/docs/SSoT 收口

范围：

- `apps/logix-galaxy-api`
- `apps/logix-galaxy-fe`
- `examples/*`
- `apps/docs/*`
- `docs/ssot/runtime/*`、`docs/ssot/platform/*`

Gate G4：对外文档与示例只保留 v4 心智模型，无 v3 残留。
并且 Schema 示例不再出现旧语法写法。

## S6 - 1.0 发布闸门

## S6.5 - Mainline Rebase + 单提交增量基准（发布前强制）

目标：将 v4 改造收敛为 `origin/main` 之上的单提交 `V4_DELTA`，并用 `V4_DELTA^ -> V4_DELTA` 计算净增量性能。

流程：

1. `git fetch origin`，将实施分支 `rebase origin/main`。
2. 保证 `origin/main..HEAD` 仅 1 个业务提交（`V4_DELTA`）。
3. 手动触发 `logix-perf-sweep.yml`：`base_ref=<V4_DELTA^>`、`head_ref=<V4_DELTA>`、`perf_profile=soak`、`diff_mode=strict`。
4. 下载 artifacts 并将 before/after/diff 归档到 `specs/103-effect-v4-forward-cutover/perf/`。

Gate G5 的性能结论仅认 S6.5 产物，不认历史临时对比。

Gate G5：

1. `pnpm typecheck`
2. `pnpm typecheck:test`
3. `pnpm lint`
4. `pnpm test:turbo`
5. `V4_DELTA^ -> V4_DELTA` 的 `sweep(soak+strict)` 证据归档
6. 中文 breaking changes + 迁移说明发布稿完成

## Perf Evidence Plan（MUST）

- 目录：`specs/103-effect-v4-forward-cutover/perf/`
- 命名：`<stage>.<before|after|diff>.<envId>.<profile>.json`
- profile：`default`（结论）/`soak`（复核）
- collect（before）：
  - `pnpm perf collect -- --profile default --out specs/103-effect-v4-forward-cutover/perf/<stage>.before.<envId>.default.json`
- collect（after）：
  - `pnpm perf collect -- --profile default --out specs/103-effect-v4-forward-cutover/perf/<stage>.after.<envId>.default.json`
- diff：
  - `pnpm perf diff -- --before <before.json> --after <after.json> --out specs/103-effect-v4-forward-cutover/perf/<stage>.diff.<envId>.default.json`
- validate（before/after）：
  - `pnpm perf validate -- --report <before.json>`
  - `pnpm perf validate -- --report <after.json>`

探索态（仅用于定位，不可作为 gate 通过证据）：

- `pnpm perf validate -- --report <before.json> --allow-partial`
- `pnpm perf validate -- --report <after.json> --allow-partial`

Gate 判据（性能）：

- diff 必须为 strict 模式（禁止 `diff:triage` 用于 gate 宣称）。
- `meta.comparability.comparable=true`。
- `Gate-Abs`：hard budgets 的 `head budgetExceeded==0`；debt 切片仅允许 `no-worse`，且必须登记。
- `Gate-Rel`：hard budgets 的 `summary.regressions==0`；debt 切片若超过 no-worse 阈值则视为回归阻断。
- 最终发布口径必须来自 `base=<V4_DELTA^>`、`head=<V4_DELTA>`。

Failure Policy:

- `comparable=false`、`stabilityWarning`、`missing suite` 任一出现 => 复测，不得宣称 gate 通过。
- Gate 判定禁用 `--allow-partial`，该参数仅允许用于探索态诊断。
- 使用 `no-worse` 但未登记 baseline debt（owner/阈值/退出条件）=> 视为证据不完整，不得宣称 gate 通过。

## Project Structure

### Documentation (this feature)

```text
specs/103-effect-v4-forward-cutover/
├── spec.md
├── plan.md
├── tasks.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── README.md
│   ├── stage-gate-record.md
│   ├── stm-decision-record.md
│   └── checkpoint-decision-record.md
├── checklists/
│   └── requirements.md
├── inventory/
├── diagnostics/
└── perf/
```

### Source Code (repository root)

```text
packages/logix-core/src/internal/runtime/core/
packages/logix-react/src/internal/
packages/logix-sandbox/src/internal/
packages/{logix-query,logix-form,domain,i18n,logix-cli}/src/
apps/logix-galaxy-api/src/
apps/logix-galaxy-fe/src/
examples/*
apps/docs/content/docs/*
```

**Structure Decision**:

- 迁移文档资产集中在 `specs/103-effect-v4-forward-cutover`，避免并行事实源。
- Gate 记录统一落在 `inventory/`，并通过 contracts/data-model 约束字段与状态机。
- 核心实现优先落在 `packages/logix-core`，外围包严格按 S4 顺序推进。

## Complexity Tracking

- 当前不引入额外项目结构复杂度；复杂度主要来自 gate 状态机与证据链一致性。
- 若后续新增 gate 类型或状态，必须先更新 `data-model.md` 与 `contracts/*` 再推进任务。

## Risk Register

- **R1: v4 beta API 漂移**：按阶段冻结版本窗口；跨阶段升级必须补差异说明。
- **R2: 语义回归隐蔽**：为 Cause/layer/fork/keep-alive 增加专项回归。
- **R3: STM 扩散越界**：白名单点位 + 黑名单禁区 + gate 审核双重约束。
- **R4: 文档与实现漂移**：S5 作为强制门槛，不通过不得发布。
- **R5: Schema 迁移误改业务语义**：先守行为等价，再做表达优化；关键模块先 PoC 再扩面。

## Checkpoint Decision Log（当前快照）

- **CP-0 / 文档骨架**：PASS（核心 spec bundle 文件齐备）。
- **CP-1 / GP-1 前置门**：NOT_PASS（`inventory/perf-prerequisite.md` 当前判定为 `NOT_PASS`）。
- **CP-2 / G0 基线门**：NOT_PASS（`inventory/gate-g0.md` 当前判定为 `NOT_PASS`）。
- **CP-3 / G1 准备态**：BLOCKED（Gate-A/B 记录未通过前不可进入 G1 判定）。
- **CP-4 / G2 准备态**：BLOCKED（Gate-C 记录未通过前不可进入 G2 判定）。
- **CP-5 / 发布门 G5**：NO-GO（未达到阶段产物与证据要求）。

## Rollback / Recovery Strategy

- 不提供兼容层回退。
- 回退仅限“阶段级回退到上一个稳定提交”，并保留失败证据与结论。
- 证据目录（`inventory/*.md`、`perf/*.json`、`diagnostics/*.md`）采用追加式审计策略：默认不回退，必要回退前必须先归档快照并保留索引。
- 代码回退对象固定为：受影响 runtime/core/react/sandbox 源码、受影响 workflow/scripts、受影响配置文件。
- 回退步骤固定为：冻结当前 gate -> 归档当前失败证据 -> 锁定 last PASS checkpoint -> 回退受影响代码对象 -> 重跑 gate 清单 -> 回写 checkpoint 决策日志。
- STM `NO-GO` 时必须收敛到非 STM 的 v4 主线实现。
