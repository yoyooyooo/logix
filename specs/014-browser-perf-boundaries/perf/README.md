# 014 Perf Evidence（如何跑、如何读、如何对比）

> 目标：把 `specs/014-browser-perf-boundaries/perf/*.json` 变成“可回归、可交接”的性能证据。
> 读者包含：人类（review/调参/回归定位）与 LLM（自动总结/判定回归/产出报告）。

如果你只想先看“现阶段结论”，直接打开：`specs/014-browser-perf-boundaries/perf/interpretation.latest.md`。

## 这目录里有什么

- `before.*.json`：某次“已认可”的基线（Baseline），用于后续 Before/After 对照。
- `after.*.json`：某次对比样本（After），通常是当前 worktree 或某个 commit。
- `diff.*.json`：对 `before` 与 `after` 的对比结果（机器可读 + 人类可扫）。

文件命名建议见 `specs/014-browser-perf-boundaries/perf.md`（envId / before/after 约定）。

## 作为“全仓性能证据框架”被其它 spec 复用

014 的 `perf/` 目录主要用于记录“014 自身跑道”的可复现证据；当其它特性需要性能基线时，建议把证据固化在该特性自己的 `specs/<id>/perf/*`，并按以下方式复用 014：

- **复用协议/工具**：沿用 `LOGIX_PERF_REPORT` 协议与 `PerfReport/PerfDiff` schema；对比语义优先复用 `pnpm perf diff`（必要时用 `--matrix` 指向你的矩阵文件）。
- **复用采集落盘**：用 `pnpm perf collect -- --out specs/<id>/perf/after.worktree.json` 将报告写入你的目录（只跑子集时配合 `--files`）。
- **只新增“场景”，不新增“体系”**：需要新维度/新场景时，优先在 `@logix/perf-evidence/assets/matrix.json`（物理：`.codex/skills/logix-perf-evidence/assets/matrix.json`）增加 suite，并提供对应可执行用例；不要另起一套 report/diff/阈值语义，避免证据口径漂移。

### 已接入特性（证据落点）

- `specs/039-trait-converge-int-exec-evidence/perf.md`（Trait converge 热路径专项：Node+Browser 基线与 Diff）

## 最短闭环：做一次 Before/After

1) 选定同机同配置（同 OS/arch/CPU/浏览器版本/headless），并决定 profile：
- quick：低成本探路（更容易抖动，只做“有没有明显回归”）。
- default：默认回归标准（建议作为正式结论）。
- soak：更稳、更贵（用于关键 PR/大改动）。

2) 采集：
- Before：切到你认可的基线 commit（或用已有 `before.*.json`）。
- After：在目标 commit / worktree 上跑采集落盘。

3) 对比：
- 运行 diff，得到 `PerfDiff`（建议也落盘）。

对应命令入口（统一从根目录跑）在 `specs/014-browser-perf-boundaries/perf.md` 与 `specs/014-browser-perf-boundaries/quickstart.md`。

## 一键得到“推荐默认值”（017 调参实验场）

> 目标：在任意时刻快速得到“当前代码下的推荐默认配置 + 可读证据”，用于日常调参与发布评审。

- 快速闭环（先采集 quick，再生成推荐文件）：`pnpm perf tuning:best`
- 自定义 sweep（profile / candidates / retries）：`pnpm perf tuning:recommend -- --profile default --retries 2`
- 产物：
  - 人类可读：`specs/014-browser-perf-boundaries/perf/tuning/recommendation.latest.md`
  - 机器可读：`specs/014-browser-perf-boundaries/perf/tuning/recommendation.latest.json`
  - 产物解读（建议先读这个）：`specs/014-browser-perf-boundaries/perf/tuning/README.md`

当前推荐范围先聚焦 013 converge 控制面（默认 `auto` + 预算），后续在 017 会逐步把更多内置旋钮纳入 sweep。

## 如何读 PerfReport（after/before json）

PerfReport 的关键结构：

