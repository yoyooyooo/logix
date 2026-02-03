# Quickstart: Workbench Contract Suite（036：Workbench/CI/Agent 复用同一闭环）

**Date**: 2025-12-26  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/036-workbench-contract-suite/spec.md`  
**Plan**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/036-workbench-contract-suite/plan.md`

> 本 quickstart 只描述“入口与产物”，不承诺具体 UI/脚本落点（实现细节以 `specs/036-workbench-contract-suite/tasks.md` 为准）。
>
> 作为阅读导航的小抄：`specs/036-workbench-contract-suite/reading-cheatsheet.md`

## 0) 你会拿到什么（统一产物）

一次 Contract Suite 检查的标准输出（版本化工件）：

- `TrialRunReport`：受控试跑报告（含 Manifest/StaticIR/Environment/Evidence，best-effort）
- `Artifacts`：031-035 对应工件集合（允许按可用性降级）
- `ContractSuiteVerdict@v1`：PASS/WARN/FAIL + reasons + per-artifact 状态
- `ContractSuiteContextPack@v1`（可选）：当需要修复/迭代时给 Agent 的最小事实包

## 1) Workbench（浏览器）：人审 + 可导出

入口（可选消费者回归面）：优先用 `086` 的 `/platform-viz/*` 做 UI 回归与解释粒度试验；也可在未来把同一组工件接入 `examples/logix-sandbox-mvp` 做“最小平台 Workbench”。

- 选择代表性模块 → 触发一次受控检查（trial-run + artifacts）。
- UI 展示：工件（按 key/version 分组）+ verdict + reasons（可回指到工件字段）。
- 可导出：下载上述 JSON 工件（用于 PR 审阅、回归、或交给 Agent）。

## 2) CI（Node）：机器判定 + 可存档

入口（已落地）：`logix contract-suite run`（085 CLI）

仓库内最小 demo：`examples/logix-cli-playground`（含 `cli:contract:*` scripts + `--inputs` 注入与 context pack 演示）。

```bash
# 一键跑 Contract Suite（含 trialrun + verdict；失败/或显式 --includeContextPack 时会输出 context pack）
logix contract-suite run \
  --runId cs1 \
  --entry ./path/to/app.ts#AppRoot \
  --out ./.logix/contract-suite/cs1 \
  --requireRulesManifest

# 可选：把 WARN 视为通过（exit code=0）
logix contract-suite run ... --allowWarn

# 可选：对比 baseline 目录（读取 <baseline>/trialrun.report.json），并输出 manifest.diff.json
logix contract-suite run ... --baseline ./.logix/contract-suite/baseline

# 可选：注入最小编辑上下文（facts.inputs）
# - 默认会从 context pack 中剥离 uiKitRegistry（避免过大/泄露）；需要时显式加 --includeUiKitRegistry
logix contract-suite run ... --inputs ./inputs.json --includeContextPack

# 可选：把 Anchor Autofill（079+082）嵌入到本命令（report-only）
# - 一次性拿到 `PatchPlan/AutofillReport`，并写入 context pack（也会写入 `--out` 目录）
logix contract-suite run ... --includeAnchorAutofill --repoRoot .
```

门禁语义（CI 友好）：

- exit code `0`：PASS（或 `--allowWarn` 下的 WARN）
- exit code `2`：VIOLATION（FAIL；或 WARN 且未 allowWarn）
- exit code `1`：ERROR（运行失败/异常/输入不可读）

落盘工件（`--out`）常见文件：

- `trialrun.report.json`（TrialRunReport，默认剥离 trace/evidence；可用 `--includeTrace` 输出 `trace.slim.json`）
- `contract-suite.verdict.json`（ContractSuiteVerdict@v1）
- `contract-suite.context-pack.json`（ContractSuiteContextPack@v1，失败时默认输出；或 `--includeContextPack` 强制输出）
- `manifest.diff.json`（可选：提供 `--baseline` 时）

## 3) Agent：IR-first 迭代闭环（平台价值）

推荐闭环（已可用：用 CLI 串起来）：

1. 运行 `logix contract-suite run`，拿到 `contract-suite.context-pack.json`（facts + constraints + target）。
2. Agent 只基于 Context Pack 输出代码 patch（文本 diff 或 AST patch；AST 仅是载体）。
3. 重跑 `logix contract-suite run`：用新工件 + 新 verdict 作为“客观反馈”驱动下一轮迭代。

关键点：

- **不要**让 Agent 自己判断“是否通过”；让 verdict 成为裁判。
- **不要**把 runtime 私有结构或整个仓库打包给模型；用 Context Pack 控制上下文与权限边界。
- Context Pack 可选携带 `facts.inputs`（StageBlueprint/UIBlueprint/BindingSchema/UiKitRegistry/CodeAsset），让 Agent 在“最小编辑上下文”内工作。
