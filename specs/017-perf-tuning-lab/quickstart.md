# Quickstart: 017 调参实验场（基于 014 跑道）

> 目标：在同一台机器上做参数 sweep，快速产出“推荐默认值 + 可读证据”，并能随时复跑得到最新结论。

## 入口命令

- 一键跑（默认 quick）：`pnpm perf tuning:best`
- 自定义（profile / candidates / retries / out-dir）：
  - `pnpm perf tuning:recommend -- --profile default`
  - `pnpm perf tuning:recommend -- --retries 2`
  - `pnpm perf tuning:recommend -- --confirm --confirm-profile default --confirm-top 2`
  - `pnpm perf tuning:recommend -- --out-dir specs/014-browser-perf-boundaries/perf/tuning`
  - `pnpm perf tuning:recommend -- --files test/browser/perf-boundaries/converge-steps.test.tsx`
  - `pnpm perf tuning:recommend -- --candidates '[{\"traitConvergeBudgetMs\":200,\"traitConvergeDecisionBudgetMs\":0.25},{\"traitConvergeBudgetMs\":200,\"traitConvergeDecisionBudgetMs\":0.5}]'`

## 产物在哪里

写入目录：`specs/014-browser-perf-boundaries/perf/tuning/`

- 可读结论（稳定入口）：`specs/014-browser-perf-boundaries/perf/tuning/recommendation.latest.md`
- 机器可解析结论（稳定入口）：`specs/014-browser-perf-boundaries/perf/tuning/recommendation.latest.json`
- sweep 原始报告（每个候选一份）：`specs/014-browser-perf-boundaries/perf/tuning/sweep.017.*.json`

## 如何解读

打开 `specs/014-browser-perf-boundaries/perf/tuning/recommendation.latest.md`：

1. 看 `Winner`（推荐默认值）；
2. 复制“推荐配置”到你的 `Logix.Runtime.make(..., { stateTransaction: ... })`；
3. 若要形成更强证据，用 `014` 的全量跑道再跑一次 Before/After：见 `specs/014-browser-perf-boundaries/perf/README.md`。

### 当前评分口径（透明且可复现）

当前 sweep 的推荐口径是“先守住硬门，再尽量抬高上限”：

- 只看 suite：`converge.txnCommit`
- 只看 budget：`commit.p95<=50ms`
- 只看 `convergeMode=auto` 的切片，并按 `dirtyRootsRatio` 分 whereSlice
- 每个切片的 `maxLevel` 由 014 的 `thresholds` 口径计算（沿 `primaryAxis=steps` 扫描得到）
- 选择 winner：
  1. 最大化 `worstMaxLevel`（所有切片里最差的那个 maxLevel）
  2. 若并列，再最大化 `sumMaxLevel`（所有切片 maxLevel 之和）

这能保证推荐值不会“只对某个切片很快，但其它切片明显回归”。

> 说明：`auto<=full*1.05` 属于 014 的 runtime 类硬门，由 `converge.txnCommit` 用例自身断言；若失败，该候选会在 sweep 里被标记为 error（不会进入推荐排序）。

## 当前 sweep 覆盖的控制面

- `traitConvergeBudgetMs`（013 控制面）：派生收敛执行预算（ms）。
- `traitConvergeDecisionBudgetMs`（013 控制面）：Auto 决策阶段预算（ms）。

> 环境变量入口（用于复现实验）：`VITE_LOGIX_TRAIT_CONVERGE_DECISION_BUDGET_MS` / `VITE_LOGIX_TRAIT_CONVERGE_BUDGET_MS`

## “旧默认 vs 新默认”的对照配方（不需要单独的 baseline 参数）

把“旧默认/回退基线”写成一个显式 candidate，和新候选一起跑 sweep 即可：

- 例：`pnpm perf tuning:recommend -- --profile default --candidates '[{\"traitConvergeBudgetMs\":200,\"traitConvergeDecisionBudgetMs\":0.5},{\"traitConvergeBudgetMs\":200,\"traitConvergeDecisionBudgetMs\":1}]'`

拿到 winner 后，再用 014 跑 Before/After diff 把结论升级为发布级证据（尤其要看硬门与回归）。

## 常见注意事项（避免跑出来“假结论”）

- 同机同配置再对比：尤其是浏览器版本/headless/电源模式/后台负载。
- quick 只用于迭代反馈：如果 winner 的优势很小或贴近阈值，建议用 `--profile default` 或重复跑同一候选确认。
- 当你准备把推荐值升为默认：务必走一遍 014 的 Before/After diff（P1 suite 过硬门、无回归再说）。

## 上游事实源

- 013（控制面语义与证据字段）：`specs/013-auto-converge-planner/`
- 014（跑道/矩阵/对比口径）：`specs/014-browser-perf-boundaries/`