- `meta.config`：本次采样参数（`runs` / `warmupDiscard` / `timeoutMs` / `profile`）。
- `suites[]`：一个 suite 对应一个“实验场景 + 矩阵”。
  - `id`：suite 标识（例如 `converge.txnCommit`）。
  - `primaryAxis`：主轴（阈值/上限以它为“level”递增）。
  - `points[]`：每个点位（参数组合）的采样结果。
  - `thresholds[]`：对 `budgets[]` 的阈值计算结果（最重要的“可扫指标”）。
  - `notes`：补充说明/异常（例如稳定性告警、缺失原因）。

### points：怎么看

每个 point：
- `params`：该点位的参数（矩阵维度 + 派生维度）。
- `status`：
  - `ok`：采样成功，metrics 有统计值。
  - `timeout`：在 `timeoutMs` 内没跑完（该点不可用于对比/判门）。
  - `failed`：执行失败（通常要先修用例或修环境）。
  - `skipped`：由于 cutOff 或显式 skip 被跳过（用于节省成本，通常也不可用于对比/判门）。
- `metrics[]`：
  - `status=ok` 时提供 `stats { n, medianMs, p95Ms }`
  - `status=unavailable` 时提供 `unavailableReason`（例如 `notImplemented`）
- `evidence[]`：非耗时指标的证据字段（用于解释“为什么这么快/这么慢/为什么退化”）。

### thresholds：怎么看（最重要）

thresholds 的语义：对每个 budget，在“其它维度 where 固定”的情况下，沿 primaryAxis 从低到高扫描，找出满足 budget 的最大 level：

- `maxLevel`：当前 report 下，这条 budget 能“稳定通过”的最大 level。
- `firstFailLevel`：第一次失败的 level（用于定位“哪一级开始超预算/缺数据/不支持”）。
- `reason`：失败原因：
  - `budgetExceeded`：p95 超过预算；
  - `missing` / `missingNumerator` / `missingDenominator`：报告缺点位；
  - `timeout` / `cutOff`：点位超时或被 cutOff；
  - `notImplemented`：该指标还没实现（例如 decisionMs）；
  - 其它：按 report 写的字符串为准。

对人类来说，`maxLevel` 就是“这条预算下的承载上限”；对 LLM 来说，优先用 `thresholds` 做汇总与判定。

## 如何读 PerfDiff（diff json）

PerfDiff 的关键结构：

- `summary`：
  - `regressions`：回归数量（按阈值下降/预算违例等统计）。
  - `improvements`：提升数量（按阈值上升等统计）。
  - `budgetViolations`：预算违例数量（更强信号，通常应视为阻断）。
- `suites[]`：按 suite 汇总差异：
  - `thresholdDeltas[]`：同一 budget/where 的 `beforeMaxLevel → afterMaxLevel` 变化。
  - `budgetViolations[]`：after 触发“超预算”的重点点位（若实现开启）。
  - `evidenceDeltas[]`：证据字段差异（用于解释与根因定位）。
  - `notes`：稳定性告警、缺 suite、缺点位等说明。

### 如何判定“提升/回归”

建议按优先级排序：

1) `budgetViolations`：出现即优先处理（通常不可接受）。
2) `thresholdDeltas`：
   - `afterMaxLevel < beforeMaxLevel`：回归（尤其是 P1 suite / hard gate）。
   - `afterMaxLevel > beforeMaxLevel`：提升（说明承载上限更高）。
3) `notes` 中的 `stabilityWarning`：说明该点位噪声可能影响结论。
   - quick 仅用于探路：看到 warning 时更建议跑 default 或重复采样再下结论。

## 把 014 当成“内核性能升级实验场”的工作法（给人/LLM）

### 做改动前（建立可对比前提）

- 选定 baseline：使用已固化的 `before.*.json`，或在改动前先采一份 `after.<sha>.json` 并重命名为 `before.<sha>.json`。
- 固定环境：同机同浏览器版本/同 headless；避免后台重负载。
- 选择 profile：默认用 `default` 作为“可交付结论”；`quick` 用于迭代中快速反馈。

### 做改动后（采集与判定）

- 采集 after：落盘到 `perf/after.*.json`。
- 运行 diff：输出 `perf/diff.*.json`。
- 写结论：按 suite（P1→P3）汇总：
  - 是否有 `budgetViolations`
  - P1 hard gate 是否通过（例如 `auto<=full*1.05`）
  - `maxLevel` 的变化（提升/回归）
  - 稳定性告警与是否需要复测

### 给 LLM 的“读报告提示词模板”（可直接复制）

