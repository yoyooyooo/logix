---
name: logix-perf-evidence
description: 运行与维护 Logix 的性能证据框架（PerfReport/PerfDiff、LOGIX_PERF_REPORT、perf matrix），用于在特性规划/实现/验收中强制建立“可对比”的性能证据闭环（collect→diff→结论），并提供强约束的可比性门禁（同环境/同 profile/同采样参数）与命名落点；适用于任何触及 Logix Runtime 核心路径或需要性能预算/回归防线的任务。
---

# Logix Perf Evidence

## Overview

- 用最少入口命令完成 perf 证据闭环：collect（采集并落盘）→ diff（对比产出 PerfDiff）→ interpretation（写结论）。
- 本 skill 自带脚本入口（见本目录 `package.json`），核心脚本与矩阵/schema 也在本 skill 内（`scripts/`、`assets/`、`references/`）。
- 默认约定：证据优先归档到 `specs/<id>/perf/*`；`<id>` 可由用户显式提供（例如在输入里直接出现 `specs/NNN-xxx`），若未给出则先从对话上下文推断，不确定再追问。
- baseline 语义：`before` 可以是“改动前代码基线”，也可以是“同一代码下的参考配置/参考引擎”（A/B），两者都复用同一套 collect/diff/解读口径。

## 探索模式（并行迭代友好）

> 目标：快速判断方向，不影响“同分支并行迭代”；允许 before/after 混杂其它改动，把结果当作线索而非判门。

- **多次自我对比**：同一工作区反复 collect（建议 `profile=quick`），用 `r1/r2/...` 或时间戳命名落盘。
- **diff 只做线索**：用 `pnpm perf diff:triage`（允许 config/env drift）快速看趋势；`meta.comparability.comparable=false` 时只写“可能更好/更差”，不下硬结论。
- **需要硬结论再升级**：当你要对外宣称“已回归/已达标/可作为长期基线”时，再按下方 `MUST` 口径补一份更严格的证据。

## 交付门（MUST，硬结论才需要）

> 目标：避免“马后炮才发现 before/after 不可比 → 只能争论”，把证据闭环前置到 `plan.md`。

- **先选 baseline 语义**：`代码前后 (commitA→commitB)` 或 `策略 A/B (同一代码不同配置)`（二选一写进 `plan.md`）。
- **锁死可比性参数**：before/after 必须同 `profile` + 同采样参数 + 同矩阵口径（`matrixId/matrixHash`）（交付结论必须 `default` 或 `soak`；`quick` 只用于迭代探路）。
- **命名即约束**：强制把 `envId` + `profile` 写进文件名（避免“叫 quick 但其实不是”的误导）。
- **失败策略写清楚**：出现 `stabilityWarning/timeout/missing suite` 时，结论必须标注不确定并复测（profile 升级或缩小子集）。

## 策略对比 vs 代码对比（怎么跑）

- **策略 A/B（推荐，且不需要 git worktree）**：同一份代码下对比 `legacy/selectorGraph`、`sync/suspend/defer` 等配置轴，直接在当前工作区跑 collect（矩阵里已覆盖策略轴）；这是本仓最常用的 “before/after” 语义（同代码、不同策略）。
- **代码前后（Before/After，三档隔离强度）**：
  - **默认（同一工作区）**：先采 `before.*.json`，改动后再采 `after.*.json`；允许并行未提交改动导致 after 轻微漂移，但结论必须注明不确定性来源，并以 diff 的 `meta.comparability.warnings` 为准。
  - **更稳（同一工作区 + 先把无关并行改动收敛）**：不要求 `git worktree`；只要求 before/after 期间尽量减少额外变更（例如暂停其它 perf-heavy 任务），并确保命令/参数完全一致。
  - **强隔离（可选）**：当你需要“可复现的硬结论”时，再考虑用 clean commit/`git worktree` 做隔离采集。注意：`git worktree` **不会自动携带你当前工作区的未提交改动**；若 after 依赖这些改动，你只能先把改动变成可复用形态（例如 commit/cherry-pick 或手动同步文件），否则 `git worktree` 的 after 代表不了你的真实 after。

## Quick Start（最短闭环）

- 采集（建议显式指定输出）：`pnpm perf collect -- --out specs/<id>/perf/after.local.<envId>.<profile>.json`
- 对比（硬结论口径）：`pnpm perf diff -- --before <before.json> --after <after.json> --out <diff.json>`
- 对比（探索口径/允许漂移）：`pnpm perf diff:triage -- --before <before.json> --after <after.json> --out <diff.json>`
- 解读 GitHub Actions artifact（下载目录/`perf/ci` 目录均可）：`pnpm perf ci:interpret -- --artifact <dir> [--out <summary.md>]`

> 重要：`pnpm perf diff` 产物会带 `meta.comparability`。`comparable=false` 时**禁止**下“性能回归/提升”的硬结论，只能作为线索。

## 常用任务

### 把证据落在其它 spec（推荐）

- 采集到你的目录：`pnpm perf collect -- --out specs/<id>/perf/after.local.<envId>.<profile>.json`
- 只跑子集：`pnpm perf collect -- --files test/browser/perf-boundaries/<file>.test.tsx`
- diff 落盘到你的目录：`pnpm perf diff -- --before specs/<id>/perf/before.<...>.json --after specs/<id>/perf/after.<...>.json --out specs/<id>/perf/diff.<...>.json`

### 017 调参实验场（推荐默认值）

- 快速闭环（quick）：`pnpm perf tuning:best`
- 自定义 sweep：`pnpm perf tuning:recommend -- --profile default --retries 2`

## 深入阅读（本 skill 自带）

- 如何跑/如何读/如何对比（核心手册）：`.codex/skills/logix-perf-evidence/references/perf-evidence.md`
- 探索式解读模板（本次探索流程固化）：`.codex/skills/logix-perf-evidence/references/perf-evidence.md`（搜 `探索式解读（命令模板）`）
- 如何新增 suite/场景/脚本（作者指南）：`.codex/skills/logix-perf-evidence/references/authoring.md`
- 实现脚本（维护入口）：`.codex/skills/logix-perf-evidence/scripts/*`
