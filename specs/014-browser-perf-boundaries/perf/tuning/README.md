# 014 / perf / tuning（调参产物怎么读）

`tuning/` 是 017 调参实验场的产物目录：它把“当前代码下的推荐默认配置”固化成可复现的证据文件，避免只看一堆原始 json 无从下手。

## 最短闭环（你只想要结论）

1) 运行 017 一键推荐：`pnpm perf tuning:best`  
2) 打开人类可读结论：`specs/014-browser-perf-boundaries/perf/tuning/recommendation.latest.md`  
3) 若准备把推荐值升为默认：再用 014 的 Before/After 跑道做一次对比验证（见 `specs/014-browser-perf-boundaries/perf/README.md`）

## 这里会出现哪些文件

- `recommendation.latest.md`：稳定入口（给人看）。每次运行会被覆盖为最新结论。
- `recommendation.latest.json`：稳定入口（给机器/LLM）。每次运行会被覆盖为最新结论。
- `recommendation.017.<profile>.md|json`：某次 profile 的推荐结论（按文件名区分）。
- `sweep.017.*.<profile>.json`：每个候选参数的一份原始报告（PerfReport）。

## recommendation.latest.md 怎么解读（只看 3 块）

1) `Winner`：推荐默认值（可以直接复制到 Runtime/Provider 配置里）。  
2) `评分`：
   - `worstMaxLevel`：所有切片里“最差”的可通过上限（越大越稳健）。
   - `sumMaxLevel`：所有切片上限之和（越大越整体更好）。
3) `切片明细`：按 `dirtyRootsRatio` 拆分的上限与 p95（用来解释“哪类写入分布更敏感”）。

> 说明：这里的 `maxLevel` 来自 014 跑道对预算的阈值扫描（沿 primaryAxis 递增，找出“还能稳定通过预算”的最大 level）。

## 如何把推荐值落到真实工程（更安全的方式）

推荐值的最佳实践是“先局部，再全局”：

1) **先局部止血/试探**：优先用模块级或 Provider 子树级覆盖，不要一上来改全局默认。  
2) **再做 Before/After**：确认无回归、硬门通过后，再把推荐值升为 Runtime 默认。  

用户视角的配置与覆盖优先级说明见：`apps/docs/content/docs/guide/advanced/converge-control-plane.md`。

## 相关入口（按“从结论到证据”）

- 014 证据与对比跑道：`specs/014-browser-perf-boundaries/perf/README.md`
- 017 调参实验场（为什么这么评、能调什么）：`specs/017-perf-tuning-lab/README.md`

## 给 LLM 的“读 recommendation 提示词模板”（可直接复制）

把 `recommendation.latest.json` 路径贴给 LLM，并附加以下要求：

1) 只基于 `summary` 与 `winner` 下结论；不要去“猜测”未包含的点位；
2) 必须先判断硬门/安全性：若 `summary.hardGate.failed > 0` 或存在不可比/失败候选占比很高，先输出风险提示与建议复跑；
3) 输出结构固定为 5 段：
   - Winner 配置（可复制）
   - 为什么赢（score + 关键切片）
   - 不确定性（失败候选数、缺阈值/缺指标原因分布）
   - 是否适合作为默认值（保守结论 + 条件）
   - Next actions（是否需要用 `profile=default` 复跑/是否进入 014 Before/After）
4) 每条结论都要带上证据文件路径（`winner.evidence.reportFile`）。
