# Feature Specification: CLI Verification Transport

**Feature Branch**: `162-cli-verification-transport`  
**Created**: 2026-04-27  
**Status**: Done  
**Input**: User description: "把 Agent 自验证压力矩阵压出的 CLI 需求转成独立 spec：source artifact boundary、exact rerun coordinate、stdout budget、artifact ordering、error report proof、DVTools selection roundtrip、before repair rerun compare closure。"

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-8, NS-10
- **Kill Features (KF)**: KF-3, KF-4, KF-8, KF-9

## Current Role

本页是 Agent 自验证压力矩阵压出的 `@logixjs/cli` transport 与 roundtrip spec。

| 文件 | 角色 | 不负责 |
| --- | --- | --- |
| [../../docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md](../../docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md) | 终局 pressure index、gap tags、proof axes | CLI exact command contract |
| [../../docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md) | CLI command surface、transport、entry/input gate authority | core report truth |
| 本页 | CLI transport、source artifact boundary、exact rerun、stdout budget、DVTools roundtrip 的可实施需求 | core/kernel 判断 truth |
| [../160-cli-agent-first-control-plane-cutover/spec.md](../160-cli-agent-first-control-plane-cutover/spec.md) | 已实施的 CLI mainline cutover | 新增 pressure closure |
| [../161-verification-pressure-kernel/spec.md](../161-verification-pressure-kernel/spec.md) | core/kernel 的 pressure 表达能力 | CLI stdout 与 transport proof |

本页不以当前 CLI parser 或历史命令实现为边界。任何旧 IR、contract-suite、transform、describe、devserver 或 Module entry 残留都不能为了 transport 便利保留。

实施进度只以 [tasks.md](./tasks.md)、[checklists/implementation-closure.md](./checklists/implementation-closure.md) 和 owner pages 的 proof ref 回写为准。[checklists/requirements.md](./checklists/requirements.md) 只校验规格质量，不能作为实现完成证据。

## Context

`160` 已把 CLI 主线切到 Agent First control-plane route，public command surface 只保留 `check / trial / compare`。`runtime/16` 继续压出了 CLI 层必须补齐的闭环能力：

- CLI 只能产 source artifact provenance，不能拥有 declaration truth。
- `CommandResult.inputCoordinate` 必须足以 exact rerun。
- stdout 必须有预算、截断、file fallback 与 artifact ordering 的 deterministic proof。
- pre-control-plane failure 不能伪装成第四个 stage。
- DVTools selection manifest 必须能 roundtrip 到 CLI，再回到 report focus/artifact outputKey。
- before -> repair -> exact rerun -> compare closure 需要 CLI 参与证明。

这份 spec 只处理 CLI 作为 transport/route 的职责。判断缺陷、生成 dependency cause、判定 compare admissibility 的 truth 继续归 core。

## Scope

### In Scope

- `logix check / trial / compare` 的 transport closure
- `CommandResult` 作为 stdout envelope 的 deterministic contract
- `inputCoordinate` exact rerun locator/ref/argv snapshot
- source artifact producer 与 `runtime.check` declaration gate 的分层
- artifact outputKey ordering、primaryReportOutputKey、error report proof
- stdout budget、truncation、file fallback
- canonical evidence package 与 DVTools selection manifest 的 CLI import roundtrip
- before/after report refs 与 compare command closure
- CLI integration tests、schema guard 与 e2e proof packs
- `docs/ssot/runtime/15`、`14`、`16` 的需求引用回写

### Out of Scope

- core `Runtime.check / trial / compare` 的 report truth 与 dependency truth
- `VerificationControlPlaneReport` exact schema
- DVTools UI layout、session clustering 与 finding derivation
- Chrome DevTools 宿主迁移
- scenario executor 成功路径
- raw provider overlay public input
- raw trace full compare、browser host、replay 默认门禁
- public command surface 扩张

## Imported Authority

- [../../docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)
- [../../docs/ssot/runtime/09-verification-control-plane.md](../../docs/ssot/runtime/09-verification-control-plane.md)
- [../../docs/ssot/runtime/14-dvtools-internal-workbench.md](../../docs/ssot/runtime/14-dvtools-internal-workbench.md)
- [../../docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md](../../docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md)
- [../../docs/adr/2026-04-05-ai-native-runtime-first-charter.md](../../docs/adr/2026-04-05-ai-native-runtime-first-charter.md)
- [../../docs/standards/logix-api-next-guardrails.md](../../docs/standards/logix-api-next-guardrails.md)
- [../159-dvtools-internal-workbench-cutover/spec.md](../159-dvtools-internal-workbench-cutover/spec.md)
- [../160-cli-agent-first-control-plane-cutover/spec.md](../160-cli-agent-first-control-plane-cutover/spec.md)
- [../161-verification-pressure-kernel/spec.md](../161-verification-pressure-kernel/spec.md)

