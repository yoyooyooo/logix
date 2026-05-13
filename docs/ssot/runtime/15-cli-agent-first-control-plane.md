---
title: CLI Agent First Control Plane
status: living
version: 15
---

# CLI Agent First Control Plane

## 目标

冻结 `@logixjs/cli` 的终局北极星、命令边界、输入输出协议与删除方向。

本页只承接 CLI 作为 Agent First runtime control-plane route 与 live runtime collaboration route 的长期事实。它不重开 authoring surface，不重开 verification control plane，不重开旧 IR 工具箱叙事。

## 目标函数

CLI 的存在本身也要接受终局审查。只有同时满足下面条件，`@logixjs/cli` 才值得保留为 public binary：

- 它能让 Agent 在 shell 和 CI 中用一个稳定命令获得 machine report。
- 它能让 Agent 通过同一个 binary 连接本地 live runtime bridge，读取真实运行时上下文、执行受控 operation、导出 canonical evidence。
- verification commands 只路由 `@logixjs/core/ControlPlane` 已拥有的 verification stage。
- live commands 只路由 `171` 冻结的 core-owned attachment、operation admission、capture、canonical evidence handoff 语义。
- 它不新增 Program 模型、verification lane、report shape、evidence envelope、scenario language、runtime truth 或 Agent policy。
- 它的 public command 数量小于旧工具箱，并且对 Agent 的误用率低于单一宽命令。
- 它的存在能提供比 repo-local script 更强的可复现 artifact contract。

若后续证明这些条件不成立，应优先删除 public CLI，把能力退回 core-owned schema artifact、test harness 或 repo-local script。

## 北极星

Logix CLI 是 Agent 自我验证与 live runtime 协作闭环的命令路由。

它面向三类使用者：

- Agent coding loop
- 本仓 CI 和 examples dogfooding
- runtime / domain 维护者的本地验证

CLI 的核心任务分两条 lane：

- verification lane: 把 `Program`、canonical evidence package、selection manifest 和 verification input 交给 runtime control plane，并返回可机读、可比较、可修复的 `VerificationControlPlaneReport` 与 artifact refs。
- live lane: 连接本地 live bridge / daemon 与 core-owned runtime attachment，执行 target discovery、bounded capture、read-only snapshot、wait、declared action dispatch、local runtime profile summary 和 canonical evidence export，并返回可机读的 live artifacts、operation facets、attachment / host locators、evidence refs 与 gaps。

live lane 的终局定义是 attachment-first，不是 transport-first。WebSocket、local socket、stdio、IPC、daemon port 或 browser hook name 都只是 carrier / locator；CLI 的稳定语义只认 core-owned attachment、host locator、runtime coordinate、target coordinate、operation facet、canonical evidence handoff 和 evidence gap。

当前实现状态：

- 171 semantic MVP 已完成，`logix live` public namespace、`LiveCommandResult`、core-owned attachment/evidence/admission 和 repair handoff proof 已关闭。
- real local carrier 已作为 171 post-closure implementation delta 落地。browser WebSocket adapter、local daemon、CLI IPC client、multi-tab attachment projection、daemon-backed operation lane 与 evidence handoff proof 已关闭。
- real carrier 的执行记录是 [../../../specs/171-agent-live-runtime-bridge/implementation-plan-real-carrier.md](../../../specs/171-agent-live-runtime-bridge/implementation-plan-real-carrier.md) 与 [../../../specs/171-agent-live-runtime-bridge/notes/verification.md](../../../specs/171-agent-live-runtime-bridge/notes/verification.md)；它只补 browser WebSocket adapter、local daemon、CLI IPC client 与 multi-tab attachment projection，不改变本页 public command contract。
- 前端 dev host 与 CLI/CUI 不直接互相调用。前端只通过 dev-only browser adapter 向 local daemon 发 `host.offer`；CLI/CUI 只通过 daemon 的 local IPC 读取 targets、operation result、evidence refs 或 gap。Vite dev plugin 与 `@logixjs/react/dev/live` dev-only import 只是安装同一个 browser adapter 的两种入口。
- 当前 deeper phase 已把 `snapshot.read`、`capture.eventWindow`、`wait.condition` 和 `dispatch.declaredAction` 接入同一条 browser-backed operation lane；`export evidence` 也会复用这些真实 live artifact。它们仍然只返回 live artifact / operation facet / gap，不提升为 verification verdict authority。
- daemon lifecycle hardening 已完成：CLI 内部只保留 current CLI re-exec + hidden `__internal_live_daemon` selector；daemon metadata 只是 carrier-local operator snapshot；未新增 supervisor 或 public lifecycle grammar。
- `172` 已打开为 live lane 的 Runtime inspect data plane closure：[../../../specs/172-agent-first-runtime-inspect-data-plane/spec.md](../../../specs/172-agent-first-runtime-inspect-data-plane/spec.md)。它用 [../../../specs/172-agent-first-runtime-inspect-data-plane/parity-matrix.md](../../../specs/172-agent-first-runtime-inspect-data-plane/parity-matrix.md) 作为 route SSoT，反推 CLI 可查询 Runtime 信息面，并分成 core pressure lane 与 CLI product lane。171 已关闭 carrier 与并发隔离，172 负责补 state/actions/events/timeline/fields/summary/workbench bridge 等可机读 inspect route closure。172 采纳 `LiveInspectArtifact(section=...)` facet family；Workbench 只消费 artifact refs、canonical evidence 与 gaps，不拥有 Runtime fact。172 关闭前还必须通过 [../../../specs/172-agent-first-runtime-inspect-data-plane/implementation-details/runtime-inspect-coverage-harness.md](../../../specs/172-agent-first-runtime-inspect-data-plane/implementation-details/runtime-inspect-coverage-harness.md)，证明当前内核可 inspect fact family 没有未映射空洞。
- 172 后续的 owner-backed producer work 不再扩写 172 或由本页持有 owner law。长期 Runtime inspect evidence 合同归 [18-runtime-inspect-evidence-contract.md](./18-runtime-inspect-evidence-contract.md)：本页只保留 CLI grammar、transport envelope、command surface 和 no-second-truth 约束；owner authority、coordination law、dependent backlog 与 proof obligation 由 18 持有。Timeline projection 已从 dependent backlog 升格到 [../../../specs/177-runtime-inspect-timeline-projection/spec.md](../../../specs/177-runtime-inspect-timeline-projection/spec.md)；177 本身不改变 `logix live timeline` grammar。180 只为 timeline continuation 增加唯一公共 flag `--cursor <token>`，见 [../../../specs/180-runtime-timeline-continuation-and-evidence-segment/spec.md](../../../specs/180-runtime-timeline-continuation-and-evidence-segment/spec.md)。
- examples dogfood 的可复现 live proof path 固定为 5173 demo URL + root `pnpm cli`：启动或复用 local daemon，打开 `http://localhost:5173/playground/logix-react.live-bridge`，再通过 `pnpm cli live status/targets/timeline --cursor/capture/export evidence` 读取 Runtime truth。对应 proof 是 [../../../examples/logix-react/test/browser/live-real-carrier.playwright.ts](../../../examples/logix-react/test/browser/live-real-carrier.playwright.ts)。该 proof 不新增 public command，不绕过 CLI internal client，不把 daemon/browser adapter 升格为 Runtime fact owner。

