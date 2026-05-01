# Feature Specification: CLI Agent First Control Plane Cutover

**Feature Branch**: `160-cli-agent-first-control-plane-cutover`
**Created**: 2026-04-26
**Status**: Implemented mainline, scenario executor deferred
**Input**: CLI 早期实现需要趁当前 Program / Module / Logic 主链收口后，按 Agent First、面向终局、不考虑兼容的视角重新打磨。

## 页面角色

本页是 `160` 的 cutover execution contract。

| 文件 | 角色 | 不负责 |
| --- | --- | --- |
| [../../docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md) | CLI 长期北极星、负边界、公开命令面和删除方向 | 逐文件实施顺序 |
| 本页 | `160` 的冻结决策、现状缺口、组件归宿、proof pack、波次计划 | 重开 runtime control plane 或 public authoring surface |
| [implementation-plan.md](./implementation-plan.md) | `160` 的 implementation plan，按 TDD chunk 拆解执行文件、测试和验证命令 | 冻结 authority 决策 |
| [../085-logix-cli-node-only/spec.md](../085-logix-cli-node-only/spec.md) | 历史背景 | 当前 authority |

`160` 的目标论点固定为：

```text
Logix CLI 收敛为 Agent First runtime control-plane route。
public command surface 只保留 check / trial / compare。
input authority 是 Program 与 canonical evidence。
output authority 是 VerificationControlPlaneReport + artifact refs。
旧 IR / contract-suite / transform 工具箱叙事全部下沉或删除。
```

本页不以当前实现为边界。parser、command file、历史 contract、tutorial 和 package bin 都可以为了终局形态被删除或重写。

## Binding Authority

- [../../docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)
- [../../docs/ssot/runtime/09-verification-control-plane.md](../../docs/ssot/runtime/09-verification-control-plane.md)
- [../../docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md](../../docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md)
- [../../docs/ssot/runtime/01-public-api-spine.md](../../docs/ssot/runtime/01-public-api-spine.md)
- [../../docs/ssot/runtime/03-canonical-authoring.md](../../docs/ssot/runtime/03-canonical-authoring.md)
- [../../docs/ssot/runtime/14-dvtools-internal-workbench.md](../../docs/ssot/runtime/14-dvtools-internal-workbench.md)
- [../../docs/adr/2026-04-05-ai-native-runtime-first-charter.md](../../docs/adr/2026-04-05-ai-native-runtime-first-charter.md)
- [../../docs/standards/logix-api-next-guardrails.md](../../docs/standards/logix-api-next-guardrails.md)

## Background Only

- [../085-logix-cli-node-only/spec.md](../085-logix-cli-node-only/spec.md)
- [../085-logix-cli-node-only/contracts/public-api.md](../085-logix-cli-node-only/contracts/public-api.md)
- [../../examples/logix-cli-playground/tutorials/05-baseline-and-diff/README.md](../../examples/logix-cli-playground/tutorials/05-baseline-and-diff/README.md)

旧 `085` CLI specs 只提供背景，不覆盖本页或 SSoT。

`085` 当前必须视为 superseded background。它的旧 public API 文档不得作为 Agent 调用依据，`160` closure 必须让 `085` 首屏带有 superseded / negative-only 声明，或把旧 public contract 迁入 archive。

## Implementation State

当前 `160` 主干已落地：

- package root `src/index.ts` 为空导出
- public binary help 只展示 `check / trial / compare`
- public `runCli` 只接受 `check / trial / compare`
- `check` 直接路由 `Runtime.check(Program, options)`
- `trial --mode startup` 直接路由 `Runtime.trial(Program, options)`
- `compare` 由 `@logixjs/core/ControlPlane` compare executor 持有 truth
- `Program` entry 已验证，Module / Logic entry 结构化失败
- canonical evidence package 与 selection manifest 已成为 CLI input/provenance
- selection manifest 的 artifact key 会与 evidence package artifact keys 交叉校验
- `CommandResult` 已成为 transport only envelope，包含 `inputCoordinate` 与 `primaryReportOutputKey`
- package-local schema artifact 已落地为 `packages/logix-cli/src/schema/commands.v1.json`，发布子路径为 `@logixjs/cli/schema/commands.v1.json`
- 旧 `describe / ir.* / contract-suite.run / transform.module / logix-devserver` command identity 已删除
- playground tutorial 已改为 Agent First control-plane route

