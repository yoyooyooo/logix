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

入口（当前最小载体）：`examples/logix-sandbox-mvp`

- 选择代表性模块 → 触发一次受控检查（trial-run + artifacts）。
- UI 展示：工件（按 key/version 分组）+ verdict + reasons（可回指到工件字段）。
- 可导出：下载上述 JSON 工件（用于 PR 审阅、回归、或交给 Agent）。

## 2) CI（Node）：机器判定 + 可存档

入口（规划）：

- 对代表性模块执行同口径检查，产出同一组 JSON 工件（与 Workbench 一致）。
- 对 `ContractSuiteVerdict@v1.verdict` 执行 gate：`FAIL` 阻断；`WARN` 可配置为告警/阻断。
- 把工件存档到 CI artifacts（用于回放与审阅）。

## 3) Agent：IR-first 迭代闭环（平台价值）

推荐闭环（规划）：

1. 平台生成 `ContractSuiteContextPack@v1`（facts + constraints + target）。
2. Agent 输出代码 patch（文本 diff 或 AST patch；AST 仅是载体）。
3. 平台重跑 Contract Suite：产出新工件 + 新 verdict，作为“客观反馈”驱动下一轮迭代。

关键点：

- **不要**让 Agent 自己判断“是否通过”；让 verdict 成为裁判。
- **不要**把 runtime 私有结构或整个仓库打包给模型；用 Context Pack 控制上下文与权限边界。
- Context Pack 可选携带 `facts.inputs`（StageBlueprint/UIBlueprint/BindingSchema/UiKitRegistry/CodeAsset），让 Agent 在“最小编辑上下文”内工作。