Agent 日常自验证闭环的终局压力目标，尤其是 Program 装配漏加、依赖漏注入、配置漏提供、imports 漏装配、exact rerun coordinate 和 stdout artifact transport，统一看 [16-agent-self-verification-scenario-matrix.md](./16-agent-self-verification-scenario-matrix.md)。

该矩阵压出的 CLI transport 与 roundtrip 实施需求落到 [../../../specs/162-cli-verification-transport/spec.md](../../../specs/162-cli-verification-transport/spec.md)。core/kernel pressure 的实施需求落到 [../../../specs/161-verification-pressure-kernel/spec.md](../../../specs/161-verification-pressure-kernel/spec.md)。

终局判断标准固定为：

- Agent 不需要解析人类日志
- Agent 不需要知道旧 IR 工具箱命令
- Agent 自验证默认只需要 `check / trial / compare`
- Agent live debugging 只需要 `logix live ...`
- 所有机器结论都回到 `@logixjs/core/ControlPlane`
- 所有 live 事实都回到 core-owned attachment semantics、canonical evidence envelope、Workbench projection 或 structured evidence gap
- CLI 不制造第二套 Program 模型、第二套 verification lane、第二套 report shape、第二套 evidence envelope、第二套 runtime truth 或第二套 Agent policy

## Command Surface Dominance

当前采用双通道形态：

```text
logix check
logix trial
logix compare

logix live ...
```

采用理由：

| 方案 | 裁决 | 原因 |
| --- | --- | --- |
| no public CLI | reject for v1 | Agent 和 CI 会退回 repo-local scripts，artifact contract 难以稳定复用 |
| `logix verify --stage <stage>` | reject | 单命令会把 stage 语义藏进参数，Agent 误传参数和宽入口膨胀风险更高 |
| only `check / trial` | reject for v1 | repair closure 需要标准 before/after compare route；缺 compare 会把对比逻辑推给 Agent 或 CI script |
| verification roots `check / trial / compare` | adopt | 与 runtime stage family 一一对应，概念数可控，shell 可读，proof 可按 stage 独立收敛 |
| flat live roots `status / capture / snapshot / trigger / wait / export` | reject | 会把 live 任务扩成多个顶层 root，并让 discovery、capture、operation、evidence handoff 的 owner 边界变弱 |
| `logix live <task>` namespace | adopt | 只增加一个 public root，把 runtime/server 通信与 verification roots 隔离，同时保留 Agent 可调用的细粒度 live tasks |
| `logix debug <task>` namespace | reject for v1 | debug 词会把 evidence、operation、profile、target discovery 混成调试产品面，不如 `live` 直指运行中 runtime 协作 |
| old toolbox commands | reject | 会重新打开 IR、contract-suite、transform 和 writeback 产品面 |

这不是当前实现迁就。若现有 parser、command files 或 docs 与本表冲突，按本表切除或重写。

## Final Public CLI Contract

面向开发者和 Agent 的公开 CLI 面完全相同。不存在 Agent-only public command surface。

公开 root commands 最终冻结为：

| root command | current successful form | route owner | machine output | 默认门禁 |
| --- | --- | --- | --- | --- |
| `logix check` | `logix check` | `runtime.check` | `CommandResult` transport 指向 `VerificationControlPlaneReport(stage="check")` | yes |
| `logix trial` | `logix trial --mode startup` | `runtime.trial(mode="startup")` | `CommandResult` transport 指向 `VerificationControlPlaneReport(stage="trial")` | yes |
| `logix compare` | `logix compare` | `runtime.compare` | `CommandResult` transport 指向 `VerificationControlPlaneReport(stage="compare")` | no，repair closure 或 before/after evidence 存在时显式运行 |
| `logix live` | `logix live <task>` | `171` core-owned attachment / operation / evidence handoff | `LiveCommandResult` transport 指向 live artifact、operation facet、canonical evidence package ref、attachment/host locator 或 evidence gap | no，Agent live debugging / dogfood 时显式运行 |

保留但未成为当前成功路径的 public grammar：

| form | status | required behavior |
| --- | --- | --- |
| `logix trial --mode scenario` | reserved future upgrade | 在 core-owned scenario executor 落地前必须返回结构化失败；不得伪造 startup trial report，不得把 Playground product scenario result 当作 control-plane evidence |

### Repo-local Kernel Release Gate

`190-kernel-release-gate-profile` 可以把现有 CLI、report、live、perf 与 text sweep proof 聚合成 repo-local release gate。CLI 在该 profile 里仍只承担 route / transport / evidence carrier 身份。

硬边界：

- 不新增 `logix challenge`、`logix verify --stage`、`logix debug`、`logix describe` 或 flat live roots。
- 不新增 public `KernelStabilityReport` 或任何 CLI-owned report truth。
- `logix check / trial / compare` 继续只路由 `runtime.check / runtime.trial / runtime.compare`。
- `logix live ...` 继续只产 target、operation、capture、profile、canonical evidence ref 或 structured gap。
- release gate artifact 若存在，只能引用 `CommandResult`、`LiveCommandResult`、`VerificationControlPlaneReport`、canonical evidence、perf report 与 text sweep 结果；它不得成为 command discovery 或 runtime truth。

公开 CLI 不提供下列 root commands 或 namespaces：

