---
title: 性能证据闭环：PerfReport / PerfDiff / perf matrix / comparability / 诊断成本门控 教程 · 剧本集
status: draft
version: 1
---

# 性能证据闭环：PerfReport / PerfDiff / perf matrix / comparability / 诊断成本门控 教程 · 剧本集

> **定位**：这是 `docs/ssot/handbook/` 的“维护者教程/剧本集”（how-to），用于新成员上手、老成员回味：把 Logix 的性能证据框架（PerfReport/PerfDiff、perf matrix、可比性门禁、诊断成本门控）讲清楚，让你能在触及 runtime 核心路径时建立“可复现、可对比、可交接”的性能证据闭环。  
> **重要**：本文不是裁决来源；凡涉及 MUST/协议/边界的最终口径以 SSoT 为准（`docs/ssot/platform/**` 与 `docs/ssot/runtime/**`）。

---

## 0. 最短阅读路径（10–20 分钟先建立正确心智）

1. 诊断与性能基线（入口导航）：`docs/ssot/handbook/playbooks/diagnostics-perf-baseline.md`
2. 本仓库 perf-evidence skill（手册 + 脚本入口）：
   - `.codex/skills/logix-perf-evidence/SKILL.md`
   - `.codex/skills/logix-perf-evidence/references/perf-evidence.md`
3. perf matrix（预算与阈值的“规则书”）：`.codex/skills/logix-perf-evidence/assets/matrix.json`
4. PerfReport/PerfDiff schema（协议面，机器可读）：
   - `.codex/skills/logix-perf-evidence/assets/schemas/perf-report.schema.json`
   - `.codex/skills/logix-perf-evidence/assets/schemas/perf-diff.schema.json`
5. 浏览器用例输出协议（LOGIX_PERF_REPORT）：`packages/logix-react/test/browser/perf-boundaries/protocol.ts`
6. 代表性性能门禁用例（诊断开销）：`packages/logix-react/test/browser/perf-boundaries/diagnostics-overhead.test.tsx`

---

## 1. 心智模型：我们追求的不是“跑一个 benchmark”，而是“证据能长期回归”

当你改动 runtime 核心路径时（tick/txn/converge/devtools/process/react 外部订阅…），最危险的不是“这次变慢了”，而是：

- 你跑了一个 before/after，但两次环境/参数不同 → **结论不可比**；
- 你只看一个平均值（mean/median） → p95 退化被掩盖；
- 你没有把结果落盘 → 未来无法复测/无法回归；
- 你没有解释链路（为什么退化） → 只能争论、不能定位。

因此本仓库把“性能证据”定义为一个闭环：

> **collect（采集落盘） → diff（可比性判定 + 阈值变化） → interpretation（写结论/写门禁/写下一步）**

其中最关键的裁决是：**没有 comparability，就没有硬结论**。  
`PerfDiff.meta.comparability.comparable=false` 时，禁止下“回归/提升”的硬结论，只能作为线索并复测。

### 1.1 两种 baseline 语义（都合法，但必须先选）

Perf evidence 支持两种“before/after”语义，你必须在 `plan.md` 里先选一个（避免验收时才发现自己想回答的问题变了）：

1. **代码前后（Commit A → Commit B）**：回答“这次改动是否回归/是否达标？”
2. **策略/配置 A/B（同一代码）**：回答“这个策略的成本/收益是什么？是否在预算内？”  
   这是本仓库更常用的语义：同一代码下对比 `diagnosticsLevel`、`convergeMode`、`reactStrictMode` 等轴。

### 1.2 perf matrix：把“我们关心什么”固化成版本化规则书

perf matrix 的目标不是覆盖所有场景，而是把核心路径的“承载上限/预算门控”固化下来，形成长期回归防线。

权威文件：`.codex/skills/logix-perf-evidence/assets/matrix.json`

它定义：

- suites：每条核心链路一个 suite（例如 converge、diagnostics、external-store ingest…）
- axes：参数维度（矩阵点位）
- primaryAxis：阈值扫描的主轴（“加压档位”）
- budgets：绝对预算/相对预算（门禁口径）
- profiles：smoke/quick/default/soak（采样规模与超时）

> 直觉：matrix 不是“跑完所有点位”，而是“在可控成本下提供可比、可解释的阈值”。

---

## 2. 核心链路（从 0 到 1：LOGIX_PERF_REPORT → PerfReport → PerfDiff）

### 2.1 用例如何输出 PerfReport：LOGIX_PERF_REPORT 前缀协议

浏览器 perf 用例不会直接写文件，它们会向 stdout 打一行 JSON（前缀固定），collect 脚本会抓取并合并：