明确后置：

- `trial --mode scenario` 需要 core-owned scenario executor 后才能成为成功路径。当前 CLI 对 scenario mode 返回结构化失败，避免把 startup 结果伪装成 scenario 结果。

## Terminal Decisions

### TD-000: CLI Existence Gate

`@logixjs/cli` 只有在满足 [CLI SSoT](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md) 的 existence gate 后才保留 public binary。

Adopted v1 stance:

| option | decision | reason |
| --- | --- | --- |
| no public CLI | rejected | CI 和 Agent 会退回 repo-local scripts，无法获得稳定 artifact contract |
| single `logix verify --stage ...` | rejected | 参数宽入口更容易混淆 stage、mode 和 input admissibility |
| only `check / trial` | rejected for v1 | repair closure 需要标准 compare route，否则对比 truth 会散到 Agent 或 CI |
| `check / trial / compare` | adopted | 与 runtime stage family 一一对应，proof 可分 stage 收敛 |
| old toolbox commands | rejected | 重开 IR、contract-suite、transform 和 writeback 产品面 |

### TD-001: Public Command Surface

Public command surface 固定为：

- `logix check`
- `logix trial`
- `logix compare`

禁止新增：

- `logix ir ...`
- `logix contract-suite ...`
- `logix transform ...`
- `logix trialrun`
- `logix describe` as public command
- `logix devtools`
- `logix inspect`
- `logix agent`
- `logix repair`

### TD-002: Input Authority

CLI 的主输入权威固定为：

- `Program` entry
- canonical evidence package
- verification input

Hint-only sidecar:

- selection manifest

规则：

- `<modulePath>#<exportName>` 解析后的 export 必须是 `Program`。
- 旧 Module entry fallback 不进入终局。
- Logic 不成为独立 CLI entry。
- `controlProgramSurface` 不成为 public CLI input 或 output 心智。
- selection manifest 不拥有 truth，也不属于 input authority chain。

### TD-003: Output Authority

CLI 的 machine report authority 固定为：

- `VerificationControlPlaneReport`
- artifact refs owned by the report/artifact writer

`CommandResult` 只是 deterministic stdout transport envelope。它必须包含 `primaryReportOutputKey` 指向 `artifacts[]` 里的 `VerificationControlPlaneReport` artifact。

canonical evidence package 只能作为 input/provenance 或 artifact payload，不能成为 output report authority。

`CommandResult` 还必须包含 `inputCoordinate`，记录重跑同一 stage 或升级 stage 所需 locator/ref。它只保存 Program entry、evidence package ref、selection manifest ref、trial mode、scenario input ref、compare before/after refs 中实际参与本次命令的部分，不拥有输入 truth。

禁止新增：

- CLI 专属 report shape
- CLI 专属 evidence envelope
- CLI 专属 finding/session truth
- CLI 专属 scenario language
- CLI 专属 Agent decision protocol
- `CommandResult.mode`
- `RuntimeCheckReport / RuntimeTrialReport / RuntimeCompareReport` authority

### TD-004: Internal Residue Fate

Disposition vocabulary 只允许五类：

- `delete`
- `inline-helper`
- `keep-internal-helper`
- `rewrite-under-public-command`
- `archive-doc-only`

任何 `public-expert` 或 `semi-public` disposition 都无效。

### TD-005: Agent Discovery

Agent discovery 不得重新打开第四个 public command。

schema authority 仍由 CLI SSoT、verification control-plane SSoT 和 `@logixjs/core/ControlPlane` 持有。package-local schema artifact 只能是派生镜像，不拥有独立 command contract truth。

