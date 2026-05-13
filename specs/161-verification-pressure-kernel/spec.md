# Feature Specification: Verification Pressure Kernel

**Feature Branch**: `161-verification-pressure-kernel`  
**Created**: 2026-04-27  
**Status**: Done  
**Input**: User description: "把 Agent 自验证压力矩阵压出的 logix-core/runtime control-plane 内核需求转成独立 spec：Runtime.check static pressure、typed dependency cause IR、focus coordinate、boot close dual summary、compare admissibility digest、PASS semantics、repeatability normalizer。"

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-8, NS-10
- **Kill Features (KF)**: KF-3, KF-4, KF-8, KF-9

## Current Role

本页是 Agent 自验证压力矩阵压出的 `logix-core` / runtime control-plane 内核需求 spec。

| 文件 | 角色 | 不负责 |
| --- | --- | --- |
| [../../docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md](../../docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md) | 终局 pressure index、gap tags、proof axes | schema、stage、实现计划 |
| [../../docs/ssot/runtime/09-verification-control-plane.md](../../docs/ssot/runtime/09-verification-control-plane.md) | stage、report、compare、focusRef、nextRecommendedStage authority | CLI transport |
| 本页 | core/kernel 的可实施需求、验收场景、closure gate | CLI 命令、stdout envelope、DVTools UI |
| [../160-cli-agent-first-control-plane-cutover/spec.md](../160-cli-agent-first-control-plane-cutover/spec.md) | 已实施的 CLI mainline cutover | 本轮新增 pressure closure |
| [../162-cli-verification-transport/spec.md](../162-cli-verification-transport/spec.md) | CLI transport 与 roundtrip proof | core/kernel truth |

本页不以当前实现为边界。已有 check/trial/compare 的内部 shape、error text、parser、test name 都可以为了终局压力表达被推翻。

## Context

`159` 与 `160` 已经把 DVTools 与 CLI 收敛到 Agent First control-plane 主链。随后 `runtime/16` 从 failure catalog 压成 invariant-first pressure matrix，暴露出真正决定闭环质量的内核缺口：

- `Runtime.check` 需要能在不启动 runtime 的前提下表达 static pressure。
- dependency failure 需要结构化 cause，而不能让 Agent 解析自由文本。
- repair target 需要稳定 focus coordinate，而不能依赖错误文案。
- boot failure 与 close failure 需要双摘要，避免互相覆盖。
- compare 需要 admissibility digest，避免把不可比报告误判为修复失败。
- PASS 需要明确只覆盖当前 stage。
- repeatability 需要可说明哪些字段允许变化，哪些字段必须稳定。

这份 spec 把这些 pressure 转成 core/kernel 的实施 contract。CLI 和 DVTools 可以承接闭环，但不能拥有这些判断 truth。

## Scope

### In Scope

- `runtime.check` 的 static pressure 表达能力
- `runtime.trial(mode="startup")` 的 dependency localization 与 lifecycle proof
- `runtime.compare` 的 admissibility 判断
- `VerificationControlPlaneReport` 中与 static pressure、dependency cause、focusRef、PASS、nextRecommendedStage、artifact linking、repeatability 相关的内核语义
- `Program.capabilities.services / imports` 进入验证控制面的结构化压力
- core contract tests 与 proof pack
- `docs/ssot/runtime/09`、`04`、`16` 的需求引用回写

### Out of Scope

- CLI command surface、stdout envelope、inputCoordinate 与 artifact file writer
- DVTools session UI、selection manifest exact schema 与 workbench layout
- Chrome DevTools 宿主迁移
- scenario executor 成功路径
- host deep trial 成功路径
- raw trace compare、replay 或默认重门禁
- public authoring API 新增或兼容层

## Imported Authority

- [../../docs/ssot/runtime/09-verification-control-plane.md](../../docs/ssot/runtime/09-verification-control-plane.md)
- [../../docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md](../../docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md)
- [../../docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md](../../docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md)
- [../../docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)
- [../../docs/adr/2026-04-05-ai-native-runtime-first-charter.md](../../docs/adr/2026-04-05-ai-native-runtime-first-charter.md)
- [../../docs/standards/logix-api-next-guardrails.md](../../docs/standards/logix-api-next-guardrails.md)
- [../132-verification-proof-kernel/spec.md](../132-verification-proof-kernel/spec.md)
- [../141-runtime-control-plane-report-shell-cutover/spec.md](../141-runtime-control-plane-report-shell-cutover/spec.md)