把 `before.json`、`after.json`、`diff.json` 路径贴给 LLM，并附加以下要求：

1) 只基于 `PerfDiff.summary` 与每个 suite 的 `thresholdDeltas/budgetViolations/notes` 下结论；
2) P1 suite 优先、P2 次之、P3 最后；
3) 如果 `notes` 提到 `missing suite` 或 `stabilityWarning`，必须在结论里显式标注“不确定性来源”；
4) 输出格式：每个 suite 一段（通过/回归/提升 + 关键 budget/where + maxLevel 变化）。

## 常见“看不懂/对不上”的原因（排查清单）

- Before/After 的 suites 不一致：diff 会标注 `missing suite in before/after report`（此时不能做严格对比，只能给“现状”）。
- 指标未实现：`metricUnavailable` / `notImplemented`（例如 `runtime.decisionMs`），diff 会把它当作不可对比原因。
- quick 抖动：`stabilityWarning`（建议跑 default/soak 或重复采样）。
- 点位超时：`pointTimeoutMs=...`（需要提升 timeout、缩小矩阵、或降低单次 run 成本）。

## Workload 复用（给 018/未来实验）

为了让“证据口径”不漂移，workload 的实现也应该尽量避免散落在各个用例里：

- 新增/调整 workload 时，优先把“逻辑构造器/fixture”（例如某个场景的 Module + Logic builder）抽到公共 fixtures 模块，再由 browser 用例与后续 Worker/Node 跑道复用。
- 当前 workload fixtures 已收口到 `packages/logix-react/src/internal/perfWorkloads.ts`（internal 单一事实源）；014 的 browser 用例与后续 Worker/Node 跑道应复用这里，避免口径漂移。

## 017：调参实验场（寻找最佳默认值）

> 目标：基于 013 的控制面参数，在同一台机器上做参数 sweep，产出“推荐默认值 + 证据文件路径”，并可随时复跑得到最新结论。

### 一键跑（默认 quick）

- 运行：`pnpm perf tuning:best`
- 产物目录：`specs/014-browser-perf-boundaries/perf/tuning/`
  - sweep（每个候选一份 report）：`sweep.017.<candidateId>.quick.json`
  - 推荐（汇总 + winner）：`recommendation.017.quick.json`

### 如何自定义候选集合

- 指定 profile：`pnpm perf tuning:recommend -- --profile default`
- 遇到偶发失败：`pnpm perf tuning:recommend -- --retries 2`
- 指定 candidates（JSON 字符串）：`pnpm perf tuning:recommend -- --candidates '[{\"traitConvergeDecisionBudgetMs\":0.25},{\"traitConvergeDecisionBudgetMs\":0.5}]'`

### 这次 sweep 调的是哪些旋钮

- `traitConvergeDecisionBudgetMs`（013 控制面）：Auto 决策阶段硬止损预算（超时必须回退 full，并写入证据）。
- 环境变量入口（用于复现实验）：`VITE_LOGIX_TRAIT_CONVERGE_DECISION_BUDGET_MS` / `VITE_LOGIX_TRAIT_CONVERGE_BUDGET_MS`

### 其它常见可调旋钮（不属于 013 控制面）

> 这些旋钮也会显著影响“你看到的性能”，但它们不是 013 的 converge 控制面语义；建议先把 013 的止血/调参跑通，再按需引入这些开关做对照。

- **观测开销（StateTransaction Instrumentation）**：`stateTransaction.instrumentation="full"|"light"`（开发/线上默认不同）。
- **诊断分档（DiagnosticsLevel）**：`off|light|full`（影响 trace/事件记录开销；014 里有专门的 overhead 曲线 suite）。
- **Devtools 配置**：bufferSize、observer/filter、采样开关（影响事件量与 UI 成本）。
- **React 行为开关**：StrictMode / Suspense 等（014 的 matrix 已把部分因素建模为维度）。
- **矩阵采样配置**：profile（runs/warmup/timeout）决定“结论强度 vs 成本”，quick 仅用于探路。

对应的用户侧解释与配置入口见：
- `apps/docs/content/docs/guide/advanced/performance-and-optimization.md`
- `apps/docs/content/docs/guide/advanced/converge-control-plane.md`