## Closure & Guardrails

### Closure Contract

`162` 关闭时，CLI 必须能让 Agent 用 shell 完成稳定闭环：

```text
logix check
  -> logix trial --mode startup
    -> repair edit
      -> exact rerun
        -> logix compare
```

闭环要求：

- 输入坐标可重建同一命令或升级命令。
- primary machine report 始终来自 `VerificationControlPlaneReport` artifact。
- stdout 超预算时仍能通过 artifact refs 找到完整报告。
- source artifact 与 selection manifest 只作 provenance / hint。
- pre-control-plane failure 停在 transport gate，不进入 `nextRecommendedStage`。
- same normalized input 的 transport 结果稳定。

### Must Cut

- `CommandResult` 成为第二 machine report truth
- CLI 自定义 dependency truth、declaration truth、compare truth 或 Agent repair policy
- public command surface 超出 `check / trial / compare`
- raw provider overlay 作为 CLI v1 public input
- DVTools selection manifest 改写 evidence truth
- stdout 人类日志成为 Agent 机器判断入口
- 旧 IR、contract-suite、transform、describe、devserver 路线回流
- 为了兼容保留 Module/Logic entry fallback

### Reopen Bar

只有下面证据允许重开本页：

- `check / trial / compare` 无法表达 Agent shell 自验证闭环
- `CommandResult.inputCoordinate` 无法 exact rerun 或升级 stage
- artifact outputKey 无法统一 CLI、report、DVTools selection 与 repair hint
- stdout budget/file fallback 无法满足 Agent 消费
- DVTools evidence 无法通过 canonical evidence package 进入 CLI
- 真实 Agent 场景证明需要新增 public command，同时不增加误用率、第二 truth 或兼容负担

## User Scenarios & Testing

### User Story 1 - Agent 可以从 CLI 输出重建 exact rerun (Priority: P1)

作为 Agent，我需要从 `CommandResult.inputCoordinate` 与 artifact refs 精确重跑同一验证输入，避免修复后对比的是另一组输入。

**Traceability**: NS-8, NS-10, KF-8

**Why this priority**: exact rerun 是 before/after compare closure 的前提。

**Independent Test**: 运行 `logix check` 与 `logix trial --mode startup` 后，用 `inputCoordinate` 重建命令，确认 verdict、errorCode、artifact keys、digest 与 next stage 在允许差异外稳定。

**Acceptance Scenarios**:

1. **Given** Agent 运行 `logix check`，**When** 它读取 `CommandResult.inputCoordinate`，**Then** 能获得 Program entry、relevant refs 与 argv snapshot 来重跑同一 check。
2. **Given** 输入包含大 payload 或敏感内容，**When** CLI 输出 inputCoordinate，**Then** 大输入与敏感输入只通过 artifact ref 或 digest 承接。
3. **Given** 同一 normalized input 被重复运行，**When** Agent 对比两次 `CommandResult`，**Then** 除 runId/path/outDir 允许差异外，关键机器字段稳定。

---

### User Story 2 - Agent 不需要解析 stdout 人类日志 (Priority: P1)

作为 Agent，我需要 CLI stdout 保持可机读、可预算、可回链，即使完整 report 被写入文件，也能通过 artifact refs 找到它。

**Traceability**: NS-4, NS-8, NS-10, KF-4, KF-8

**Why this priority**: stdout 一旦靠人类日志承载机器判断，Agent 自验证会退回脆弱解析。

**Independent Test**: 构造小报告、大报告、错误报告和截断报告，验证 stdout envelope、artifact ordering、primaryReportOutputKey、file fallback 与 truncation metadata。

**Acceptance Scenarios**:

1. **Given** primary report 低于 stdout budget，**When** CLI 输出结果，**Then** stdout 包含 deterministic `CommandResult` 与 primary report artifact key。
2. **Given** primary report 超过 stdout budget，**When** CLI 输出结果，**Then** stdout 只保留预算内 envelope，并提供 file fallback artifact ref。
3. **Given** pre-control-plane entry failure，**When** CLI 输出 error result，**Then** failure 保持在 transport gate，不伪造 `nextRecommendedStage`。