| candidate | disposition | owner-backed replacement |
| --- | --- | --- |
| `logix status` | rejected as root | `logix live status` |
| `logix capture` | rejected as root | `logix live capture` |
| `logix snapshot` | rejected as root | `logix live snapshot` |
| `logix trigger` | rejected | `logix live dispatch`，必须映射 core-owned `dispatch.declaredAction` admission、denial、failure taxonomy |
| `logix wait` | rejected as root | `logix live wait` |
| `logix export` | rejected as root | `logix live export evidence`；CLI 不接受裸 session truth |
| `logix debug ...` | rejected for v1 | `logix live ...` 已覆盖 active runtime collaboration |
| `logix runtime ...` | rejected | `runtime` 保持 owner vocabulary，不进入 public CLI namespace |
| `logix evidence ...` | rejected | canonical evidence 是 input/provenance/artifact，不是 public command namespace |
| `logix describe` / `logix --describe-json` | rejected | package-local static schema artifact 与 docs SSoT |

`specs/171-agent-live-runtime-bridge/proposals/agent-first-flat-cli.md` 已被本合同吸收。该提案中的 flat commands 不作为顶层 root 进入 public CLI；其能力按 `logix live <task>` 命名空间归位。

任何新增 live task 都必须先给出 input authority、output authority、denial shape、artifact key namespace、stage/admissibility class、discovery source 与 no-second-truth proof。

## 当前定位

`@logixjs/cli` 的 public command surface 保留：

- `logix check`
- `logix trial`
- `logix compare`
- `logix live ...`

CLI 当前只能作为：

- runtime control-plane route owner
- live runtime collaboration route owner
- canonical evidence import consumer
- canonical evidence export requester
- `VerificationControlPlaneReport` artifact producer
- `CommandResult` stdout transport producer
- `LiveCommandResult` stdout transport producer
- Agent repair loop 的 machine report provider
- Agent live debugging loop 的 machine evidence provider
- CI 可复现 gate executor

CLI 不再作为：

- 平台工具箱总入口
- authoring helper
- transform/writeback 产品面
- contract-suite 产品面
- IR Explorer 产品面
- Agent loop、memory、policy 或决策 runtime
- DevTools 专属 evidence/report 消费器
- live session truth owner

## 与 Public API Spine 的关系

CLI 必须按当前公开主链理解输入：

```text
Module.logic(...)
  -> Program.make(Module, config)
    -> Runtime.make(Program)
```

规则：

- CLI 的 entry authority 是 `Program`。
- CLI 不得重新接受 `Module` 作为装配或运行单位。
- CLI 不得把 `Logic` 抬升为独立命令输入。
- CLI 不得让旧 `ModuleImpl / ProgramRuntimeBlueprint / controlProgramSurface` 成为 public command 心智。
- 任何 static declaration artifact 都只能作为 `Program` 派生物。
- `Program.capabilities.imports` 在 CLI 语义里也只接受 `Program`。

## 与 Runtime Control Plane 的关系

Runtime control plane 继续由 [09-verification-control-plane.md](./09-verification-control-plane.md) 持有。

CLI 只路由三类 stage：

```text
logix check   -> runtime.check
logix trial   -> runtime.trial
logix compare -> runtime.compare
```

规则：

- CLI command name 与 runtime stage family 一一对应。
- CLI output 必须继续使用 `VerificationControlPlaneReport` 或同一 control-plane report family。
- CLI artifact refs 必须可被 DVTools、CI、Agent 和后续 compare 消费。
- CLI 不得定义自己的 command report truth。
- `RuntimeCheckReport / RuntimeTrialReport / RuntimeCompareReport` 若还存在，只能作为 artifact kind 或 file residue，不拥有 schema authority。
- `logix compare` 只是 CLI 对 control-plane compare stage 的路由，不代表 root `Runtime.compare` facade 已经产品化。
- 当前 `logix compare` 已由 `@logixjs/core/ControlPlane` compare executor 持有 compare truth；CLI 不自定义 compare truth。
- `trial --mode scenario` 在 core-owned scenario executor 落地前只返回 structured error report，不输出 startup `trialReport`，也不把 Playground product scenario result 当作 control-plane evidence。

## Discovery Boundary

Agent discovery v1 只允许使用 package-local static schema artifact 和 docs SSoT command contract。

schema authority 仍由本页、[09-verification-control-plane.md](./09-verification-control-plane.md) 和 `@logixjs/core/ControlPlane` 持有。package-local static schema artifact 只能是这些 authority 的派生镜像，用于 Agent 离线读取和 contract guard；它不得拥有独立 command contract truth。

禁止：

- `logix describe` public command
- `logix --describe-json` public flag
- `CliDescribeReport`
- archived command set 出现在任何 machine-readable discovery
- Agent 通过 human help text 推断旧工具箱路线

允许：

- package 内静态 JSON schema artifact as derived mirror，目前发布为 `@logixjs/cli/schema/commands.v1.json`
- docs SSoT 的 command contract
- tests 读取 schema artifact 做 contract guard

若后续证明 Agent 必须通过可执行命令发现 contract，应单独重开本页，并先证明它不会形成第四个 public command surface。

## Agent First 闭环

默认闭环固定为：

```text
Agent edits code
  -> logix check
    -> logix trial
      -> optional logix compare
        -> VerificationControlPlaneReport + repairHints + artifact refs
          -> Agent repair
            -> trial / compare closure
```

DVTools 闭环固定为：

```text
DVTools selected session / finding
  -> canonical evidence package + selection manifest
    -> logix check / trial / compare
      -> VerificationControlPlaneReport + repairHints
        -> Agent repair
```

Live debugging 闭环固定为：

```text
Agent needs runtime context
  -> logix live start / status
    -> logix live targets / inspect
      -> logix live state / actions / events / timeline / fields / summary / snapshot / capture / wait / dispatch / profile
        -> logix live export evidence
          -> canonical evidence package + artifact refs
            -> logix trial / compare
              -> VerificationControlPlaneReport + repairHints
```

规则：

- selection manifest 只作为 CLI 和 Agent 的入口提示。
- selection manifest 不拥有 evidence truth、report truth、session truth 或 finding truth。
- CLI 必须消费 canonical evidence package，不得消费 DVTools 专属协议。
- CLI 必须优先输出 structured repair hints。
- 当失败能局部化到 declaration、scenario plan 或 evidence truth 时，至少一个 repair hint 必须带非空 `focusRef`。
- `logix live ...` 只产出 live target、operation、capture、profile、evidence handoff 或 evidence gap，不产出 verification verdict。
- live command 结果要进入修复闭环时，必须先通过 canonical evidence package 或 artifact refs 交给 `trial / compare`。

Examples dogfood 闭环固定为：