## Closure & Guardrails

### Closure Contract

`161` 关闭时，core/kernel 必须让 Agent 在默认门禁内完成下列判断：

- 静态装配缺陷在 `runtime.check` 阶段结构化暴露，且不启动 runtime。
- 启动装配缺陷在 `runtime.trial(mode="startup")` 阶段结构化定位到 dependency cause。
- report 能给出可调度的 `PASS / FAIL / INCONCLUSIVE`、唯一 `nextRecommendedStage` 与稳定 repair target。
- before/after report 能进入 compare admissibility 判断。
- 重复运行时，除明确可忽略字段外，机器结论与关键坐标稳定。

### Must Cut

- 自由文本 error parsing 作为 Agent repair 主路径
- import-time throw 作为终局覆盖证明
- `CommandResult.error` 升格为 machine report truth
- CLI 或 DVTools 拥有 dependency truth、declaration truth 或 compare truth
- 为装配检测新增 public authoring API
- 为了当前实现保留 Module entry fallback、旧 report shape、兼容壳层
- 默认门禁常开 scenario、host deep、raw trace 或 replay

### Reopen Bar

只有下面证据允许重开本页：

- `runtime.check / runtime.trial / runtime.compare` 三段主干无法表达 Agent 默认自验证闭环
- `VerificationControlPlaneReport` 无法承接必要 machine repair target
- Program-only imports 不能表达终局装配关系
- 真实 Agent 场景证明 typed dependency cause 仍不足以定位 repair target
- compare admissibility digest 无法区分不可比报告与修复失败

## User Scenarios & Testing

### User Story 1 - Agent 在 check 阶段发现静态装配缺陷 (Priority: P1)

作为日常 AI coding 的 Agent，我需要在不启动 runtime 的情况下发现 Program blueprint、Program-only imports、duplicate imports、declaration freshness 与 sourceRef 相关缺陷，这样我可以先修结构问题，再进入启动试运行。

**Traceability**: NS-3, NS-8, KF-3

**Why this priority**: 静态缺陷如果只能在启动或 import-time 暴露，Agent 会把结构问题和运行问题混在一起，闭环成本上升。

**Independent Test**: 构造 Program-only imports 漏装配、duplicate import、missing blueprint 与 stale declaration 的 fixtures，仅运行 `runtime.check`，报告必须给出结构化 pressure，且证明未启动 runtime。

**Acceptance Scenarios**:

1. **Given** Program 缺少有效 blueprint，**When** Agent 运行 `runtime.check`，**Then** report 返回 `FAIL`，包含 static pressure 与稳定 focusRef，且没有 startup evidence。
2. **Given** Program imports 中存在 duplicate import，**When** Agent 运行 `runtime.check`，**Then** report 明确指出 duplicate import pressure，且不要求进入 `runtime.trial` 才能发现。
3. **Given** source artifact 的 declaration digest 与 Program declaration 不一致，**When** Agent 运行 `runtime.check`，**Then** report 返回 declaration freshness pressure，并把 source artifact 只当 provenance。

---

### User Story 2 - Agent 在 startup trial 阶段定位依赖漏装配 (Priority: P1)

作为 Agent，我需要在启动试运行失败时直接知道缺的是 service、config、Program import、child dependency、phase 还是 provider source，而不需要解析错误文案。

**Traceability**: NS-3, NS-8, NS-10, KF-3, KF-8

**Why this priority**: 依赖漏注入、imports 漏装配和配置缺失是日常自验证最常见闭环入口。

**Independent Test**: 构造 missing service、missing config、missing Program import、imported child dependency 缺失和 provider source 冲突的 fixtures，只运行 `runtime.trial(mode="startup")`，检查 report 的 dependency cause IR 与 repairHints。

**Acceptance Scenarios**:

1. **Given** Program 漏注入 service，**When** Agent 运行 startup trial，**Then** report 包含 dependency cause kind、phase、owner coordinate 与 provider source pressure。
2. **Given** imported child Program 内部缺少依赖，**When** Agent 运行 startup trial，**Then** report 能区分 parent import slot 与 child dependency 缺陷。
3. **Given** config 缺失或 invalid，**When** Agent 运行 startup trial，**Then** report 区分 missing config 与 invalid config pressure。

---

### User Story 3 - Agent 得到可修复、可比较、可重跑的 report (Priority: P2)

作为 Agent，我需要每次 check/trial/compare 返回的 report 都能告诉我当前 stage 覆盖范围、下一步唯一建议、repair target 坐标和是否可比较，这样我可以执行 repair edit 后精确重跑。

**Traceability**: NS-4, NS-8, NS-10, KF-4, KF-9

**Why this priority**: 单点失败能被发现不代表闭环成立。Agent 需要 before report、repair target、after report 与 compare closure 形成一条可调度链路。

**Independent Test**: 使用 Program 装配缺陷、source 缺陷和 dependency 缺陷各一条 proof pack，完成 before -> repair -> rerun -> compare closure。

**Acceptance Scenarios**:

1. **Given** `runtime.check` 返回 PASS，**When** Agent 读取 report，**Then** PASS 明确只覆盖当前 check stage，不暗示 startup、scenario 或 host deep 已通过。
2. **Given** 多个 repair hint 指向不同升级层，**When** Agent 读取 report，**Then** top-level `nextRecommendedStage` 是唯一调度权威，或 report 返回 `INCONCLUSIVE` 并给出唯一升级入口。
3. **Given** before/after reports 的 declaration digest 不一致，**When** Agent 运行 compare，**Then** compare 返回 admissibility result，而非把不可比报告当作修复失败。

### Edge Cases

- `runtime.check` 发现 precondition failure 时不能偷跑 startup 证明。
- import-time throw 只能作为未覆盖或低质量证据，不能替代 control-plane report。
- close failure 与 boot failure 同时存在时，boot primary failure 不能被 close failure 覆盖。
- 没有局部 repair target 的 global failure 可以没有 focusRef，但必须给出 stage、summary 与唯一升级建议。
- provider source 可区分 Program capabilities、runtime overlay 与 future host layer，但 CLI v1 不因此新增 raw provider overlay public input。
- repeatability normalizer 只允许忽略 `runId` 与允许的 file path/outDir 差异。
- scenario executor 与 host deep trial 只保留 promotion pressure，不成为本 spec 的成功路径。

## Requirements

### Functional Requirements

- **FR-001**: (NS-3, NS-8) `Runtime.check` MUST express static pressure for Program blueprint guard, Program-only imports, duplicate imports, declaration freshness, sourceRef link and PASS coverage boundary without starting runtime.
- **FR-002**: (NS-3) Program imports validation MUST treat public `Program.capabilities.imports` as Program-only and MUST reject Module, Logic, fake Program, invalid import and duplicate import through structured pressure.
- **FR-003**: (NS-4) Source, package and typecheck producers MUST only enter `runtime.check` as derived source artifacts with locator/ref/digest; `runtime.check` MUST remain the declaration gate owner.
- **FR-004**: (NS-8, NS-10) `runtime.trial(mode="startup")` MUST emit typed dependency cause pressure for service, config, Program import, child dependency, phase, provider source and owner coordinate.
- **FR-005**: (NS-10) Dependency localization MUST NOT require Agent to parse free-text error messages for machine repair decisions.
- **FR-006**: (NS-4, NS-10) `repairHints.focusRef` MUST only project stable coordinates such as declaration slice, scenario step, sourceRef and reason slot; it MUST NOT embed domain payload.
- **FR-007**: (NS-10) Lifecycle proof MUST preserve boot/close dual summary and expose close failure through artifact-backed linking or report summary pressure without swallowing primary boot failure.
- **FR-008**: (NS-4, NS-10) `runtime.compare` MUST gate comparison through declaration digest, scenario plan digest, evidence summary digest and environment fingerprint admissibility.
- **FR-009**: (NS-3, NS-8) PASS MUST only mean the current stage coverage passed; reports MUST NOT imply future scenario, host deep, raw trace or replay layers passed when they did not run.
- **FR-010**: (NS-8) When `nextRecommendedStage` is non-empty, it MUST be the single top-level scheduling authority for the next Agent command.
- **FR-011**: (NS-10) Repeatability proof MUST define ignored fields narrowly and MUST keep verdict, errorCode, artifact keys, digest and next stage stable for the same normalized input.
- **FR-012**: (NS-8, NS-10) Core contract tests MUST include at least one before -> repair -> rerun -> compare closure proof pack for Program assembly, source/declaration and dependency failure families.
- **FR-013**: (NS-3, NS-8) This spec MUST NOT introduce new public authoring API, new report truth, new evidence truth, CLI-owned dependency truth or DVTools-owned verification truth.

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: (NS-10, KF-8) Static pressure collection MUST keep `runtime.check` cheap and MUST provide evidence that it does not boot runtime.
- **NFR-002**: (NS-10) Report payloads MUST remain slim, serializable and stable enough for artifact-backed comparison.
- **NFR-003**: (NS-10) Diagnostic identifiers in report, focusRef and artifact links MUST be deterministic; random or time-derived ids are disallowed for machine repair coordinates.
- **NFR-004**: (NS-8, NS-10) Implementation MUST keep `Runtime.trial` on the existing proof-kernel route and MUST NOT create a second startup execution kernel.
- **NFR-005**: (NS-8) Breaking internal contract changes MUST follow forward-only execution with no compatibility layer, deprecation period or old shape preservation.
- **NFR-006**: (NS-4, KF-9) SSoT, spec, contract tests and proof refs MUST use the same owner boundary: `16` as pressure index, `09/04` as core authority, `15` as CLI transport authority.