---

### User Story 3 - DVTools evidence 可以进入 CLI repair roundtrip (Priority: P2)

作为 Agent，我需要把 DVTools selected session/finding 导出的 evidence package 和 selection manifest 交给 CLI，并在 report focus/artifact 中找到修复入口。

**Traceability**: NS-4, NS-8, KF-4, KF-9

**Why this priority**: 这是 DVTools 证据被 CLI 消费、再由 Agent 修复分析的闭环。

**Independent Test**: 用 selected session/finding 导出的 canonical evidence package + selection manifest 运行 CLI，验证 artifact outputKey、selection manifest key、report focus 与 repair target 的 roundtrip。

**Acceptance Scenarios**:

1. **Given** DVTools 导出 canonical evidence package 和 selection manifest，**When** Agent 运行 `logix check` 或 `logix trial`，**Then** CLI 把 selection manifest 作为 hint 接入，不改变 evidence truth。
2. **Given** selection manifest 引用 artifact key，**When** CLI 校验输入，**Then** artifact key 必须等同于 `artifacts[].outputKey` 或先通过 evidence package 进入 inputCoordinate。
3. **Given** CLI 返回 report，**When** Agent 查找 repair target，**Then** 能通过 report focus、artifact outputKey 或 owner-defined locator 找到目标。

---

### User Story 4 - Agent 可以完成 before/after compare closure (Priority: P2)

作为 Agent，我需要 CLI 支持用 before report、after report 和 admissible evidence refs 运行 compare，得到可调度结果。

**Traceability**: NS-3, NS-8, NS-10, KF-3, KF-8

**Why this priority**: 修复闭环没有 compare，只能靠 Agent 自己判断是否修好。

**Independent Test**: 对 Program 装配缺陷、source/declaration 缺陷和 dependency 缺陷各做一条 before -> repair -> exact rerun -> compare proof pack。

**Acceptance Scenarios**:

1. **Given** before 与 after report 可比，**When** Agent 运行 `logix compare`，**Then** compare 返回 `PASS / FAIL / INCONCLUSIVE` 中可调度结果。
2. **Given** before 与 after report declaration digest 不一致，**When** Agent 运行 compare，**Then** CLI 路由到 core compare admissibility，不自行判定修复失败。
3. **Given** compare 输入缺失必要 report ref，**When** CLI 解析输入，**Then** 返回 transport gate failure，不进入 control-plane stage。

### Edge Cases

- CLI entry failure 属于 pre-control-plane gate，不能进入 `nextRecommendedStage`。
- `CommandResult.error` 可以存在，但不能成为 primary machine report authority。
- `primaryReportOutputKey` 必须引用 `artifacts[].outputKey`。
- `repairHints[].relatedArtifactOutputKeys` 只能引用 `artifacts[].outputKey`。
- selection manifest 的 artifact key 必须与 CLI artifact key namespace 一致。
- source artifact producer 可以写 locator/ref/digest，不能成为 declaration truth owner。
- scenario mode 当前仍可结构化失败，不能把 startup result 伪装成 scenario result。
- compare 只比较标准报告与关键工件，不默认打开 raw evidence full compare。

## Requirements

### Functional Requirements