```text
rtk pnpm cli live start --runId <id>
  -> rtk env LOGIX_LIVE_PORT=<daemon-port> pnpm -C examples/logix-react dev -- --host localhost --port 5173 --strictPort
    -> open http://localhost:5173/playground/logix-react.live-bridge
      -> rtk pnpm cli live status --runId <id>
        -> rtk pnpm cli live targets --runId <id> --tree
          -> rtk pnpm cli live timeline --target <target> --attachment <attachmentId> --limit <n> --runId <id>
            -> rtk pnpm cli live timeline --target <target> --attachment <attachmentId> --limit <n> --cursor <cursor.next> --runId <id>
              -> rtk pnpm cli live capture --target <target> --attachment <attachmentId> --window 500ms --runId <id>
                -> rtk pnpm cli live export evidence --from <artifactRef.file> --runId <id>
```

预期 machine output：

- `status` 返回 `LiveCommandResult`，primary artifact kind 为 `LiveStatus`，包含 daemon IPC/WebSocket health 与 attachment state。
- `targets --tree` 返回 `LiveTargetList`，target row 必须包含 runtime/module/instance coordinate 与 `attachmentId`。
- 空 timeline 或 owner input 缺失必须返回 `LiveInspectArtifact(section="timeline")` 内的 structured gap，例如 `missing-operation-window`；不得依赖人类日志。
- timeline continuation 只复制 opaque `cursor.next` 到 `--cursor`；`LiveCommandResult.inputCoordinate.cursor` 可以保留该 token，输出继续返回 `LiveInspectArtifact(section="timeline")`。
- `capture` 返回 live artifact，并由 daemon minted lineage ref 写入 artifact value 的 `artifactRef.file`。
- `export evidence` 返回 `CanonicalEvidencePackage` 或 structured `EvidenceGap`；不得输出 verification verdict、`repairHints` 或 `nextRecommendedStage`。

## Public Command Surface

### `logix check`

定位：

- cheap static gate

输入：

- `Program` entry
- Program-derived declaration coordinate/static slice
- canonical evidence package 的静态部分
- DVTools selection manifest 作为可选 entry hint

输出：

- `VerificationControlPlaneReport` with `stage="check"`
- artifact refs
- structured repair hints

硬边界：

- 不隐式代跑 startup trial
- 不隐式代跑 scenario trial
- 不隐式打开 raw trace compare

### `logix trial`

定位：

- running verification route

第一版已实现模式：

- `mode="startup"`

保留但未实现的升级层：

- `mode="scenario"` 需要 core-owned scenario executor 后才能成为 CLI 成功路径。当前 CLI 对 `trial --mode scenario` 返回结构化失败，不伪造 startup 结果。

输入：

- `Program` entry
- optional `fixtures/env + steps + expect`
- optional canonical evidence package
- optional selection manifest as entry hint

输出：

- `VerificationControlPlaneReport` with `stage="trial"`
- trial evidence package
- artifact refs
- structured repair hints

硬边界：

- `trial.scenario` 只服务验证
- scenario input 不沉淀为 business logic asset
- CLI 不定义第二套 scenario language

### `logix compare`

定位：

- compare route over standard reports and key artifacts

输入：

- before/after `VerificationControlPlaneReport`
- before/after canonical evidence package summary
- before/after key artifact refs

输出：

- `VerificationControlPlaneReport` with `stage="compare"`
- `compareReport`
- `beforeReportRef / afterReportRef`
- diff artifact refs when core compare emits them
- structured repair hints

硬边界：

- 不比较 raw evidence 全量
- 不把 artifact digest 抬升为 compare 主轴
- environment fingerprint 不一致时默认 `INCONCLUSIVE`

### `logix live`

定位：

- Agent-first live runtime/server collaboration route

公共子命令冻结为：

| command | capability owner | output | mutation |
| --- | --- | --- | --- |
| `logix live start [--port <port>]` | CLI daemon transport + core attachment offer | daemon status、transport ref、capability summary | no runtime mutation |
| `logix live stop` | CLI daemon transport | daemon shutdown result | no runtime mutation |
| `logix live status` | core attachment projection | daemon status、attached target summary、connection gaps | no runtime mutation |
| `logix live targets [--kind <kind>] [--tree] [--depth <n>] [--query <text>]` | `target.discover` | target index / topology tree / evidence gaps | no runtime mutation |
| `logix live inspect <target> [--attachment <attachmentId>]` | 172 route closure + 18 owner law | target detail、host context、manifest digest、facet refs、evidence gaps | no runtime mutation |
| `logix live state --target <target> [--attachment <attachmentId>] [--path <path>]` | 172 route closure + 18 current-state law | bounded state/path artifact or evidence gap | no runtime mutation |
| `logix live actions --target <target> [--attachment <attachmentId>]` | 172 route closure + 18 reflection binding law | declared action list、payload summary、validator availability 或 gap | no runtime mutation |
| `logix live events --target <target> [--attachment <attachmentId>] [--kind <kind>] [--limit <n>]` | 172 route closure + 18 operation ledger law + 179 diagnostic/process source bridge | bounded event window artifact or evidence gap | no runtime mutation |
| `logix live timeline --target <target> [--attachment <attachmentId>] [--field <path>] [--limit <n>] [--cursor <token>]` | 177 timeline projection + 180 continuation / segment law + 18 coordination law | timeline artifact with stateAfter / field filter / cursor / source segments / safe resume boundary or evidence gap | no runtime mutation |
| `logix live fields --target <target> [--attachment <attachmentId>]` | 172 route closure + 18 field-runtime law | final field list / field runtime summary or evidence gap | no runtime mutation |
| `logix live field-graph --target <target> [--attachment <attachmentId>]` | 172 route closure + 18 field-runtime law | bounded field graph / plan artifact or evidence gap | no runtime mutation |
| `logix live field-summary --target <target> [--attachment <attachmentId>]` | 172 route closure + 18 field-runtime law | latest field summary artifact or evidence gap | no runtime mutation |
| `logix live summary --target <target> [--attachment <attachmentId>]` | 178 summary projection + 18 composition law | event/txn/field converge summary or evidence gap | no runtime mutation |
| `logix live capture --target <target> [--attachment <attachmentId>] [--window <window>]` | `capture.eventWindow` | capture ref、budget/drop/degraded markers、artifact refs | no runtime mutation |
| `logix live snapshot --target <target> [--attachment <attachmentId>]` | `snapshot.read` + 172 facet composition | bounded target bundle of facet refs or degraded preview | no runtime mutation |
| `logix live wait --target <target> [--attachment <attachmentId>] --condition <condition> [--timeout <duration>]` | `wait.condition` | wait completed/failed/gap facet | no runtime mutation |
| `logix live dispatch --target <target> [--attachment <attachmentId>] --action <tag> [--payload <json-or-file>]` | `dispatch.declaredAction` | accepted/completed/failed/denied operation facet | yes, admitted only |
| `logix live profile start [name] --target <target>` | `188-react-host-adjunct-evidence` profile summary lane | profile capture ref or structured gap | observation only, local-only |
| `logix live profile stop [name]` | `188-react-host-adjunct-evidence` profile summary lane | bounded runtime summary artifact ref or structured gap | observation only, local-only |
| `logix live profile summary [--limit <n>]` | `188-react-host-adjunct-evidence` profile summary lane | bounded profile summary / degradation marker / structured gap | observation only, local-only |
| `logix live export evidence --from <daemon-lineage-ref> [--out <path>]` | `evidence.export` | canonical evidence package ref、artifact refs、budget markers | no runtime mutation |

