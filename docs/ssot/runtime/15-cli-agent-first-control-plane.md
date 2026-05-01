---
title: CLI Agent First Control Plane
status: living
version: 8
---

# CLI Agent First Control Plane

## 目标

冻结 `@logixjs/cli` 的终局北极星、命令边界、输入输出协议与删除方向。

本页只承接 CLI 作为 Agent First runtime control-plane route 的长期事实。它不重开 authoring surface，不重开 verification control plane，不重开旧 IR 工具箱叙事。

## 目标函数

CLI 的存在本身也要接受终局审查。只有同时满足下面条件，`@logixjs/cli` 才值得保留为 public binary：

- 它能让 Agent 在 shell 和 CI 中用一个稳定命令获得 machine report。
- 它只路由 `@logixjs/core/ControlPlane` 已拥有的 verification stage。
- 它不新增 Program 模型、verification lane、report shape、evidence envelope、scenario language 或 Agent policy。
- 它的 public command 数量小于旧工具箱，并且对 Agent 的误用率低于单一宽命令。
- 它的存在能提供比 repo-local script 更强的可复现 artifact contract。

若后续证明这些条件不成立，应优先删除 public CLI，把能力退回 core-owned schema artifact、test harness 或 repo-local script。

## 北极星

Logix CLI 是 Agent 自我验证与修复闭环的命令路由。

它面向三类使用者：

- Agent coding loop
- 本仓 CI 和 examples dogfooding
- runtime / domain 维护者的本地验证

CLI 的核心任务是把 `Program`、canonical evidence package、selection manifest 和 verification input 交给 runtime control plane，并返回可机读、可比较、可修复的 `VerificationControlPlaneReport` 与 artifact refs。

Agent 日常自验证闭环的终局压力目标，尤其是 Program 装配漏加、依赖漏注入、配置漏提供、imports 漏装配、exact rerun coordinate 和 stdout artifact transport，统一看 [16-agent-self-verification-scenario-matrix.md](./16-agent-self-verification-scenario-matrix.md)。

该矩阵压出的 CLI transport 与 roundtrip 实施需求落到 [../../../specs/162-cli-verification-transport/spec.md](../../../specs/162-cli-verification-transport/spec.md)。core/kernel pressure 的实施需求落到 [../../../specs/161-verification-pressure-kernel/spec.md](../../../specs/161-verification-pressure-kernel/spec.md)。

终局判断标准固定为：

- Agent 不需要解析人类日志
- Agent 不需要知道旧 IR 工具箱命令
- Agent 默认只需要 `check / trial / compare`
- 所有机器结论都回到 `@logixjs/core/ControlPlane`
- CLI 不制造第二套 Program 模型、第二套 verification lane、第二套 report shape、第二套 evidence envelope 或第二套 Agent policy

## Command Surface Dominance

当前采用三命令形态：

```text
logix check
logix trial
logix compare
```

采用理由：

| 方案 | 裁决 | 原因 |
| --- | --- | --- |
| no public CLI | reject for v1 | Agent 和 CI 会退回 repo-local scripts，artifact contract 难以稳定复用 |
| `logix verify --stage <stage>` | reject | 单命令会把 stage 语义藏进参数，Agent 误传参数和宽入口膨胀风险更高 |
| only `check / trial` | reject for v1 | repair closure 需要标准 before/after compare route；缺 compare 会把对比逻辑推给 Agent 或 CI script |
| `check / trial / compare` | adopt | 与 runtime stage family 一一对应，概念数可控，shell 可读，proof 可按 stage 独立收敛 |
| old toolbox commands | reject | 会重新打开 IR、contract-suite、transform 和 writeback 产品面 |

这不是当前实现迁就。若现有 parser、command files 或 docs 与本表冲突，按本表切除或重写。

## 当前定位

`@logixjs/cli` 的 public command surface 只保留：

- `logix check`
- `logix trial`
- `logix compare`

CLI 当前只能作为：

- runtime control-plane route owner
- canonical evidence import consumer
- `VerificationControlPlaneReport` artifact producer
- `CommandResult` stdout transport producer
- Agent repair loop 的 machine report provider
- CI 可复现 gate executor

CLI 不再作为：

- 平台工具箱总入口
- authoring helper
- transform/writeback 产品面
- contract-suite 产品面
- IR Explorer 产品面
- Agent loop、memory、policy 或决策 runtime
- DevTools 专属 evidence/report 消费器

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

