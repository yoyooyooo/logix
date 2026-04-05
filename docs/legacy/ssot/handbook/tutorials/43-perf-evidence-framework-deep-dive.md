---
title: 性能证据框架教程 · PerfReport/PerfDiff/perf matrix 的可比性门禁（从 0 到 1）
status: draft
version: 1
---

# 性能证据框架教程 · PerfReport/PerfDiff/perf matrix 的可比性门禁（从 0 到 1）

> **定位**：本文是对 `logix-perf-evidence` 的深水区解释：PerfReport/PerfDiff 是什么、为什么必须强调“可比性（comparability）”、以及如何用 perf matrix 把性能预算固化成长期回归防线。  
> **裁决来源**：权威手册在 `.codex/skills/logix-perf-evidence/references/perf-evidence.md`；本文把它提炼成“新成员上手 + 老成员回味”的教程剧本。

## 0. 最短阅读路径（10 分钟上手）

1. 先读 `docs/ssot/handbook/tutorials/15-perf-evidence-and-diagnostics-budgets.md`：建立“诊断成本门控 + perf 证据”的整体闭环。  
2. 读 `.codex/skills/logix-perf-evidence/references/perf-evidence.md` 的「强制可比性」：理解 `comparable=false` 时禁止下硬结论。  
3. 读「2.2 PerfReport 的 thresholds（maxLevel）」：掌握最重要的可扫指标。  
4. 最后读「3.1/3.2」：两种最常用剧本（探索式 triage vs 交付式 hard gate）。

## 1. 心智模型（为什么性能证据必须“可比”）

### 1.1 没有可比性门禁，性能讨论只会变成争论

性能对比最容易“看起来有结论但其实不可复现”，常见原因：

- before/after 不同机器/不同浏览器版本/不同 profile；  
- 采样窗口不同、参数不同、矩阵不同；  
- 代码 dirty 状态不同导致“隐形变更”；  
- 噪声太大（未做稳定性约束）。

因此本仓把“可比性”做成第一等元信息：

- `PerfDiff.meta.comparability.comparable` 是硬门：`false` 时禁止下“回归/提升”的硬结论。  
- 允许在探索模式下用它做线索，但必须标注“不确定性来源”。

### 1.2 PerfReport/PerfDiff 是“机器可读证据”，不是日志

Perf 报告的设计目标：

- 机器可解析（JSON schema 固化）；  
- 指标口径稳定（p95/median 等）；  
- 预算与阈值可自动判定（thresholds/maxLevel）；  
- 可沉淀到 specs/<id>/perf/*（可交接）。

相关 schema：

- `.codex/skills/logix-perf-evidence/perf-report.schema.json`
- `.codex/skills/logix-perf-evidence/perf-diff.schema.json`

## 2. 核心链路（从 0 到 1：LOGIX_PERF_REPORT → collect → diff → interpretation）

### 2.1 Browser 用例如何产出 PerfReport：`LOGIX_PERF_REPORT:<json>` 单行协议

事实源：

- `packages/logix-react/test/browser/perf-boundaries/protocol.ts`
  - `LOGIX_PERF_REPORT_PREFIX = 'LOGIX_PERF_REPORT:'`
  - 用例结束时 `console.log(`${PREFIX}${JSON.stringify(report)}`)`

原因：browser 环境不适合直接写文件；用“稳定前缀 + JSON 单行”让 Node 侧脚本可靠抓取并落盘。

### 2.2 collect：从 stdout/stderr 抓取并合并为一份 PerfReport

事实源（工具链说明）：

- `.codex/skills/logix-perf-evidence/SKILL.md`
- `specs/014-browser-perf-boundaries/spec.md`（collect 路线说明）

关键要点：

- collect 负责运行 suite（通常是 `packages/logix-react` 的 vitest browser project）  
- 抓取所有 `LOGIX_PERF_REPORT:` 行  
- 合并落盘到 `specs/<id>/perf/after.*.json`（或 before）

### 2.3 diff：产出 PerfDiff，并强制输出 comparability

事实源：

- `.codex/skills/logix-perf-evidence/references/perf-evidence.md`（如何读 PerfDiff）

强制流程：

1. diff 前先看 `meta.comparability.comparable`  
2. `false` → 只能输出“线索”，必须写明 mismatch/warnings  
3. `true` → 才能用 thresholds/maxLevel 下“回归/提升”的硬结论

### 2.4 thresholds（最重要的可扫指标）：预算内最大加压档位（maxLevel）

PerfReport 的 `thresholds[]` 语义（强烈建议所有汇总优先看它）：

- 固定其它维度（where）  
- 沿 primaryAxis（加压档位）从低到高扫描  
- 找到最后一个仍满足 budget 的 level → `maxLevel`

因此 `beforeMaxLevel=2000, afterMaxLevel=800` 的含义是：

- 在同一 budget/同一 where 下，before 能承载到 2000；after 从更高档位开始超预算/缺点位/超时，只剩 800 稳定通过。

## 3. 剧本集（最常用的两种模式）

### 3.1 剧本 A：探索式 triage（并行迭代友好）

目标：快速判断趋势，不要求硬结论。

建议：

- profile 用 `quick`（便宜）  
- 在同一工作区反复采集（r1/r2/时间戳命名）  
- diff 用 `pnpm perf diff:triage`  
- 当 `comparable=false`：只写“疑似变化，需复测确认”

适用场景：

- 你正在重构核心路径，需要频繁看趋势；  
- before/after 难以做到完全隔离，但需要方向反馈。

### 3.2 剧本 B：交付式 hard gate（可复现硬结论/长期基线）

目标：对外宣称“已回归/已达标/可作为长期基线”。

强约束（MUST）：

- profile 必须 `default`（更稳用 `soak`）  
- before/after 同机同环境、同采样参数、同矩阵口径  
- diff 的 `comparable=true` 才能下结论  
- 产物落盘到 `specs/<id>/perf/*` 并写结论摘要（解释 maxLevel/预算变化）

## 4. 代码锚点（Code / Doc Anchors）

1. `.codex/skills/logix-perf-evidence/references/perf-evidence.md`：权威手册（如何跑/如何读/如何对比）。  
2. `.codex/skills/logix-perf-evidence/perf-report.schema.json`、`.codex/skills/logix-perf-evidence/perf-diff.schema.json`：数据模型契约。  
3. `packages/logix-react/test/browser/perf-boundaries/protocol.ts`：`LOGIX_PERF_REPORT` 输出协议。  
4. `specs/014-browser-perf-boundaries/spec.md`：browser perf 跑道与 collect/diff 的整体说明。  
5. `docs/ssot/handbook/tutorials/15-perf-evidence-and-diagnostics-budgets.md`：性能证据闭环的上层教程。  

## 5. 验证方式（Evidence）

你可以把“是否可交付”压缩成 3 个检查：

1. `PerfDiff.meta.comparability.comparable === true`（硬门）  
2. `thresholdDeltas` 可解释（maxLevel 变化能指回哪条预算/哪组 where）  
3. 结论可复跑（同 profile/同矩阵/同环境能复现）

## 6. 常见坑（Anti-patterns）

- 用 `quick` 下硬结论（quick 只用于探路）。  
- before/after 不可比却宣称“回归/提升”（必须先修可比性）。  
- 只看单点耗时不看 thresholds（会被噪声误导）。  
- 证据不落盘到 specs（下一位维护者无法复现/无法对齐）。  
