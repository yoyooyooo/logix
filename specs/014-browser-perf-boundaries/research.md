# Research: 014 浏览器压测基线与性能边界地图

**Branch**: `[014-browser-perf-boundaries]`  
**Date**: 2025-12-17  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/014-browser-perf-boundaries/spec.md`

本特性不存在未决的 “NEEDS CLARIFICATION”。以下内容用于把关键决策与备选方案固化为可交接证据。

## Decisions

### 1) 主跑道：Vitest browser mode 长链路集成测试

- Decision: 以 `vitest` browser mode（Playwright Chromium）作为性能基线与边界测量的主跑道。
- Rationale: 真实浏览器环境更贴近用户感知与渲染/事件循环成本；同时可复用 `packages/logix-react/test/browser/*` 的 React host 形态，避免 Node-only micro-benchmark 失真。
- Alternatives considered:
  - Node micro-benchmark（仅作辅证，不能替代主跑道）
  - 纯 Playwright test runner（不与现有 Vitest 体系统一）

### 2) SSoT：矩阵 + schema + 本地落盘

- Decision: `matrix.json` 作为维度/档位/预算/样本策略/稳定性阈值的单一事实源；`contracts/schemas/*` 固化 report/diff JSON schema；原始证据固定落盘到 `specs/014-browser-perf-boundaries/perf/*`。
- Rationale: 把“边界地图”变成可复用资产，保证任意 runtime 改动都能复用同一套口径回归；schema 版本化避免“同名不同义”的误判。
- Alternatives considered:
  - 只用 TS 类型（难以跨语言/跨工具消费，缺 schema 稳定门禁）
  - 只写人类日志/截图（不可对比，不可门禁）

### 3) 指标口径：median + p95；预算：absolute + relative

- Decision: 时间类 metric 固定输出 `median` + `p95`，预算阈值默认使用 `p95`；预算同时支持绝对 ms（`p95<=Xms`）与相对 ratio（如 `auto/full<=1.05`）。
- Rationale: median 适合看整体趋势，p95 适合对交互 tail 建门禁；relative 预算用于表达“智能策略不低于 baseline”的下界承诺。
- Alternatives considered:
  - 只用均值/只用 p99（对波动更敏感，且难以稳定门禁）

### 4) 相对预算配对规则：match-all-except-ref

- Decision: relative budget 的 numerator/denominator 配对规则为：除 ref 中出现的轴外，其余 params 必须完全一致；缺失/timeout/failed/metric unavailable 必须输出 `unavailable + reason`。
- Rationale: 避免“模糊配对”导致口径漂移；保证 diff 能稳定定位“从哪个档位开始越界”。
- Alternatives considered:
  - 允许近似配对（在多轴场景下易产生误配，降低可信度）

### 5) 稳定性（噪声）判定：动态带宽

- Decision: 对同一 suite+params+metric 的两次运行（前一次 baseline），若 `absΔp95Ms <= max(maxP95DeltaMs, baselineP95Ms * maxP95DeltaRatio)` 则认为在容忍范围内，否则输出噪声提示。
- Rationale: 同时兼容小数值指标（避免 ratio 过敏）与大数值指标（避免固定 ms 过松/过紧），更适合作为长期回归门禁口径。
- Alternatives considered:
  - 纯 ratio / 纯 ms / 简单 OR（更容易误判或过度敏感）

### 6) 负优化边界：以 `uniquePatternPoolSize` 为主加压轴

- Decision: 负优化对抗场景的阈值沿 `uniquePatternPoolSize`（示例档位 8/64/512/4096）主轴计算；`patternKind` 仅作为调度策略分面（含反直觉场景），并强制固定 `seed` 可复现。
- Rationale: 负优化通常与高基数、逐出/自我保护阈值直接相关；以 pool size 加压更容易得到稳定“边界阈值”用于长期对照。
- Alternatives considered:
  - 只枚举场景不求阈值（无法形成边界地图）
  - 以 noiseRate/steps 为主轴（更难把“资源上界”边界表达成稳定阈值）

### 7) 报告体积与噪声：默认不固化 `samples`

- Decision: `Perf Report` 默认只写 `stats`（median/p95），不写每次 run 的原始 `samples`；需要分布诊断时才开启样本采集并在 meta 中可解释区分。
- Rationale: 减少 `perf/` 基线文件体积与噪声固化成本；让长期对照资产保持稳定、可 review。
- Alternatives considered:
  - 默认全量 samples（文件大、噪声多，降低长期可维护性）
  - 仅 baselinePoints 写 samples（折中，但仍需实现与维护额外分支）

## References

- 矩阵 SSoT：`@logix/perf-evidence/assets/matrix.json`（物理：`.codex/skills/logix-perf-evidence/assets/matrix.json`）
- 报告 schema：`@logix/perf-evidence/assets/schemas/perf-report.schema.json`（物理：`.codex/skills/logix-perf-evidence/assets/schemas/perf-report.schema.json`）
- diff schema：`@logix/perf-evidence/assets/schemas/perf-diff.schema.json`（物理：`.codex/skills/logix-perf-evidence/assets/schemas/perf-diff.schema.json`）