规则：

- selection manifest 只作为 CLI 和 Agent 的入口提示。
- selection manifest 不拥有 evidence truth、report truth、session truth 或 finding truth。
- CLI 必须消费 canonical evidence package，不得消费 DVTools 专属协议。
- CLI 必须优先输出 structured repair hints。
- 当失败能局部化到 declaration、scenario plan 或 evidence truth 时，至少一个 repair hint 必须带非空 `focusRef`。

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

stdout 继续只允许输出 deterministic `CommandResult` envelope。

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

- artifact 排序必须稳定。
- `inputCoordinate` 必须包含重跑同一 stage 或升级 stage 所需的 locator：normalized `argvSnapshot`、Program entry、evidence package ref、selection manifest ref、trial mode、scenario input ref、trial options、config、compare before/after refs 与 before/after evidence refs 中实际参与本次命令的部分。
- `primaryReportOutputKey` 必须指向 `artifacts[]` 中的 `VerificationControlPlaneReport` artifact。
- `VerificationControlPlaneReport` 是唯一 machine report authority。
- canonical evidence package 只能作为 input/provenance 或 artifact payload，不得成为 output report authority。
- source provenance 只能作为 `sourceArtifact` 输出，authority 固定为 provenance-only，不拥有 declaration truth。
- `check` 与 `trial` 可以输出 `reflectionManifest` artifact。该 artifact 的 payload 必须复用 core repo-internal `RuntimeReflectionManifest` DTO，`digest` 必须等于 manifest 自身 digest；CLI 只负责 transport，不拥有 reflection schema authority。
- evidence input 与 selection manifest 只能作为 `evidenceInput / selectionManifest` transport artifacts，selection authority 固定为 hint-only。
- compare before/after report refs 必须作为 `beforeReportRef / afterReportRef` transport artifacts 保持可达；compare truth 仍由 core report 持有。
- `CommandResult` 不得包含 `mode`、stage-specific report body、CLI-owned verdict 或 CLI-owned finding/session truth。
- stdout 不得输出人类日志。
- timestamp、machine-specific path、随机 id 不进入默认可 diff 面。
- 超预算 artifact 必须显式 `truncated`、`budgetBytes`、`actualBytes`、`digest`，并在可落盘时提供 file fallback；inline 只保留 bounded oversized preview，不得 silent drop。
- exit code 固定为 `0=PASS`、`2=USER_ERROR_OR_GATE_FAIL`、`1=INTERNAL`。

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
- 如果 entry 指向非 `Program`，默认结构化失败。
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

重跑规则：

- 原 stage 重跑使用 `CommandResult.inputCoordinate`。
- 升级 stage 使用 `nextRecommendedStage` 加 `CommandResult.inputCoordinate` 中可继承的 locator/ref。
- same-stage 精确重跑优先使用 `inputCoordinate.argvSnapshot.tokens`。该 snapshot 是配置前缀、parser normalization 与 last-wins option 规则后的 normalized argv。
- 大输入和敏感输入不得内联到 `inputCoordinate`；它们只通过 ref、digest 或 artifact outputKey 承接。
- `repairHints[].upgradeToStage` 只能作为 hint-local explanation；当它与 top-level `nextRecommendedStage` 不一致时，Agent 必须以 top-level `nextRecommendedStage` 为唯一调度依据。
- 当 `nextRecommendedStage` 非空时，它必须是唯一下一次命令建议。
- 当多个 repair hint 指向不同升级层，control plane 必须在 top-level 收敛成唯一 `nextRecommendedStage`，或返回 `INCONCLUSIVE` 并给出唯一升级入口。

Artifact key 统一规则：

- `artifacts[].outputKey` 是 CLI、control-plane report 和 DVTools selection manifest 之间的唯一 artifact key。
- `primaryReportOutputKey` 必须引用 `artifacts[].outputKey`。
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
- pre-control-plane failure 只能停在 transport gate，不得进入 `nextRecommendedStage` 或变成第四个 stage。

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

Logix CLI 的终局身份是 Agent First runtime control-plane route：public command surface 只保留 `check / trial / compare`，输入围绕 `Program` 与 canonical evidence，输出回到 `VerificationControlPlaneReport` 与 artifact refs；旧 IR、contract-suite、transform 工具箱叙事全部下沉或删除。