命名规则：

- `status / capture / snapshot / wait / export` 只允许作为 `logix live` 子命令，不进入 root。
- `trigger` 不进入 public CLI；mutation 统一写作 `dispatch`，并且只能路由 `dispatch.declaredAction`。
- React DevTools 式 `get tree` 归并为 `logix live targets --tree`。
- React DevTools 式 `get component` 归并为 `logix live inspect <target>`。
- React DevTools 式 `find` 归并为 `logix live targets --query <text>`。
- Conceptual DevTools 式 state/action/event/timeline/field/summary drilldown 归位到 172 的 `logix live state/actions/events/timeline/fields/field-graph/field-summary/summary`，这些命令仍是 `live` 子命令，不进入 root。
- 172 的 inspect drilldown 输出统一归入 `LiveInspectArtifact(section=...)`；`snapshot` 只是 facet refs 的 bounded composition，不拥有第二套 Runtime snapshot truth。
- 172 的最终验收必须包含 Runtime Inspect Coverage Harness，证明当前内核可 inspect fact family 已全部映射到 CLI route、owner-backed facet、structured gap、deferred owner 或 rejected/future row。179 关闭后，coverage inventory 为 17 owner-backed / 0 structured-gap / 2 deferred / 2 rejected；structured gap 只允许作为具体 owner input 缺失、unsupported source 或 future deferred route 的诚实响应，不能代表当前 172/173 剩余实施债。
- `187-live-diagnosis-evidence` 已关闭 live evidence lane。`188-react-host-adjunct-evidence` 已关闭 React host adjunct evidence、interaction linkage 与 local profile summary 的终局实现；这些能力只能通过既有 `LiveInspectArtifact`、`LiveCapture`、`CanonicalEvidencePackage`、`EvidenceGap` 或 repo-internal harness route 表达。CLI 不新增 `logix debug`，不新增 host evidence public artifact kind。
- `logix live timeline --cursor <token>` 是 180 引入的唯一 timeline public grammar upgrade。无 cursor 表示 latest live-head window；有 cursor 表示同一 query 在 cursor resume watermark 之后继续读取。CLI 不接受 raw watermark JSON、`--since`、`--until`、`--before`、`--after` 或 `--after-watermark` 作为 timeline public grammar。
- ordinary `logix live timeline` 和 `logix live timeline --cursor` 不创建 evidence lease、不打开 background drain、不把 daemon 升格为 timeline owner。输出里的 `cursor.next`、`sourceSegments`、coverage、completeness、gaps 和 safe resume boundary 都由 Runtime/timeline owner law 决定；daemon、browser adapter 和 CLI 只负责 transport。
- React DevTools 式 `errors` 不作为独立命令；runtime error、operation failure、evidence gap 通过 capture/export 后进入 Workbench projection 或 verification report。
- 深度 CPU profile、heap snapshot、remote/cloud mutation、long-running raw stream 不属于 v1 `logix live`。

输入：

- local daemon or bridge locator
- target coordinate or target query
- optional `attachmentId` for tab/process disambiguation
- static-live binding refs for mutation-capable commands
- permission scope or capability lease where required
- budget profile and redaction policy
- canonical evidence output path where exporting evidence

输出：

- `LiveCommandResult`
- live target index / target detail artifact
- live inspect artifact
- operation accepted/completed/failed/denied facet
- capture/snapshot/profile artifact refs
- canonical evidence package ref
- evidence gaps、budget markers、redaction markers

硬边界：

- `logix live ...` 不输出 `VerificationControlPlaneReport`。CLI transport gate 只能输出 transport error artifact，不能把错误 artifact 伪装成 control-plane report。
- `logix live ...` 不拥有 session truth、runtime identity truth、operation authority、evidence envelope 或 verification verdict。
- live daemon port、browser global hook 名称、Node/cloud registration protocol 都不是 public command authority。
- WebSocket 或 local daemon 只是 local-dev carrier，不是 `logix live` 的 public protocol identity。
- real carrier 实现完成后，local browser dev host 必须优先返回 daemon-backed target/capture/snapshot/export artifacts；只有 daemon 不存在、host 不支持 operation、locator 缺失或预算/红线触发时才返回 structured gap 或 degraded marker。
- daemon process metadata 只能作为 carrier-local operator snapshot 使用。pid、socket path、port、stateDir、metadataPath、optional logPath、readiness/health reason 与 stale cleanup evidence 都不是 public file contract，也不能成为 runtime、attachment、evidence 或 report truth。
- `logix live` 不提供 `ensure`、`restart`、`logs` 或 `doctor` public lifecycle grammar。若未来要重开 supervisor 或 lifecycle product surface，必须先重开本页并证明不会产生第二 authority。
- `targetCoordinate` 不再被视为多 tab 全局唯一。若同一 target 出现在多个 attachments 中，未带 `attachmentId` 的 live operation 必须返回 `ambiguous-live-target`，不能按 registry 顺序选择第一个。
- live operation response 必须同时匹配 daemon pending `requestId`、`attachmentId` 和 WebSocket connection；跨 tab 误发或伪造的同 `requestId` 响应不得 resolve pending request。
- `export evidence --from` 的可靠输入是 daemon-minted lineage ref，也就是 operation artifact 中的 `artifactRef.file`。裸 `captureId` 只能作为非歧义别名；一旦多个 lineage 命中同一裸 ref，必须返回 `ambiguous-live-artifact-ref`。
- public `live` v1 默认面向 local dev / dogfood；cloud attachment 只允许在 future cloud product protocol 证明 explicit auth、tenant/session boundary、revocation、audit、redaction 后开放。
- mutation-capable command 必须先完成 admission；任何 stale manifest、digest mismatch、missing validator、unauthorized target 或 revoked lease 都返回 structured denial，且 no mutation。
- 当多个 browser tabs 或 Node processes 同时存在时，`logix live` 可以带 attachment refs / host locators；Agent 以这些 locator 区分并行 attachment，而不是以 tab 文案或页面标题猜测身份。