- 前缀定义：`packages/logix-react/test/browser/perf-boundaries/protocol.ts`
  - `LOGIX_PERF_REPORT_PREFIX = 'LOGIX_PERF_REPORT:'`
  - `emitPerfReport(report)` 会 `console.log(prefix + JSON.stringify(...))`

这条协议非常重要：它把“测试 runner 的输出”变成“可被工具链收集的证据 payload”。

### 2.2 collect：把多个 payload 合并成一个 PerfReport，并补齐环境元数据

collect 脚本：`.codex/skills/logix-perf-evidence/scripts/collect.ts`

关键行为：

- 默认跑 `packages/logix-react` 的 browser 测试（`--project browser`），并从 stdout/stderr 中抓 `LOGIX_PERF_REPORT:` 行；
- 会读取 `.codex/skills/logix-perf-evidence/assets/matrix.json`，计算 `matrixHash`（sha256），写入 report.meta；
- 会补齐 env meta（os/arch/cpu/memoryGb/node/pnpm/vitest/playwright/browser 等）；
- 会写入 git meta（branch/commit/dirty）用于解释与追溯；
- 最终把 suites 合并输出到一个 JSON（默认 `perf/after.local.json`，建议你显式指定到某个 spec 目录）。

### 2.3 PerfReport：报告的“关键字段”（你应该怎么读）

权威 schema：`.codex/skills/logix-perf-evidence/assets/schemas/perf-report.schema.json`

你最应该关心的字段：

- `meta.matrixId/matrixHash`：你的报告是否基于同一份 matrix（不一致通常不可比）
- `meta.config.profile/runs/warmupDiscard/timeoutMs`：采样参数（必须一致才可比）
- `meta.env`：环境（OS/CPU/浏览器版本等；必须一致才可比）
- `suites[].points[]`：每个点位的采样状态与 `medianMs/p95Ms`
- `suites[].thresholds[]`：**门禁核心产物**（maxLevel/firstFailLevel）
- `suites[].comparisons[]`：相对对比（ratio/delta；通常用于诊断成本门控）

### 2.4 thresholds：什么是“预算内最大加压档位”（maxLevel）

thresholds 是为了回答一个更稳定的问题：

> 在同一组 where 条件下，这条 budget 能支撑 primaryAxis 的最大 level 是多少？

举例（概念）：

- suite.primaryAxis = `watchers`
- levels = `[1, 8, 32, 64, ...]`
- budget = `p95<=50ms`

那么 `maxLevel=256` 的含义是：在固定其它维度（where）下，`watchers=256` 仍满足 `p95<=50ms`，再往上就不满足/缺数据/超时/未实现。

对“性能证据闭环”来说，`maxLevel` 比单个点位的 p95 更适合作为长期门禁：

- 更抗噪（噪声会影响临界点，但对“能撑到哪一档”更直观）
- 更可解释（你可以说“承载上限从 256 掉到 128”）
- 更可回归（同一 matrix + 同一 profile 下可对比）

### 2.5 diff：先判可比性，再判回归/提升

diff 脚本：`.codex/skills/logix-perf-evidence/scripts/diff.ts`

输出（权威 schema）：`.codex/skills/logix-perf-evidence/assets/schemas/perf-diff.schema.json`

最重要的一条纪律：

- **先看** `meta.comparability.comparable`
- 只有 `comparable=true` 时，`thresholdDeltas` 才能被当作硬回归/硬提升

不可比的常见原因会体现在：

- `meta.comparability.configMismatches`（profile/runs/timeout/budgets…不一致）
- `meta.comparability.envMismatches`（node/browser/os…不一致）
- `meta.comparability.warnings`（非致命漂移，结论需保守）

---

## 3. 诊断成本门控：`diagnostics=off` 必须接近零成本，`light/full` 成本必须可量化

本仓库的硬原则是“性能与可诊断性优先”，但它的工程含义不是“默认开 full”，而是：

1. 默认 `diagnostics=off` 时，热路径不能被诊断能力拖慢（接近零成本）。
2. 当开启 `light/sampled/full` 时，成本必须可量化、可预算、可解释（不允许默默引入开销税）。

诊断成本门控的关键场景之一：**大量 watchers + 用户交互端到端延迟**。

代表性用例：`packages/logix-react/test/browser/perf-boundaries/diagnostics-overhead.test.tsx`

它做的事情（高层解释）：