允许路径：

- package-local schema artifact as derived mirror
- docs SSoT command contract

禁止路径：

- `logix describe` public command
- `logix --describe-json` public flag
- `CliDescribeReport`
- archived internal commands 出现在 public discovery
- Agent 通过人类 help text 推断旧工具箱路线

### TD-006: Runtime Cost

CLI 只按需执行，不引入 runtime 常驻成本。

规则：

- `--help` 与 discovery path 必须 lazy-load heavy commands。
- `check` 不启动 runtime。
- 默认 gate 只跑 `check + trial(mode="startup")`。
- scenario trial 是 future upgrade；compare、browser host、raw trace、replay 都是显式升级层。

### TD-007: Mode Semantics

Global `--mode report|write` 退出 CLI。

当前唯一可执行的 `--mode` 语义是：

```text
logix trial --mode startup
```

规则：

- `--mode report` 和 `--mode write` 必须零接受。
- writeback 不属于 CLI v1。
- `trial --mode scenario` 当前必须结构化失败，直到 core-owned scenario executor 落地。
- CLI 不能隐式发明 scenario language。

### TD-008: Stage Input Matrix

| stage | required input | optional input | ref-only input | forbidden public input |
| --- | --- | --- | --- | --- |
| `check` | Program entry | canonical evidence static slice, selection manifest | declaration coordinate | raw declaration artifact as public authority |
| `trial(mode=startup)` | Program entry | canonical evidence package, selection manifest | declaration coordinate | scenario input |
| future `trial(mode=scenario)` | Program entry, `fixtures/env + steps + expect` | canonical evidence package, selection manifest | declaration coordinate | scenario DSL outside verification input |
| `compare` | before/after `VerificationControlPlaneReport` plus admissible evidence summaries or artifact refs | Program entry only to resolve declaration coordinate | environment fingerprint, declaration digest, scenario plan digest | raw evidence full compare as default |

`focusRef` 只属于 diagnostic coordinate chain：`VerificationControlPlaneReport.repairHints[].focusRef`。它不得成为 CLI input authority。

### TD-009: Agent Rerun And Artifact Linking

Agent 重跑闭环只依赖：

- `CommandResult.command`
- `CommandResult.inputCoordinate`
- `CommandResult.primaryReportOutputKey`
- `CommandResult.artifacts[]`
- referenced `VerificationControlPlaneReport`
- `repairHints[].focusRef`
- `repairHints[].relatedArtifactOutputKeys`
- `nextRecommendedStage`

Rules:

- 原 stage 重跑使用 `CommandResult.inputCoordinate`。
- 升级 stage 使用 `nextRecommendedStage` 加 `CommandResult.inputCoordinate` 中可继承的 locator/ref。
- `nextRecommendedStage` 是 Agent 调度唯一 top-level authority。
- `repairHints[].upgradeToStage` 只能解释 hint-local 升级建议。
- `artifacts[].outputKey` 是 CLI、control-plane report 和 DVTools selection manifest 之间唯一 artifact key。
- `primaryReportOutputKey` 与 `repairHints[].relatedArtifactOutputKeys` 都只能引用 `artifacts[].outputKey`。
- `artifact ref` 只表示 locator，不是第二套 key namespace。

### TD-010: Compare Authority Precondition

`logix compare` 只是 CLI route to control-plane compare stage。

Implementation closure 必须先证明：

- core-owned compare executor 或 equivalent control-plane internal executor 已存在
- compare input contract 按 [09-verification-control-plane.md](../../docs/ssot/runtime/09-verification-control-plane.md) 接受 before/after report、evidence summary 和 key artifacts
- environment mismatch 输出 `INCONCLUSIVE`
- CLI 没有自定义 compare truth

若这些条件未满足，`compare` 只能作为 planned route，不能作为完成项。

## Concept Family Disposition Freeze

