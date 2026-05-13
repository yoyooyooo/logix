# Agent-first Flat CLI 初始提案吸收记录

**状态**: absorbed into `logix live` public namespace contract
**日期**: 2026-05-01
**权威落点**: [../../../docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)
**评审账本**: [../../../docs/review-plan/runs/2026-05-01-171-agent-first-flat-cli.md](../../../docs/review-plan/runs/2026-05-01-171-agent-first-flat-cli.md)

## 最终裁决

本文件最初提出 flat task-oriented CLI：

```bash
logix status
logix capture
logix snapshot
logix trigger
logix wait
logix export
```

该初始方案已经被吸收完毕。最终公开 CLI 合同冻结在 `15-cli-agent-first-control-plane.md`。

面向开发者和 Agent 的公开 CLI 命令完全相同：

```bash
logix check
logix trial --mode startup
logix compare
logix live <task>
```

当前 public live/debug/evidence root 只有一个：`logix live`。

`trial --mode scenario` 是 reserved future upgrade；在 core-owned scenario executor 落地前只能结构化失败。

## 吸收结果

| 初始候选 | 最终处置 | 原因 | 归属 |
| --- | --- | --- | --- |
| `logix status` | 不进入 root；归位为 `logix live status` | status 属于 live attachment projection，不应和 verification roots 并列 | core-owned attachment projection |
| `logix capture` | 不进入 root；归位为 `logix live capture` | capture 是 live evidence capability，不是 verification stage | `capture.eventWindow` 与 canonical evidence handoff |
| `logix snapshot` | 不进入 root；归位为 `logix live snapshot` | snapshot 是 drilldown/capture artifact，不能误读成 verdict | `snapshot.read` evidence facet 或 artifact |
| `logix trigger` | 拒绝；改为 `logix live dispatch` | mutation verb 必须 1:1 映射 `dispatch.declaredAction` admission、denial、failure taxonomy | core-owned `dispatch.declaredAction` operation admission |
| `logix wait` | 不进入 root；归位为 `logix live wait` | wait 是 live operation/capture 辅助能力 | `wait.condition` evidence |
| `logix export` | 不进入 root；归位为 `logix live export evidence` | export 必须输出 canonical evidence package ref，不接受裸 session truth | canonical evidence package handoff |
| `logix live ...` | 采纳 | 单一 namespace 隔离 live runtime/server 通信，避免多个 root 命令污染验证心智 | public live collaboration route |
| `logix debug ...` | 拒绝 | debug 词过宽，会混合 evidence、operation、profile 和产品调试心智 | `logix live ...` |
| `logix runtime ...` | 不进入 public CLI | `runtime` 是 owner vocabulary，不是 public CLI namespace | runtime control plane docs |
| `logix evidence ...` | 不进入 public CLI | evidence 是 input/provenance/artifact，不是 command namespace | canonical evidence envelope |

## 当前公开 CLI 合同

| command | current successful form | owner | output authority |
| --- | --- | --- | --- |
| `check` | `logix check` | `runtime.check` | `CommandResult` transport points to `VerificationControlPlaneReport(stage="check")` |
| `trial` | `logix trial --mode startup` | `runtime.trial(mode="startup")` | `CommandResult` transport points to `VerificationControlPlaneReport(stage="trial")` |
| `compare` | `logix compare` | `runtime.compare` | `CommandResult` transport points to `VerificationControlPlaneReport(stage="compare")` |
| `live` | `logix live <task>` | `171` core-owned attachment / operation / evidence handoff | `LiveCommandResult` transport points to live artifact、operation facet、canonical evidence package ref 或 evidence gap |

规则：

- `CommandResult` 只是 stdout transport envelope。
- `LiveCommandResult` 是 live stdout transport envelope；它不是 report、session、runtime identity 或 evidence authority。
- `VerificationControlPlaneReport` 是唯一 machine report authority。
- canonical evidence package 只能作为 input、provenance 或 artifact payload。
- selection manifest 只是 hint sidecar。
- public CLI 不拥有 report、stage、verdict、session、finding、evidence envelope、operation 或 runtime truth。
- Agent discovery 只使用 package-local static schema artifact 与 docs SSoT；不开放 `describe` 或 `--describe-json` public route。

## Live Command Gate

任何新增 `logix live` 子命令必须提交：

- input authority。
- output authority。
- denial shape。
- artifact key namespace。
- stage/admissibility class。
- discovery source。
- no-second-truth proof。
- command-count proof。
- misuse proof。
- dogfood proof。
- mutation route 的 safety proof。

## 一句话结论

flat 初始方案已经被吸收并裁决：最终 public CLI 是 `check / trial / compare + live`。Flat live commands 不进 root，全部归位到 `logix live <task>`。