## Internal Residue Policy

这些命令或能力如果仍在实现中存在，只能作为 internal implementation detail：

- `describe`
- `ir.export`
- `ir.validate`
- `ir.diff`
- `contract-suite.run`
- `transform.module`

规则：

- public help 不展示这些命令。
- package root 不导出这些命令。
- examples 不教学这些命令。
- machine-readable command discovery 不得把它们呈现为 public route。
- 若 internal route 只是为了支撑 `check / trial / compare`，应继续下沉为函数或 fixture，不保留 command identity。
- 若 internal route 没有直接支撑 public route，应删除。

`describe` 的特殊规则：

- `describe` command identity 必须删除。
- `--describe-json` 不进入 v1 public surface。
- 若需要 machine-readable contract，只能先作为 package-local static schema artifact 提供。
- 该 artifact 不得暴露 archived command set。

## 必须删除

下一轮 CLI cutover 默认删除这些残留：

- 旧 `trialrun` 口径
- public docs 中的 `ir export / ir validate / ir diff`
- public docs 中的 `contract-suite run`
- public docs 中的 `transform module`
- `controlProgramSurface` 作为用户心智
- `ControlSurfaceManifest` 作为 public CLI 主产物
- `Workflow / ContractSuite / PatchPlan / TransformReport` 作为 CLI 北极星
- CLI 自己的 report truth
- CLI 自己的 evidence envelope
- CLI 内置 Agent loop、memory、policy 或 auto-repair decision
- 面向旧 Module surface 的入口示例
- global `--mode report|write`
- public `describe` command
- public `--describe-json` flag
- `CliDescribeReport`
- `CommandResult.mode`

## 可以保留但必须下沉

这些能力可以保留，但只能作为 internal support：

- IR export helper
- IR validate helper
- IR diff helper
- config resolution visibility
- cold-start measurement
- fixture artifact generation
- low-level stable JSON writer
- unsupported-command guard

保留条件：

- 能直接服务 `check / trial / compare`
- 不出现在 public help、examples、SSoT 主线或 user-facing tutorial
- 不形成第二套 schema authority

## 输出协议

stdout 只允许输出 deterministic machine envelope。

验证命令输出 `CommandResult`。Live 命令输出 `LiveCommandResult`。

两者共享：

- `schemaVersion`
- `kind`
- `runId`
- `command`
- `ok`
- `inputCoordinate`
- `artifacts`
- optional `error`

两者共同遵守：

- stdout 不得输出人类日志。
- artifact 排序必须稳定。
- timestamp、machine-specific path、随机 id 不进入默认可 diff 面。
- 超预算 artifact 必须显式 `truncated`、`budgetBytes`、`actualBytes`、`digest`，并在可落盘时提供 file fallback；inline 只保留 bounded oversized preview，不得 silent drop。
- `artifacts[].outputKey` 是唯一 artifact key namespace。
- exit code 固定为 `0=PASS_OR_COMPLETED`、`2=USER_ERROR_OR_GATE_FAIL_OR_OPERATION_DENIED`、`1=INTERNAL`。

### `CommandResult`

`CommandResult` 只是 stdout transport envelope。它不拥有 report authority、stage authority、evidence authority 或 repair policy authority。

每个 command result 至少包含：

- `schemaVersion`
- `kind="CommandResult"`
- `runId`
- `command`
- `ok`
- `inputCoordinate`
- `artifacts`
- `primaryReportOutputKey`
- optional `error`

硬规则：

- `inputCoordinate` 必须包含重跑同一 stage 或升级 stage 所需的 locator：normalized `argvSnapshot`、Program entry、evidence package ref、selection manifest ref、trial mode、scenario input ref、trial options、config、compare before/after refs 与 before/after evidence refs 中实际参与本次命令的部分。
- runtime stage result 的 `primaryReportOutputKey` 必须指向 `artifacts[]` 中的 `VerificationControlPlaneReport` artifact。
- pre-control-plane transport gate failure 的 `primaryReportOutputKey` 可以指向 `162` transport error artifact。该 artifact 不是 `VerificationControlPlaneReport`，不拥有 stage、mode、verdict、repair truth 或 scheduling authority。
- `VerificationControlPlaneReport` 是唯一 machine report authority。
- canonical evidence package 只能作为 input/provenance 或 artifact payload，不得成为 output report authority。
- source provenance 只能作为 `sourceArtifact` 输出，authority 固定为 provenance-only，不拥有 declaration truth。
- `check` 与 `trial` 可以输出 `reflectionManifest` artifact。该 artifact 的 payload 必须复用 core repo-internal `RuntimeReflectionManifest` DTO，`digest` 必须等于 manifest 自身 digest；CLI 只负责 transport，不拥有 reflection schema authority。
- evidence input 与 selection manifest 只能作为 `evidenceInput / selectionManifest` transport artifacts，selection authority 固定为 hint-only。
- compare before/after report refs 必须作为 `beforeReportRef / afterReportRef` transport artifacts 保持可达；compare truth 仍由 core report 持有。
- `CommandResult` 不得包含 `mode`、stage-specific report body、CLI-owned verdict 或 CLI-owned finding/session truth。

### `LiveCommandResult`

`LiveCommandResult` 是 live stdout transport envelope。它不拥有 report authority、stage authority、runtime identity authority、operation authority、evidence envelope authority、session truth 或 repair policy authority。

每个 live command result 至少包含：

- `schemaVersion`
- `kind="LiveCommandResult"`
- `runId`
- `command`
- `ok`
- `inputCoordinate`
- `artifacts`
- `primaryLiveOutputKey`
- optional `denial`
- optional `error`

硬规则：

