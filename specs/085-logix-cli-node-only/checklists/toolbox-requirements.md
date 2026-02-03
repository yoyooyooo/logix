# Requirements Checklist（085 · CLI 工具箱）

> 用于实现/验收自检；裁决来源以 `spec.md/plan.md/contracts/*` 为准。

## CLI 基础

- [x] stdout 统一输出 `CommandResult@v1`（无时间戳/随机字段）
- [x] Exit Code 固定：`0=SUCCESS`、`2=USER_ERROR`、`1=INTERNAL`
- [x] 支持 `--out <dir>` 稳定落盘（工件命名可预测）
- [x] 支持 `--timeout/--budgetBytes` 等可控执行边界

## Oracle（Inspect/Run）

- [x] `logix ir export` 能导出 Root IR（含 `modules[*].workflowSurface.digest` 等对齐字段）
- [x] `logix trialrun` 受控试跑可导出 TrialRunReport（失败可解释）
- [x] `logix anchor index` 能输出 AnchorIndex，并对子集外显式 Raw Mode + reason codes

## Gate（Validate/Diff）

- [x] `logix ir validate` 产出结构化门禁报告（含 reason codes/Raw Mode 统计）
- [x] `logix ir diff` 对两份工件稳定 diff（排序/裁剪口径固定）
- [x] 同一输入重复运行输出字节级一致（determinism gate）

## Write-Back（保守回写）

- [x] `logix anchor autofill` 默认 report-only，`mode=write` 才写回
- [x] write-back：expectedFileDigest 竞态防护、最小 diff、幂等（第二次 0 diff）
- [x] 子集外形态一律不写回（Raw Mode + reason codes）

## Transform（可选加速器）

- [x] `transform module --ops delta.json` 支持 batch ops（单命令多变更）
- [x] 默认 `mode=report`（不写回），输出 PatchPlan（可审阅）
- [x] `mode=write`：expectedFileDigest 竞态防护、最小 diff、幂等（第二次 0 diff）

## DX 性能门槛

- [x] `logix --help` 不加载 `ts-morph` 等重依赖（lazy-load）
- [x] cold start `< 500ms`（基线与测量脚本落盘；见 plan.md）

## DX（命令收敛）

- [x] 支持 `logix.cli.json`（cwd 向上查找；或 `--cliConfig` 显式指定）+ `--profile` 叠加 defaults
- [x] 支持 `--outRoot`：未显式 `--out` 时自动落盘到 `<outRoot>/<command>/<runId>`
- [x] 布尔类 flag 支持 `--flag/--noFlag` 且“最后出现者胜”（可覆盖配置默认值）