- **FR-001**: (NS-8) CLI public command surface MUST remain limited to `check / trial / compare`.
- **FR-002**: (NS-8, NS-10) `CommandResult` MUST remain transport-only and MUST NOT become machine report authority.
- **FR-003**: (NS-4, NS-10) Every successful control-plane command MUST expose `primaryReportOutputKey` that references an item in `artifacts[].outputKey`.
- **FR-004**: (NS-8, NS-10) `CommandResult.inputCoordinate` MUST contain enough owner-defined locator/ref/argv snapshot to rerun the same stage or upgrade to the recommended stage.
- **FR-005**: (NS-10) Large or sensitive inputs MUST be represented through artifact ref or digest rather than inline stdout payload.
- **FR-006**: (NS-3, NS-4) Source artifact producer MUST remain separate from `runtime.check` declaration gate; CLI MUST NOT own declaration truth.
- **FR-007**: (NS-10) CLI v1 MUST NOT add raw provider overlay public input; provider source classification belongs to core report, internal harness or future host layer.
- **FR-008**: (NS-10) stdout budget, truncation metadata, file fallback, artifact ordering and error report output MUST have deterministic proof.
- **FR-009**: (NS-4, NS-10) CLI MUST use `artifacts[].outputKey` as the only artifact key namespace across CommandResult, report, repair hints and DVTools selection manifest.
- **FR-010**: (NS-8) Pre-control-plane failure MUST stop at transport gate and MUST NOT enter `nextRecommendedStage` or create a fourth runtime stage.
- **FR-011**: (NS-4, NS-8) CLI MUST consume canonical evidence package and optional selection manifest without creating CLI-specific evidence envelope, report shape, finding truth or session truth.
- **FR-012**: (NS-8, NS-10) `logix compare` MUST route before/after report refs and admissible evidence refs to core compare truth without implementing CLI-owned comparison logic.
- **FR-013**: (NS-8) CLI proof packs MUST cover before report, repair edit, exact rerun, after report and compare closure for Program assembly, source/declaration and dependency failure families.
- **FR-014**: (NS-4, KF-9) CLI schema artifacts and user-facing skill/docs MUST describe only the Agent First `check / trial / compare` route and must not expose old toolbox commands.

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: (NS-10) `--help`, schema discovery and pre-control-plane validation MUST avoid loading heavy runtime execution paths unless command execution requires them.
- **NFR-002**: (NS-10) CLI transport output MUST be slim, deterministic and stable for machine consumption.
- **NFR-003**: (NS-8, NS-10) Same normalized input MUST produce stable verdict, errorCode, artifact keys, digest and next stage, ignoring only allowed runId/path/outDir differences.
- **NFR-004**: (NS-8) Implementation MUST remain forward-only with no old command compatibility, dual output path or deprecation period.
- **NFR-005**: (NS-4, KF-9) SSoT, spec, schema guard, CLI integration tests and skills MUST use the same CLI surface and transport vocabulary.

### Key Entities

- **CommandResult**: CLI stdout transport envelope. It references reports and artifacts but does not own machine truth.
- **Input Coordinate**: Rerun and upgrade coordinate containing Program entry, evidence refs, selection manifest refs, compare refs, mode and argv snapshot as applicable.
- **Primary Report Output Key**: The artifact outputKey pointing to the primary `VerificationControlPlaneReport`.
- **Source Artifact**: CLI-produced provenance/ref/digest object consumed by `runtime.check` without becoming declaration truth.
- **Selection Manifest**: DVTools-selected session/finding hint consumed by CLI without becoming evidence truth.
- **Transport Gate Failure**: CLI pre-control-plane failure that stops before runtime stage scheduling.
- **Closure Proof Pack**: before report, repair edit, exact rerun, after report and compare result for a failure family.

## Success Criteria

### Measurable Outcomes

- **SC-001**: (NS-8) CLI help, schema and parser expose only `check / trial / compare`.
- **SC-002**: (NS-10) `CommandResult` contract tests prove primaryReportOutputKey, artifact ordering, truncation metadata, file fallback and error result stability.
- **SC-003**: (NS-8, NS-10) Exact rerun tests prove `inputCoordinate` can rerun the same check/trial input with stable machine fields.
- **SC-004**: (NS-4) Source artifact tests prove CLI-produced source provenance enters `runtime.check` without assigning declaration truth to CLI.
- **SC-005**: (NS-4, NS-8) DVTools roundtrip tests prove selection manifest artifact keys align with `artifacts[].outputKey` and report focus/artifact can guide Agent repair.
- **SC-006**: (NS-8) Compare command tests prove before/after report refs route to core compare and return admissibility results when inputs are not comparable.
- **SC-007**: (NS-8, KF-8) At least three e2e closure proof packs cover Program assembly, source/declaration and dependency failure families.
- **SC-008**: (NS-4, KF-9) `docs/ssot/runtime/15`, `14`, `16`, this spec and the Logix CLI skill all cross-link without reviving old toolbox commands.

## Clarifications

### Session 2026-04-27

- Q: 这份 spec 是否新增 CLI 命令？ A: 不新增，public command surface 仍只有 `check / trial / compare`。
- Q: CLI 是否拥有 report、declaration 或 compare truth？ A: 不拥有，只做 transport、route、artifact 和 rerun coordinate。
- Q: DVTools selection manifest 是否能改变 evidence truth？ A: 不能，它只作 CLI / Agent entry hint。
