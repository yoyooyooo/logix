# Discussion: CLI Agent First Control Plane Cutover

本文件不持有 authority。接受后的裁决必须回写到 [spec.md](./spec.md) 或 [../../docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)。

## Adopted Freeze Summary

Round 1 采用三命令 Agent First route，但加强目标函数和 proof obligation：

- CLI 先通过 existence gate；若不能提供稳定 shell/CI artifact contract，应删除 public CLI。
- public command surface 冻结为 `check / trial / compare`。
- `CommandResult` 只作 stdout transport envelope，必须用 `primaryReportOutputKey` 指向 `VerificationControlPlaneReport` artifact。
- `CommandResult.inputCoordinate` 只保存重跑所需 locator/ref，不拥有输入 truth。
- Agent discovery v1 只使用 package-local static schema artifact as derived mirror 和 docs SSoT；删除 public `describe`、public `--describe-json` 与 `CliDescribeReport`。
- package-local schema artifact 只能是 SSoT / core schema 的派生镜像，不拥有 command contract authority。
- global `--mode report|write` 删除；唯一 `--mode` 只属于 `trial`。当前可执行成功路径是 `trial --mode startup`，`trial --mode scenario` 保留为后续升级层，在 core-owned scenario executor 落地前返回结构化失败。
- input authority、hint sidecar 和 diagnostic coordinate 分链；selection manifest 不属于 input authority chain，`focusRef` 只属于 repair hint 或 selection manifest hint。
- Agent 调度只认 top-level `nextRecommendedStage`；`repairHints[].upgradeToStage` 只作 hint-local explanation。
- artifact key namespace 统一为 `artifacts[].outputKey`；`artifact ref` 只作 locator。
- `logix compare` 只是 control-plane compare route，必须满足 compare authority precondition 后才能算实现完成。
- 旧 `085` Markdown 文件已经加 superseded / negative-only 首屏声明，继续只作背景。

## Current Residual Risks

| risk | current handling | reopen trigger |
| --- | --- | --- |
| `Runtime.trial` 当前可用 facade 与 CLI entry loader 对接细节不明 | `160` 要求按 Program entry 走真实 trial route | Program entry loader 无法稳定加载 workspace TS entry |
| canonical evidence package exact file shape 不在 CLI 页冻结 | 由 verification control plane 和 evidence owner 持有 | CLI 需要新增 evidence envelope 才能工作 |
| machine-readable discovery 可能仍需要命令形态 | v1 只允许 package-local static schema artifact | Agent 无法稳定发现 package-local schema artifact |
| 删除 `transform.module` 可能移除早期源码改写入口 | forward-only 删除，必要能力后续走 toolkit/intake 或独立 spec | 真实 Agent workflow 证明 writeback 加速器必要且可不增加第二 truth |
| 删除 `contract-suite.run` 可能影响旧 CI | 零存量用户前提下不保留兼容 | 真实外部 CI 依赖出现，并先更新 forward-only 前提 |
| compare 过早产品化 | compare route 必须先满足 core-owned compare authority precondition | core compare executor 或 input contract 不能按 09 收敛 |
| exact rerun locator shape 需要实现证明 | `inputCoordinate` 冻结为 locator/ref 快照，具体字段由 proof pack 验证 | Agent 无法用 `inputCoordinate` 重跑同一 stage 或升级 stage |

## Rejected Alternatives

| alternative | rejected reason |
| --- | --- |
| 删除 public CLI，只保留 repo-local scripts | Agent 和 CI 会失去稳定 artifact contract，证据消费会散到脚本 |
| 单命令 `logix verify --stage ...` | 宽入口会把 stage、mode、input admissibility 混在参数里，Agent 误用率更高 |
| v1 只公开 `check / trial` | repair closure 会把 before/after compare truth 推给 Agent 或 CI script |
| public `logix describe` 或 `--describe-json` | 会形成第四 public surface，且容易把 archived command set 带回 Agent discovery |
| 保留 `ir.*` 为 public expert commands | 会让 Agent 面对两层 route，并把旧 IR 工具箱心智拉回当前 public surface |
| 保留 `contract-suite.run` as one-shot gate | 会形成 `check / trial / compare` 之外的第二 gate identity |
| 保留 `transform.module` as Agent accelerator | 会把 CLI 从 verification route 拉回 writeback/productivity tool，且重开源码 mutation surface |
| 继续允许 Module entry fallback | 和当前 Program 装配主链冲突 |
| CLI 定义自己的 evidence import envelope | 会和 canonical evidence package 形成第二 truth |
| `CommandResult` 直接承载 report authority | 会让 stdout envelope 与 control-plane report 变成两套 authority |
| schema artifact 拥有 command contract authority | 会让 package artifact 与 SSoT/core schema 形成第二 schema truth |
| selection manifest 进入 input authority chain | 会把 entry hint 升格成第二输入权威 |