本表按概念族裁决。具体文件可以删除、合并或改名，不受当前实现结构限制。

| 概念族 / 当前对象 | disposition | 新归宿 | proof |
| --- | --- | --- | --- |
| `src/internal/entry.ts` | rewrite-under-public-command | public route gate + internal helper dispatch | public command allowlist test |
| `src/internal/args.ts` | rewrite-under-public-command | Program/evidence/selection aware parser | Program entry and evidence input tests |
| `src/internal/result.ts` | keep-internal-helper | deterministic CommandResult transport + primary report artifact pointer | output contract tests |
| `src/internal/commands/check.ts` | rewrite-under-public-command | direct `runtime.check` route over Program/declaration/evidence | check report contract tests |
| `src/internal/commands/trial.ts` | rewrite-under-public-command | real `runtime.trial(mode=startup)` route; scenario mode structured failure until core executor exists | trial execution tests |
| `src/internal/commands/compare.ts` | rewrite-under-public-command | control-plane compare route over reports/evidence/artifacts | compare admissibility tests |
| `src/internal/commands/describe.ts` | delete command identity | package-local static schema artifact only | no describe command / no `CliDescribeReport` test |
| `src/internal/commands/irExport.ts` | inline-helper | helper only if needed by check/trial artifacts | no public IR command test |
| `src/internal/commands/irValidate.ts` | inline-helper | helper only if needed by check | no public IR command test |
| `src/internal/commands/irDiff.ts` | inline-helper | helper only if needed by compare | no public IR command test |
| `src/internal/commands/contractSuiteRun.ts` | delete | none | no command/parser/help/discovery references |
| `src/internal/commands/transformModule.ts` | delete | none | no command/parser/help/discovery references |
| `src/internal/commands/unsupported.ts` | keep-internal-helper | unknown command structured error | unsupported command tests |
| `src/internal/artifacts.ts` | keep-internal-helper | artifact writer and budget handling | artifact determinism tests |
| `src/internal/cliConfig.ts` | keep-internal-helper | config visibility for public routes | config precedence tests |
| `src/internal/stableJson.ts` | keep-internal-helper | deterministic serialization | stable json tests |
| `src/bin/logix.ts` | rewrite-under-public-command | public binary entry only | binary help smoke |
| `src/bin/logix-devserver.ts` | delete | none in CLI cutover | no bin/package reference |
| global report/write mode grammar | delete | none | `--mode report|write` rejection test |
| old Markdown contracts under `085` | archive-doc-only or superseded banner | background only | first-screen superseded guard |

## Implementation Cutover Plan

### Wave 0: Guards And Inventory

Goal: freeze current public route and reveal internal command residue.

Must do:

- assert CLI existence gate and command dominance are represented in docs
- assert package root export remains empty
- assert public help only lists `check / trial / compare`
- assert `runCli` rejects every archived command
- assert `describe`, `--describe-json`, `CliDescribeReport`, `--mode report`, and `--mode write` are rejected or absent from public contract
- add disposition guard for all command files

Exit:

- public surface guard passes
- archived route residue guard fails before cutover and passes after cutover

### Wave 1: Parser And Input Authority

Goal: move parser from early toolbox grammar to Program/evidence/selection grammar.

Must do:

- parse `--entry <modulePath>#<exportName>` as Program entry
- validate loaded export is Program
- add `--evidence <file|dir>` canonical evidence package input
- add `--selection <file>` selection manifest input hint
- keep `runId / out / budgetBytes / host / cliConfig / profile`
- remove `--ops`, contract-suite-only options, transform-only options
- remove global `--mode report|write`
- keep `--mode` parser local to `trial`, accepting `startup` as executable mode and returning structured failure for reserved `scenario`

Exit:

- Module entry rejection test passes
- Program entry acceptance test passes
- evidence + selection input contract tests pass

### Wave 2: Check / Trial / Compare Routes

Goal: make public commands direct control-plane routes.

Must do:

- rewrite `check` to call `Runtime.check(Program, options?)` or current control-plane internal equivalent
- rewrite `trial` to call `Runtime.trial(Program, options)`
- make `trial(mode=startup)` real, no `CLI_NOT_IMPLEMENTED`
- reject explicit `trial(mode=scenario)` with structured error until core-owned scenario executor exists
- rewrite `compare` to consume reports/evidence/artifacts according to control-plane compare admissibility
- preserve `CommandResult` transport envelope and `VerificationControlPlaneReport`
- write `primaryReportOutputKey` for every supported command

Exit:

- `trial` returns PASS/FAIL/INCONCLUSIVE from real execution path
- no public command returns `CLI_NOT_IMPLEMENTED` for supported Program input
- report fields satisfy `09-verification-control-plane`
- compare passes only after compare authority precondition is met

### Wave 3: Delete Or Inline Archived Routes

Goal: remove command identity for old toolbox routes.

Must do:

- delete `contractSuiteRun.ts`
- delete `transformModule.ts`
- delete `describe` command identity
- remove archived command tokens from parser
- remove archived command contracts from discovery
- inline `ir.*` helpers under check/compare/trial if still needed
- delete `logix-devserver` bin if no current SSoT owner exists

Exit:

- no `contract-suite` or `transform.module` matches in `src`
- no public or internal command identity for `ir.*`
- no `describe` command identity or `CliDescribeReport`
- only helper function names remain if directly serving public routes

### Wave 4: Docs And Examples Closure

Goal: erase old CLI toolbox teaching path.

Must do:

- update playground tutorial to `check / trial / compare` only
- add superseded / negative-only banner to old `085` Markdown files, or archive the old contract files
- update runtime README route to include CLI SSoT
- update `04`、`09`、`14` cross references to include CLI SSoT where relevant
- add or update implementation plan after optimality loop

Exit:

- current docs teach CLI as Agent First control-plane route
- no current docs teach `ir export / validate / diff`, `contract-suite`, or `transform module` as public path

## User Scenarios

### US1: Agent Runs Default Gate

Given a code edit and a Program entry, Agent runs:

```text
logix check --entry <program>
logix trial --entry <program> --mode startup
```

Acceptance:

- outputs are deterministic `CommandResult`
- artifacts include `VerificationControlPlaneReport`
- `primaryReportOutputKey` points to that report artifact
- `inputCoordinate` is sufficient to rerun the same stage
- repair hints contain structured code and focusRef when localizable
- no human log parsing is required

### US2: Agent Consumes DVTools Export

Given DVTools exported canonical evidence package and selection manifest, Agent runs CLI with evidence input.

Acceptance:

- CLI consumes canonical evidence
- selection manifest only narrows entry hint
- output report does not include DVTools session/finding truth

### US3: CI Uses Minimal Gate

Given a representative Program entry, CI runs `check + trial(startup)`.

Acceptance:

- default gate does not run scenario, compare, browser host, raw trace, or replay
- failure uses exit code `2` for user/gate failure and `1` for internal failure
- output is stable across repeated runs

### US4: Repair Closure Uses Compare

Given before/after evidence and reports, Agent runs `compare`.

Acceptance:

- compare uses standard reports and key artifacts
- environment mismatch returns `INCONCLUSIVE`
- raw evidence full compare is not default
- failure includes repair hints, artifact refs, and a unique `nextRecommendedStage` when another stage is required

### US5: Agent Repairs From Machine Report

Given a failed check or trial report, Agent reads only `CommandResult.command`, `CommandResult.inputCoordinate`, `CommandResult.primaryReportOutputKey`, `CommandResult.artifacts[]`, the referenced `VerificationControlPlaneReport`, `repairHints`, `focusRef`, artifact output keys, and `nextRecommendedStage`.

Acceptance:

- Agent can locate the declaration, scenario step, evidence gap, or artifact without parsing human logs
- rerun reaches PASS or a single explicit upgrade stage
- no CLI-owned finding/session truth is needed

