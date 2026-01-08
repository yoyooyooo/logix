# Perf Evidence Authoring（新增 suite/场景/脚本）

> 目标：让维护者与 LLM 能“只看本 skill”就完成新增场景与证据闭环（collect → diff → interpretation），避免另起一套口径。

## 0) 先选跑道（最小决策）

- **Browser perf matrix suite（推荐）**：真实浏览器长链路/端到端口径；产物进入 `PerfReport/PerfDiff`，可做基线对比与回归判定。
  - 用例落点：`packages/logix-react/test/browser/perf-boundaries/*.test.tsx`（或 `packages/logix-react/test/browser/*.test.tsx`）
  - 矩阵/契约落点：`@logixjs/perf-evidence/assets/*`（物理路径：`.codex/skills/logix-perf-evidence/assets/*`）
  - 输出协议：`LOGIX_PERF_REPORT:<json>`（见 `packages/logix-react/test/browser/perf-boundaries/protocol.ts`）
- **Node bench（补充）**：微基准/算法/内核对比；默认不进入 `PerfReport/PerfDiff`（除非你专门做一个 collect runner）。
  - 脚本落点：`.codex/skills/logix-perf-evidence/scripts/bench.*.ts` 或 `scripts/<NNN-*>.ts`

## 1) 新增一个 Browser suite（最常见路径）

### 1.1 在矩阵里新增 suite（定义“你要测什么”）

编辑：`.codex/skills/logix-perf-evidence/assets/matrix.json`

建议从已有 suite 复制一个最接近的骨架（如 `converge.txnCommit` / `form.listScopeCheck` / `negativeBoundaries.dirtyPattern`）。

**最小字段清单（必须）**

- `id`：稳定标识（推荐 `<domain>.<scenario>`），将作为报告里 `SuiteResult.id` 与 diff 的 join key。
- `priority`：`P1|P2|P3`（后续 interpretation 与 LLM 汇总会按优先级处理）。
- `title`：人类可读标题。
- `primaryAxis`：阈值扫描的“加压主轴”（levels 的顺序决定 `maxLevel` 的递增序）。
- `axes`：每个轴的 levels（primitive 值：string/number/boolean）。
- `metrics`：本 suite 产出的 metric 名称列表（必须与用例输出一致）。

**预算与门（强烈建议）**

- `budgets`：定义阈值/门禁；diff 会基于 budgets 重算 `maxLevel` 并输出 `thresholdDeltas`。
  - `absolute`：`p95Ms` 上限（例如 `commit.p95<=50ms`）。
  - `relative`：相对门（例如 `auto<=full*1.05`）。
    - `numeratorRef` / `denominatorRef` 语法见 `matrix.semantics.refSyntax`（形如 `axis=value[&axis=value...]`）。
    - 配对规则：除 ref 中出现的轴之外，其余 params 必须完全一致（当前实现即如此）。
- `baselineBudgetId` / `limitBudgetId`：用于人类对照与“关键门”选取（diff 不强依赖，但推荐保持稳定）。

**证据字段（可诊断性）**

- `requiredEvidence`：该 suite 期望每个 point 输出的证据字段名集合（`runMatrixSuite` 会自动补齐 missing/unavailable 的占位，避免 diff 把“测不到”误读为“没有发生”）。

### 1.2 实现用例（定义“怎么测”）

新增文件：`packages/logix-react/test/browser/perf-boundaries/<something>.test.tsx`

推荐直接参照：

- `packages/logix-react/test/browser/perf-boundaries/converge-steps.test.tsx`
- `packages/logix-react/test/browser/perf-boundaries/form-list-scope-check.test.tsx`
- `packages/logix-react/test/browser/perf-boundaries/negative-dirty-pattern.test.tsx`

**用例必须满足的契约**

- 通过 `emitPerfReport(report)` 输出一行 `LOGIX_PERF_REPORT:<json>`（stdout 或 stderr 皆可，collect 会抓）。
- report 的 `suites[]` 至少包含你新增的 suite，并保证：
  - `id/title/priority/primaryAxis/budgets/metricCategories` 与矩阵/指标语义一致；
  - `points` 由 `runMatrixSuite(...)` 产出（包含 `status`、`metrics`，以及可选 `evidence`）；
  - `thresholds` 由 `computeSuiteThresholds(...)` 或 `runMatrixSuite` 一并产出。

**强约束（避免不可复现与污染）**

- **确定性**：凡涉及随机/噪声注入必须 `seed` 固化，并作为 `params`（或 evidence）写入报告。
- **事务窗口禁止 IO**：测量 Runtime/Txn 热路径时避免把 I/O（log、fs、network）放进 txn window（会污染 p95）。
- **证据 slim 且可序列化**：evidence value 仅用 `number|string|boolean`，不可塞大对象/stack/循环引用。
- **可自动结束**：为每个 point 设置 timeout，并用 `cutOffOn` 避免矩阵整体 hang。
- **metricCategories**：建议按 `e2e|runtime|diagnostics` 分类；diff 会把 category 写入阈值变化 message，并用于 recommendations 的选择。

### 1.3 采集/落盘/对比（闭环入口）

- 采集（建议显式落盘到你的 feature 目录）：
  - `pnpm perf collect -- --out specs/<id>/perf/after.local.json`
- 只跑子集（只跑某个文件或目录）：
  - `pnpm perf collect -- --files test/browser/perf-boundaries/<file>.test.tsx --out specs/<id>/perf/after.local.json`
  - `pnpm perf collect -- --files test/browser/perf-boundaries --out specs/<id>/perf/after.local.json`
- 对比：
  - `pnpm perf diff -- --before <before.json> --after <after.json> --out specs/<id>/perf/diff.<...>.json`

## 2) 什么时候需要“新增脚本”（而不是新增 suite）

### 2.1 collect/diff 本身缺能力时

典型：要新增新的报告拼装逻辑、要引入新维度语义、要新增可复用的“解释器/汇总器”。

- collect 落点：`.codex/skills/logix-perf-evidence/scripts/collect.ts`
- diff 落点：`.codex/skills/logix-perf-evidence/scripts/diff.ts`
- 调参实验场：`.codex/skills/logix-perf-evidence/scripts/tuning.recommend.ts`

### 2.2 纯 micro-bench（不进入 PerfReport/PerfDiff）时

新增 `.codex/skills/logix-perf-evidence/scripts/bench.*.ts`，输出建议：

- 顶层 `meta`（node/platform/iters 等）
- `results`（每个 case 的 ok/error + 统计）

并把入口加到 `.codex/skills/logix-perf-evidence/package.json`，保证“一条命令可跑完且自动退出”。

## 3) LLM 自检清单（新增 suite 时）

- `matrix.json`：suiteId 唯一；`primaryAxis` 在 `axes` 中存在且 levels 非空；`metrics` 非空；budgets 的 metric 必须属于 `metrics`。
- 用例：能输出 `LOGIX_PERF_REPORT:`；`points.length > 0`；`thresholds.length > 0`（至少对一个 budget）。
- collect：能抓到 payload 并写出 `PerfReport` JSON。
- diff：能生成 `PerfDiff`，且 `thresholdDeltas` 能定位到你新增的 suite（或在无变化时为空但无异常）。