- 固定 watcherCount（例如 256）；
- 在不同 `diagnosticsLevel` 下跑同一个 click→paint 场景；
- 产出点位 metrics（e2e.clickToPaintMs）；
- 还会计算 comparisons（ratio/delta），用于回答：
  - `light/off` 的倍率是多少？
  - `full/off` 的倍率是多少？
  - 是否超过相对预算（例如 `<=1.05` 之类）

> 你在改动 DebugSink/DevtoolsHub/trace:effectop/tick 相关逻辑时，应该优先确保这类“诊断开销门”不被破坏。

---

## 4. 剧本集（从“改了代码”到“产出硬证据”的常用路径）

### A) 你改了 hot path（txn/tick/converge）：如何建立“可对比”的硬证据

1. 先跑一次 `profile=quick` 探路（找方向）
2. 再用 `profile=default` 重跑作为交付证据
3. 用 `PerfDiff.meta.comparability` 作为“是否能下结论”的硬门
4. 用 `thresholdDeltas` 写结论（上限变化），必要时附上 top regressions 点位用于定位

### B) 你新增/调整了诊断事件：如何证明“off 不受影响、on 有预算”

1. 确保事件 payload Slim 且可序列化（超限要可解释降级）
2. 通过 diagnostics-overhead suite 证明：
   - `off` 的阈值/上限不变（或在可接受范围内）
   - `light/full` 的倍率落在预算内（ratio budget）

### C) 你改了 matrix 或 budgets：如何避免“结论不可比”

matrix 变化会改变阈值扫描规则，因此：

- `matrixHash` 不同 → diff 通常不可比（或至少会产生强 warning）
- 这类变更必须同步写迁移说明（forward-only）：明确“基线迁移”而非“性能回归”

实务建议：

- 把 matrix 视为协议：改它就相当于改门禁合同
- 对外宣称“回归/提升”前，先确保 before/after 使用同一 matrixHash

### D) 你遇到 `comparable=false`：正确反应是什么

正确反应不是“解释一堆”，而是：

1. 找出 mismatches（config/env），把它们对齐
2. 复测（同 profile、同 browser、同 matrix）
3. 如果仍不可比，只能写“线索”而非结论，并把复测列为阻塞项

---

## 5. 代码锚点（Code Anchors）

perf-evidence skill（脚本与协议）：

- `.codex/skills/logix-perf-evidence/scripts/collect.ts`
- `.codex/skills/logix-perf-evidence/scripts/diff.ts`
- `.codex/skills/logix-perf-evidence/assets/matrix.json`
- `.codex/skills/logix-perf-evidence/assets/schemas/perf-report.schema.json`
- `.codex/skills/logix-perf-evidence/assets/schemas/perf-diff.schema.json`

浏览器 perf 用例与输出协议：

- `packages/logix-react/test/browser/perf-boundaries/protocol.ts`
- `packages/logix-react/test/browser/perf-boundaries/harness.ts`
- `packages/logix-react/test/browser/perf-boundaries/diagnostics-overhead.test.tsx`

手册与新增 suite 指南：

- `.codex/skills/logix-perf-evidence/references/perf-evidence.md`
- `.codex/skills/logix-perf-evidence/references/authoring.md`

---

## 6. 验证方式（Evidence）

最短闭环（推荐把证据落到特性目录）：

- collect：`pnpm perf collect -- --out specs/<id>/perf/after.local.<envId>.<profile>.json`
- diff：`pnpm perf diff -- --before <before.json> --after <after.json> --out specs/<id>/perf/diff.<before>__<after>.json`

探索模式（允许漂移，只做线索）：

- `pnpm perf diff:triage -- --before <before.json> --after <after.json> --out <diff.json>`

只跑子集（只跑某个文件/目录）：

- `pnpm perf collect -- --files test/browser/perf-boundaries/diagnostics-overhead.test.tsx --out specs/<id>/perf/after.local.<envId>.<profile>.json`

---

## 7. 常见坑（Anti-patterns）

1. **用 `quick` 下硬结论**：`quick` 只能探路；交付结论必须 `default/soak`（并且 `comparable=true`）。
2. **忽略 `meta.comparability`**：不可比时任何回归/提升结论都不成立。
3. **before/after matrixHash 不一致**：这通常是“合同变了”，不是“性能回归”；要写迁移说明并重建 baseline。
4. **把日志/IO 放进热路径测量**：会污染 p95；txn window 内尤其要避免。
5. **事件 payload 不 Slim**：会把诊断开销变成隐性税；必须有预算与裁剪策略。
6. **写回/门禁依赖非确定性字段**：createdAt/时间戳/随机数不能成为 diff 锚点；锚点必须稳定。
7. **只看平均值**：门禁应以 p95 与 thresholds 为主（避免 tail regression 被掩盖）。