- `primaryLiveOutputKey` 必须指向 `artifacts[]` 中的 live output artifact。
- live output artifact kind 只能是 `LiveStatus`、`LiveTargetList`、`LiveInspectArtifact`、`LiveOperationFacet`、`LiveCapture`、`CanonicalEvidencePackage`、`EvidenceGap` 或 `LiveTransportError`。
- `LiveTargetList` 是 target discovery 的 public artifact kind；target detail 和 rich inspect 的 primary output 都使用 `LiveInspectArtifact(section=...)`。
- `LiveCapture(profile)` 是 `188-react-host-adjunct-evidence` 关闭后的 profile summary 承载形态；public live route 不新增 `LiveInspectArtifact(section="profile")` 或 `LiveProfileSummary` artifact kind。
- React host adjunct evidence is not a standalone live output artifact kind. `HostEvidence` / `HostAdjunctEvidence` are not admitted public artifact kinds. `188-react-host-adjunct-evidence` 只允许通过既有 live inspect artifacts、`LiveCapture(profile)`、canonical evidence package refs 或 structured gaps 承载 host adjunct markers；direct public exposure must reopen SSoT 18 and this page.
- `LiveCommandResult` 不得包含 `primaryReportOutputKey`，不得内联 `VerificationControlPlaneReport` 作为成功结果。
- `LiveCommandResult` 可以输出 canonical evidence package ref，但不得定义 CLI-owned evidence envelope。
- `LiveCommandResult.inputCoordinate` 只保存 bridge locator、target coordinate/query、operation request refs、budget/redaction refs、capture refs、profile refs、evidence export refs 与 argv snapshot 中实际参与本次命令的部分。
- live transport-local daemon session id 只能作为 locator/ref，不得成为 durable runtime truth。
- mutation-capable `dispatch` 的 `denial` 必须与 core-owned `operation.denied` reason 对齐，并带 `noMutation: true`。
- successful `dispatch` 只能表示 operation admitted and routed；最终 runtime effect 仍以 `operation.completed` 或 `operation.failed` facet 表达。

### 168 workbench parity adoption

168 已固定 CLI 与 Playground 对同一 control-plane report 的 workbench parity 规则：

- CLI `trial` 输出的 primary report artifact 必须保留 core report 的 `dependencyCauses / findings / repairHints / artifacts / primaryReportOutputKey` 链路。
- startup missing service、config 或 Program import 的 CLI 表达，只能投射 core `VerificationControlPlaneReport` 与其 artifact refs，不新增 CLI-owned dependency schema。
- CLI workbench adapter 可以把 `CommandResult + artifacts + optional evidence package` 转成 `RuntimeWorkbenchAuthorityBundle`，但 adapter 只能映射 truth input、context ref 和 selection hint。
- 同一 report 经 CLI adapter 与 Playground adapter 进入 Workbench 时，report authority 必须来自同一个 core report ref、stage、mode、errorCode、focusRef、artifact output key 与 owner digest。
- `CommandResult` 继续是 stdout transport envelope，不拥有 session truth、finding truth、report identity truth 或 repair scheduling truth。
- pre-control-plane failure 只能停在 transport gate 或 evidence gap，不能投影成 control-plane report finding。

## 输入权威与坐标

CLI 拆成三条链路。

Input authority chain:

```text
Program entry
  -> declaration coordinate
    -> evidence package
```

Hint sidecar:

```text
selection manifest
```

Diagnostic coordinate chain:

```text
VerificationControlPlaneReport
  -> repairHints[]
    -> focusRef
      -> artifact refs
```

规则：

- entry 解析必须能定位到 `Program`。
- entry 必须是 `Program.make(...)` 产物并携带 internal runtime blueprint authority；只伪造 `_kind: "Program"` 不可通过。
- 如果 entry 指向非 `Program`、fake Program、缺失 export、import failure 或 missing blueprint，默认返回 pre-control-plane transport failure。
- 兼容旧 Module entry 的 fallback 不进入终局。
- selection manifest 只是 hint sidecar，不属于 input authority chain，不得改变 entry truth、evidence truth 或 report truth。
- `focusRef` 只允许出现在 `VerificationControlPlaneReport.repairHints` 或 selection manifest 的 entry hint 中，不得进入 CLI input authority chain。
- CLI 只解析 locator 和 artifact refs，不解释 evidence truth。
- `CommandResult.inputCoordinate` 是重跑坐标快照，只保存 locator/ref，不拥有输入 truth。

Stage admissibility:

| stage | required input | optional input | ref-only input | forbidden public input |
| --- | --- | --- | --- | --- |
| `check` | Program entry | canonical evidence package static slice, selection manifest | declaration coordinate, `reflectionManifest` artifact digest | raw declaration artifact as public authority |
| `trial(mode=startup)` | Program entry | canonical evidence package, selection manifest | declaration coordinate, `reflectionManifest` artifact digest | scenario input |
| future `trial(mode=scenario)` | Program entry, `fixtures/env + steps + expect` | canonical evidence package, selection manifest | declaration coordinate | scenario DSL outside verification input |
| `compare` | before/after `VerificationControlPlaneReport` plus admissible evidence summaries or artifact refs | Program entry only when needed to resolve declaration coordinate | environment fingerprint, declaration digest, scenario plan digest | raw evidence full compare as default |

Global `--mode report|write` is deleted. 当前 CLI v1 唯一可执行 `--mode` 是 `trial --mode startup`；`trial --mode scenario` 作为 future upgrade 只返回结构化失败，直到 core-owned scenario executor 落地。

Live input authority chain:

```text
bridge locator
  -> target coordinate / query
    -> operation or capture request
      -> canonical evidence package ref
```

Live input rules:

- target coordinate 由 core attachment substrate 产生或校验；CLI 不生成 runtime identity。
- target query 只是 selection aid；不能替代 stable coordinate。
- mutation-capable command 必须带 static-live binding refs、permission scope 或 capability lease。
- live command 不能接受 bare DVTools session truth；需要 session 上下文时必须先转为 target coordinate、selection hint、artifact ref 或 canonical evidence ref。
- live command 的 output 要进入 verification lane 时，只能经 canonical evidence package、artifact refs 或 evidence summary refs。
- timeline continuation 的 public rerun coordinate 是 `cursor.next` opaque token。`LiveCommandResult.inputCoordinate` 可以保存 argv snapshot 中实际传入的 `--cursor` token；它不得暴露 raw watermark JSON 作为 peer public input grammar。

## Agent Rerun And Artifact Linking

Agent 重跑闭环必须只依赖下面字段：