## Functional Requirements

- **FR-001**: CLI public command surface MUST contain only `check / trial / compare`.
- **FR-002**: CLI MUST treat `Program` as entry authority.
- **FR-003**: CLI MUST reject non-Program entry with structured error.
- **FR-004**: CLI MUST accept canonical evidence package as input where relevant.
- **FR-005**: CLI MAY accept selection manifest only as entry hint.
- **FR-006**: CLI MUST output `CommandResult` envelope.
- **FR-007**: CLI MUST output `VerificationControlPlaneReport` for supported public commands.
- **FR-008**: CLI MUST NOT output CLI-specific report truth.
- **FR-009**: CLI MUST NOT output CLI-specific evidence envelope.
- **FR-010**: CLI MUST remove public and discovery exposure for archived commands.
- **FR-011**: CLI MUST remove transform/writeback product surface.
- **FR-012**: CLI MUST not embed Agent loop, memory, policy, or repair decision.
- **FR-013**: CLI MUST preserve deterministic serialization and artifact ordering.
- **FR-014**: CLI MUST keep `--help` and discovery lazy-loaded.
- **FR-015**: CLI MUST keep default CI gate at `check + trial(mode=startup)`.
- **FR-016**: CLI MUST expose `primaryReportOutputKey` in `CommandResult`.
- **FR-017**: CLI MUST reject global `--mode report|write`.
- **FR-018**: CLI MUST keep `--mode` scoped to `trial`; `startup` is executable, `scenario` is reserved and currently returns structured failure.
- **FR-019**: CLI MUST not expose `describe`, `--describe-json`, or `CliDescribeReport` as public discovery.
- **FR-020**: CLI MUST not productize compare until compare authority precondition is met.
- **FR-021**: CLI MUST expose `inputCoordinate` in `CommandResult` for rerun and upgrade.
- **FR-022**: CLI MUST use `artifacts[].outputKey` as the only artifact key namespace.
- **FR-023**: Agent scheduling MUST follow top-level `nextRecommendedStage` over hint-local `upgradeToStage`.

## Non-Functional Requirements

- **NFR-001**: CLI must not add runtime hot-path cost.
- **NFR-002**: CLI cold start for help/discovery should stay under `500ms`.
- **NFR-003**: CLI failure must include command, stage, input coordinate, reason code, and recovery hint where possible.
- **NFR-004**: CLI output must be stable across repeated runs with same input.
- **NFR-005**: CLI heavy dependencies must be loaded only by commands that need them.
- **NFR-006**: CLI docs must not require Agent to parse human prose to discover command contract.

## Closure Proof Pack

