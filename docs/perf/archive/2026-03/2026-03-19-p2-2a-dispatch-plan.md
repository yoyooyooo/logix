# 2026-03-19 · P2-2A dispatch action parse + topic fanout precompile

## 本刀范围

- 只做 `DispatchPlan-A` 第一刀：
  - Action 解析预编译命中。
  - topic fanout 目标预编译命中。
- 不做第二刀：
  - reducer/writeback 执行计划化（`DispatchPlan-B`）未触碰。
- 代码落点：
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`

## 实现摘要

1. 在 `makeDispatchOps` 安装期基于 `declaredActionTags + actionTagHubsByTag` 构建 `dispatchPlanByActionTag`。
2. 预编译计划包含：
   - `actionTagNormalized`
   - `originOp`
   - primary topic hub target
   - `fanoutCount`
3. dispatch 三入口统一改为 route-resolve 一次：
   - 先尝试 `resolveDispatchPlan(action)` 命中静态计划。
   - miss 时回退现有 `analyzeAction + makeActionPropagationEntry` 动态解释路径。
4. fallback 保持原语义：
   - mixed `_tag/type` 双通道路由。
   - undeclared topic 的 OR 语义与 dedupe 语义。

## 贴边证据

### dispatch shell micro-bench（同命令、同机、同参数）

命令：

```bash
pnpm -C packages/logix-core test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts
```

before（改动前）：

- `dispatch.p50=0.080ms`
- `dispatch.p95=0.140ms`
- `residual.avg=0.059ms`
- `bodyShell.avg=0.015ms`

after（改动后）：

- `dispatch.p50=0.082ms`
- `dispatch.p95=0.133ms`
- `residual.avg=0.059ms`
- `bodyShell.avg=0.015ms`

delta（after - before）：

- `dispatch.p50: +0.002ms`
- `dispatch.p95: -0.007ms`
- `residual.avg: +0.000ms`
- `bodyShell.avg: +0.000ms`

补充复测（同口径）：

- 复测样本出现小幅抖动（`dispatch.p95` 在 `0.141ms` 附近），量级仍在子毫秒噪声带内。
- 当前将该刀定性为“主路径解释壳下沉已落地，收益弱正向，后续需在更长样本窗口继续观察”。

证据文件：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-2a-dispatch-plan.before.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-2a-dispatch-plan.after.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-2a-dispatch-plan.diff.json`

## 最小验证

已执行并通过：

```bash
pnpm -C packages/logix-core test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts
pnpm -C packages/logix-core test -- test/internal/Runtime/ConcurrencyPolicy/ConcurrencyPolicy.PressureWarning.test.ts -t "dispatchBatch|topic pressure"
pnpm -C packages/logix-core test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts
pnpm -C packages/logix-core typecheck:test
python3 fabfile.py probe_next_blocker --json
```

其中本刀新增的贴边 dispatch/plan 语义验证命令：

```bash
pnpm -C packages/logix-core test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts -t "dispatchBatch fan-out|actionsByTag\\$ fallback should keep _tag/type OR semantics for undeclared topics"
```

`probe_next_blocker` 最新状态：`clear`，current probe 队列未打红。

## 裁决

- 分类：`accepted_with_evidence_probe_clear`
- 说明：本刀严格停在 `DispatchPlan-A`，动态 action fallback 保持；贴边样本显示 `dispatch.p95` 有弱正向变化，且当前 probe 队列保持 clear。
