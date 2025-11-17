# 017 · 可调旋钮清单（面向人/LLM）

> 目标：把“现在到底能调什么、默认是什么、怎么验证有效”说清楚，避免每次调参都从头翻源码。

## A. 013 控制面（收敛 converge）

这些旋钮直接影响一次事务提交时的“派生收敛/联动计算”成本与稳定性。

### A1) `stateTransaction.traitConvergeMode`

- 作用：选择收敛策略（三档开关）。
  - `auto`：默认；由运行时按当前事务写入分布选择 `full` 或 `dirty`。
  - `full`：稳定基线/止血；每次全量收敛。
  - `dirty`：更激进；尽量只重算受影响部分（更依赖 deps/dirtyPaths 准确）。
- 默认值：`auto`（builtin）。
- 覆盖层级：`provider > runtime_module > runtime_default > builtin`（下一笔事务生效）。
- 当前证据覆盖：
  - 014：`converge.txnCommit`（含 `auto<=full*1.05` 硬门），`negativeBoundaries.dirtyPattern`。
  - 单测：已覆盖优先级与热切换（`packages/logix-core/test/StateTrait.ConvergeAuto.*`）。

### A2) `stateTransaction.traitConvergeBudgetMs`

- 作用：派生收敛的执行预算（ms）。
  - 越大越“肯算”（更少降级），越小越“保响应”（更可能触发降级）。
- 默认值：`200`（builtin）。
- 覆盖层级：同上（provider > runtime_module > runtime_default > builtin）。
- 当前证据覆盖：
  - 014：目前主要测 commit/decision 耗时；预算导致的降级次数尚未纳入统一 evidence（候补项）。
  - 017：已可将该旋钮纳入 sweep candidates，并在 `recommendation.latest.md|json` 输出推荐默认值（见 `specs/017-perf-tuning-lab/quickstart.md`）。
  - 单测：已覆盖默认值与优先级链路（`packages/logix-core/test/StateTrait.ConvergeBudgetConfig.test.ts`）。

### A3) `stateTransaction.traitConvergeDecisionBudgetMs`

- 作用：`auto` 在做“是否局部重算”决策阶段的预算（ms）。
  - 越小越保守（更容易回退到 `full`），越大越激进（决策开销更高但可能更多命中 `dirty`）。
- 默认值：`0.5`（builtin）。
- 覆盖层级：同上。
- 当前证据覆盖：
  - 014：`converge.txnCommit` / `negativeBoundaries.dirtyPattern` 产出 `runtime.decisionMs`。
  - 单测：已覆盖默认值与优先级链路（`packages/logix-core/test/StateTrait.ConvergeBudgetConfig.test.ts`）。

### A4) 按模块覆盖 & Provider 子树覆盖

- 作用：局部止血与灰度调参（只影响某个模块或某棵 React 子树）。
- 配方/文档：`apps/docs/content/docs/guide/advanced/converge-control-plane.md`。
- 当前证据覆盖：优先级/热切换已被单测覆盖；014 的调参推荐脚本会给出可读证据（见下文）。

## B. 观测/诊断旋钮（非 013，但会影响开销）

这些旋钮不改变业务语义，但会显著影响“观测成本/可解释性”。

### B1) `stateTransaction.instrumentation`（事务观测级别）

- 作用：控制事务内部记录的细节（Patch/快照等）。
  - `full`：更易调试（默认 dev/test）。
  - `light`：更省（默认 production）。
- 覆盖层级：`ModuleImpl > Runtime.make > NODE_ENV 默认`。
- 当前证据覆盖：
  - 014：未纳入统一矩阵（候补项：可加入一条“事务观测开销曲线” suite）。

### B2) `Debug.diagnosticsLevel`（诊断分档）

- 作用：控制“是否输出/输出多少”调试事件与证据。
  - `off`：几乎零额外开销，但也没有可导出的证据字段。
  - `light/full`：更可解释，但会有开销。
- 当前证据覆盖：
  - 014：已有 `diagnostics.overhead.e2e` suite（但当前可能存在 timeout/不稳定，需持续治理）。

### B3) Runtime Devtools 选项（`Runtime.make({ devtools: ... })`）

- 作用：控制 Devtools 的事件窗口长度、trace 观测范围与采样率。
  - `bufferSize`：事件窗口长度（越大越占内存）。
  - `observer`：effectop trace（可关闭）。
  - `sampling.reactRenderSampleRate`：React 渲染事件采样率（可降低噪音与开销）。
- 当前证据覆盖：
  - 014：未纳入统一矩阵（候补项：加入 devtools on/off 与不同 bufferSize 的开销对比）。

## C. 实验场旋钮（014/017 用，不是产品默认）

这些参数用于控制“测量成本/稳定性”，不应被当作线上默认。

- `VITE_LOGIX_PERF_PROFILE`：`quick/default/soak`（runs/warmup/timeout 的预设）。
- `matrix.defaults.*`：runs/warmupDiscard/timeoutMs/stability。

## D. 一键产出“当前最佳默认值”

- 一键跑：`pnpm perf tuning:best`
- 遇到偶发失败：`pnpm perf tuning:recommend -- --retries 2`
- 产物：`specs/014-browser-perf-boundaries/perf/tuning/recommendation.latest.md`（可读）与 `.json`（机器读）

## E. 还不可调，但很可能会成为下一批调参旋钮（候选）

> 这些目前是代码内常量/隐藏策略，若要进入 017 的 sweep，需要先“显式化 + 可观测化”。

- Auto 决策阈值（例如 floorRatio）与其稳定性门槛
- Converge Plan Cache 的容量/逐出保护参数
- 低命中率自我保护（low_hit_rate_protection）的触发阈值与恢复策略