| proof id | target invariant | fixture/input | assertion | command class |
| --- | --- | --- | --- | --- |
| `P-001` | public command surface | `runCli` and binary help | only `check / trial / compare` accepted | unit/integration |
| `P-002` | package surface nullity | package exports and `src/index.ts` | no public TS API export | guard |
| `P-003` | Program entry authority | Program and non-Program fixtures | Program accepted, Module/Logic rejected | integration |
| `P-004` | real trial route | Program fixture | no `CLI_NOT_IMPLEMENTED`, report uses real trial result | integration |
| `P-005` | evidence import | canonical evidence fixture | evidence consumed without CLI envelope | contract |
| `P-006` | selection manifest hint | DVTools manifest fixture | hint narrows focus, owns no truth | contract |
| `P-007` | report contract | check/trial/compare reports | all satisfy `VerificationControlPlaneReport` | contract |
| `P-008` | archived command deletion | source sweep | no command identity for `contract-suite`, `transform`, public `ir.*` | guard |
| `P-009` | discovery no archived route | package-local schema artifact | only public commands listed; no `describe`, no `--describe-json`, no `CliDescribeReport` | integration |
| `P-010` | deterministic output | repeated same input | stable JSON equal except allowed file paths | integration |
| `P-011` | cold start | help/discovery | under threshold or residual recorded | perf |
| `P-012` | docs closure | current docs sweep | no public teaching of archived toolbox commands | guard |
| `P-013` | output transport boundary | every supported command result | `CommandResult` has no `mode`; `primaryReportOutputKey` points to report artifact | contract |
| `P-014` | mode grammar | CLI argv fixtures | `--mode report|write` zero acceptance; `trial --mode startup` accepted; `trial --mode scenario` structured failure | unit/integration |
| `P-015` | stage input admissibility | check/trial/compare fixtures | required/optional/ref-only/forbidden input matrix enforced | contract |
| `P-016` | compare authority precondition | compare fixtures | CLI compare uses core-owned compare route and returns `INCONCLUSIVE` on env mismatch | integration |
| `P-017` | Agent closure loop | failing report fixture then repaired fixture | Agent-relevant fields are sufficient for PASS or unique upgrade stage | golden |
| `P-018` | old 085 superseded | old `085` Markdown files | first screen marks superseded / negative-only or file is archived | docs guard |
| `P-019` | no stage-specific report authority | source and schema sweep | no `RuntimeCheckReport / RuntimeTrialReport / RuntimeCompareReport` schema authority | guard |
| `P-020` | rerun input coordinate | check/trial/compare command results | `inputCoordinate` can reconstruct same-stage rerun and upgrade command inputs | contract |
| `P-021` | artifact key namespace | report, DVTools manifest, CLI artifacts | all artifact links use `artifacts[].outputKey`; refs are locators only | contract |
| `P-022` | next-stage precedence | multiple repair hint fixture | top-level `nextRecommendedStage` is unique scheduling authority | contract |

## Suggested Proof Commands

```bash
pnpm -C packages/logix-cli typecheck:test
pnpm -C packages/logix-cli test
pnpm -C packages/logix-cli typecheck
pnpm -C packages/logix-cli measure:startup
```

Suggested sweeps:

```bash
rg -n "contract-suite|transform module|trialrun|ir export|ir validate|ir diff|controlProgramSurface|ControlSurfaceManifest|CliDescribeReport|--describe-json|--mode report|--mode write|CommandResult\\.mode" \
  packages/logix-cli/src packages/logix-cli/test examples/logix-cli-playground docs/ssot docs/standards specs/160-cli-agent-first-control-plane-cutover \
  --glob '!docs/archive/**' \
  --glob '!specs/085-logix-cli-node-only/**'
```

## Done Gates

`160` closes only when:

- all public route proof passes
- `trial` is connected to real control-plane execution
- old toolbox command identities are deleted or inlined
- `CommandResult` is transport only and exposes `primaryReportOutputKey`
- `CommandResult.inputCoordinate` is sufficient for same-stage rerun and upgrade-stage input inheritance
- artifact links use only `artifacts[].outputKey`
- top-level `nextRecommendedStage` has precedence over hint-local `upgradeToStage`
- `--mode report|write`, public `describe`, public `--describe-json`, and `CliDescribeReport` are absent
- compare authority precondition is satisfied before `compare` is considered implemented
- CLI SSoT is linked from runtime README
- `discussion.md` contains no accepted decision outside spec or SSoT
- old `085` is marked superseded / negative-only or archived
- docs and examples teach only Agent First control-plane route

## Reopen Bar

Only reopen this spec if one of these happens:

- `check / trial / compare` cannot support Agent self-verification
- Program entry cannot represent required runtime verification input
- `VerificationControlPlaneReport` cannot express required repair hints
- canonical evidence package cannot carry DVTools or CI evidence
- package-local schema artifact cannot support machine-readable discovery
- core-owned scenario executor is required before scenario mode can become a successful CLI route
- a stricter alternative improves proof strength without increasing public command count, compatibility budget, or second truth risk

## Current One-Line Conclusion

`160` cuts CLI to the Agent First control-plane route: `check / trial / compare` are the only public commands, `Program` and canonical evidence are the only input authority, and `VerificationControlPlaneReport` is the only machine report authority.