- `CommandResult.command`
- `CommandResult.inputCoordinate`
- `CommandResult.primaryReportOutputKey`
- `CommandResult.artifacts[]`
- referenced `VerificationControlPlaneReport`
- `repairHints[].focusRef`
- `repairHints[].relatedArtifactOutputKeys`
- `nextRecommendedStage`

Agent live command retry 必须只依赖下面字段：

- `LiveCommandResult.command`
- `LiveCommandResult.inputCoordinate`
- `LiveCommandResult.primaryLiveOutputKey`
- `LiveCommandResult.artifacts[]`
- target coordinate
- capture / operation / profile refs
- canonical evidence package refs
- evidence gaps and denial reasons
- timeline `cursor.next` opaque token when retrying or continuing `logix live timeline`

重跑规则：

- 原 stage 重跑使用 `CommandResult.inputCoordinate`。
- 升级 stage 使用 `nextRecommendedStage` 加 `CommandResult.inputCoordinate` 中可继承的 locator/ref。
- same-stage 精确重跑优先使用 `inputCoordinate.argvSnapshot.tokens`。该 snapshot 是配置前缀、parser normalization 与 last-wins option 规则后的 normalized argv。
- 大输入和敏感输入不得内联到 `inputCoordinate`；它们只通过 ref、digest 或 artifact outputKey 承接。
- `repairHints[].upgradeToStage` 只能作为 hint-local explanation；当它与 top-level `nextRecommendedStage` 不一致时，Agent 必须以 top-level `nextRecommendedStage` 为唯一调度依据。
- 当 `nextRecommendedStage` 非空时，它必须是唯一下一次命令建议。
- 当多个 repair hint 指向不同升级层，control plane 必须在 top-level 收敛成唯一 `nextRecommendedStage`，或返回 `INCONCLUSIVE` 并给出唯一升级入口。
- live retry 只重放 live command 的 locator/ref 请求；它不得把 live result 当作 verification stage result。
- timeline continuation retry 只复制 `cursor.next` opaque token。Agent 不解析 cursor token，不构造 raw watermark 参数。
- live after 修复验证必须导出 evidence，再进入 `trial / compare`。

Artifact key 统一规则：

- `artifacts[].outputKey` 是 CLI、control-plane report 和 DVTools selection manifest 之间的唯一 artifact key。
- `primaryReportOutputKey` 必须引用 `artifacts[].outputKey`。runtime stage result 指向 primary `VerificationControlPlaneReport`；pre-control-plane transport gate failure 指向 transport error artifact。
- `repairHints[].relatedArtifactOutputKeys` 若存在，只能引用 `artifacts[].outputKey`。
- DVTools selection manifest 中的 `artifact key` 必须等同于 `artifacts[].outputKey`；若来源 artifact 尚未进入 CLI artifact list，必须先以 canonical evidence artifact ref 进入 `inputCoordinate` 或 evidence package。
- 文档里的 `artifact ref` 只表示可解引用 locator；它不得成为第二套 key namespace。

### Self-verification transport pressure adoption

[16-agent-self-verification-scenario-matrix.md](./16-agent-self-verification-scenario-matrix.md) 只提供 pressure index。进入本页 owner 的采纳条件固定为：

- source artifact producer 与 `runtime.check` declaration gate 必须分层；CLI 可以产 locator/ref/artifact/digest，但不拥有 declaration truth。
- `CommandResult.inputCoordinate` 必须能承接 exact rerun 的 owner-defined locator/ref/argv snapshot；check、startup trial 与 compare 的 inherited refs 都必须可复原。
- CLI v1 不新增 raw provider overlay public input；provider source 分类由 core report、internal harness 或 future host layer 表达。
- stdout budget、truncation、file fallback、artifact ordering 和 error report 都必须有 deterministic proof。
- DVTools canonical evidence package 与 selection manifest 必须能进入 CLI roundtrip；selection 继续 hint-only，artifact key 继续使用 `artifacts[].outputKey` namespace。
- compare 输出必须保留 before/after report refs，供 Agent 从 transport envelope 继续定位 closure 输入。
- `CommandResult` 继续只作 transport；primary machine report authority 仍是 `VerificationControlPlaneReport`。
- pre-control-plane failure 只能停在 transport gate，不得进入 `nextRecommendedStage` 或变成第四个 stage；entry failure 的 primary machine artifact 使用 `162` transport error artifact envelope，不代表 runtime stage 已执行，也不代表 report verdict。

对应实施 spec：

- [../../../specs/162-cli-verification-transport/spec.md](../../../specs/162-cli-verification-transport/spec.md)
- [../../../specs/161-verification-pressure-kernel/spec.md](../../../specs/161-verification-pressure-kernel/spec.md)

## CI Gate

CI 默认门禁只允许：

- `logix check`
- `logix trial --mode startup`

这两层默认门禁应优先覆盖 entry、missing service、missing config、startup boot/close 与 startup 可触发的 missing imports。完整终局压力目标、CLI 缺口和内核反压清单看 [16-agent-self-verification-scenario-matrix.md](./16-agent-self-verification-scenario-matrix.md)。

升级规则：

- `trial --mode scenario` 是后续升级层，只能在 core-owned scenario executor 落地后显式触发。
- `compare` 只在存在 before/after evidence 或 repair closure 需要时触发。
- `logix live ...` 不进入默认 CI gate；它只在 dogfood、live debugging、browser/host proof 或 explicit evidence capture job 中运行。
- raw trace、browser host、replay 不进入默认 CLI gate。

## Reopen Bar

只有下面情况允许重开本页：

- `check / trial / compare` 无法承接 Agent 自我验证主链
- `Program` entry 不能表达必要验证输入
- `VerificationControlPlaneReport` 无法表达必要 machine repair hint
- canonical evidence package 无法承接 DVTools 或 CI 证据
- 有真实 Agent 场景证明 package-local static schema artifact 不能承接 machine-readable discovery
- 一个替代方案严格提升 proof strength，同时不增加 public command count、compat budget 或第二 truth 风险

## 当前一句话结论

Logix CLI 的终局身份是 Agent First runtime control-plane route：verification lane 固定为 `check / trial / compare`，live runtime collaboration lane 固定为 `logix live <task>`。验证输入围绕 `Program` 与 canonical evidence，验证输出回到 `VerificationControlPlaneReport` 与 artifact refs；live 输出只通过 `LiveCommandResult` 指向 core-owned target、operation、capture、profile、canonical evidence handoff 或 gap。旧 IR、contract-suite、transform 工具箱叙事全部下沉或删除。