### Key Entities

- **Static Pressure**: A machine-readable check-stage failure or PASS boundary that does not require runtime startup.
- **Derived Source Artifact**: Source/package/typecheck provenance with locator/ref/digest, consumed by `runtime.check` without becoming declaration truth.
- **Dependency Cause IR**: Structured dependency failure cause containing kind, phase, provider source, owner coordinate and optional child identity pressure.
- **Focus Coordinate**: Stable machine repair coordinate projected through `repairHints.focusRef`.
- **Lifecycle Dual Summary**: Report-level representation that preserves boot primary failure and close summary together.
- **Compare Admissibility Digest**: Digest group used to decide whether before/after reports are comparable.
- **Repeatability Normalizer**: Rule set that defines allowed variation and required stable machine fields across reruns.

## Success Criteria

### Measurable Outcomes

- **SC-001**: (NS-3, NS-8) Targeted `runtime.check` contract tests prove blueprint, Program-only imports, duplicate imports and declaration freshness failures are reported without runtime startup.
- **SC-002**: (NS-8, NS-10) Startup trial contract tests prove missing service, missing config, missing Program import and imported child dependency produce typed dependency cause pressure.
- **SC-003**: (NS-10) Lifecycle tests prove boot/close dual summary keeps primary boot failure and close summary visible with artifact-backed linking.
- **SC-004**: (NS-4, NS-10) Compare tests prove declaration, scenario plan, evidence summary or environment mismatch returns admissibility result.
- **SC-005**: (NS-8) PASS semantics tests prove current-stage PASS does not imply scenario, host deep, raw trace or replay coverage.
- **SC-006**: (NS-10) Repeatability tests prove the same normalized input keeps verdict, errorCode, artifact keys, digest and next stage stable, ignoring only allowed runId/path/outDir variance.
- **SC-007**: (NS-8, KF-9) At least three proof packs cover before -> repair -> exact rerun -> compare closure for Program assembly, source/declaration and dependency failure families.
- **SC-008**: (NS-4, KF-9) `docs/ssot/runtime/09`, `04`, `16` and this spec cross-link consistently and do not assign core truth to CLI or DVTools.

## Clarifications

### Session 2026-04-27

- Q: 这份 spec 是否包含 CLI transport？ A: 不包含。CLI transport、stdout envelope、inputCoordinate 和 DVTools roundtrip 进入 `162`。
- Q: 这份 spec 是否让 scenario executor 成为当前成功路径？ A: 不。scenario executor 与 host deep trial 只保留 future promotion pressure。
- Q: 这份 spec 是否允许为了检测漏装配新增公开 authoring API？ A: 不允许。检测能力进入 runtime control plane，不反向扩公开 authoring surface。
