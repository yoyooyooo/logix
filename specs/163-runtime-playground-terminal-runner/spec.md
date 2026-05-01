# Feature Specification: Runtime Playground Terminal Runner

**Feature Branch**: `163-runtime-playground-terminal-runner`  
**Created**: 2026-04-27  
**Status**: Done  
**Input**: User description: "Runtime playground terminal runner for non-UI Logix Program examples: docs can run examples for JSON results and optionally run check/trial diagnostics without introducing Runtime.playground or a public sandbox playground contract."

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-8, NS-10
- **Kill Features (KF)**: KF-3, KF-4, KF-8, KF-9

## Current Role

本页是 runtime playground terminal runner 的实施规格。它把已审过的终局提案收敛成可规划需求：

| 文件 | 角色 | 不负责 |
| --- | --- | --- |
| [../../docs/next/logix-api-planning/runtime-playground-terminal-proposal.md](../../docs/next/logix-api-planning/runtime-playground-terminal-proposal.md) | 终局方向、review 共识、命名裁决 | 任务拆分 |
| [../../docs/review-plan/runs/2026-04-27-runtime-playground-terminal-plan-optimality-loop.md](../../docs/review-plan/runs/2026-04-27-runtime-playground-terminal-plan-optimality-loop.md) | plan-optimality-loop ledger 与 adopted freeze record | 实现验收 |
| [../../docs/ssot/runtime/09-verification-control-plane.md](../../docs/ssot/runtime/09-verification-control-plane.md) | verification stage、report shell、`Runtime.check/trial` authority | docs Run projection |
| [../../docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md) | CLI `check / trial / compare` route authority | browser docs runner |
| [../../docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md](../../docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md) | Agent verification pressure matrix | docs UI surface |
| 本页 | docs runner requirements, `Runtime.run` naming cutover, browser non-UI Program Run proof, Run/Trial shape separation | UI host deep trial, scenario executor, public sandbox product API |

本页不把当前实现状态当边界。`Runtime.runProgram` 是当前 implementation evidence；终局 docs-facing runtime result face 固定为 `Runtime.run(Program, main, options)`。

## Context

Logix 已经有两类运行能力：

- diagnostic face: `Runtime.check(Program)` / `Runtime.trial(Program)`，返回 `VerificationControlPlaneReport`
- result face: 当前实现名 `Runtime.runProgram(Program, main, options)`，能启动 Program 并返回 `main(ctx,args)` 的业务结果

用户文档需要类似 CodeSandbox 的体验：展示源码、运行非 UI 示例并得到结果，同时允许按需查看 Check/Trial 诊断报告。当前 sandbox 仍能 compile/run browser worker code，但协议和示例心智停留在旧形态。需要用 forward-only 方式收口：

- 不新增 `Runtime.playground`
- 不新增公开 sandbox playground contract
- 不让 `trial` 承接业务结果
- 不让 docs Run projection 变成第二 report truth
- 不把 raw Effect 示例伪装成 Logix Program verification 示例

## Scope

### In Scope

- `Runtime.run(Program, main, options)` 作为终局 result face 命名
- 当前 `Runtime.runProgram` 的重命名、替换或内收要求
- docs app-local runner convention：`export const Program` + `export const main`
- browser worker 中非 UI Program Run 的 JSON projection
- 同一 docs source 上 Run 与 Trial 的 shape separation
- browser worker 中 `Runtime.trial` 需要的显式 proof-kernel Scope 绑定
- Run timeout、close timeout、worker lifecycle、serialization、result/log budget guard
- Check/Trial on-demand diagnostics for Program examples
- raw Effect smoke examples exclusion from Trial
- sandbox public surface guard: no public `PlaygroundRunResult`, no public worker action family, no sandbox-owned report
- docs/source/run/report proof packs and contract tests

### Out of Scope

- UI host deep trial
- React provider verification
- `Runtime.trial(mode="scenario")` success path
- public `Runtime.playground`
- public sandbox playground API
- raw trace compare
- DVTools UI
- CLI transport changes owned by spec `162`
- core/kernel pressure improvements owned by spec `161`，但为支撑 browser worker Trial 所需的最小 proof-kernel Scope 绑定属于本页实施发现
- Program imports and mocked HTTP beyond baseline proof; these require follow-up proof before enabling as first-class docs examples

## Imported Authority

- [../../docs/next/logix-api-planning/runtime-playground-terminal-proposal.md](../../docs/next/logix-api-planning/runtime-playground-terminal-proposal.md)
- [../../docs/review-plan/runs/2026-04-27-runtime-playground-terminal-plan-optimality-loop.md](../../docs/review-plan/runs/2026-04-27-runtime-playground-terminal-plan-optimality-loop.md)
- [../../docs/ssot/runtime/01-public-api-spine.md](../../docs/ssot/runtime/01-public-api-spine.md)
- [../../docs/ssot/runtime/07-standardized-scenario-patterns.md](../../docs/ssot/runtime/07-standardized-scenario-patterns.md)
- [../../docs/ssot/runtime/09-verification-control-plane.md](../../docs/ssot/runtime/09-verification-control-plane.md)
- [../../docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)
- [../../docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md](../../docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md)
- [../161-verification-pressure-kernel/spec.md](../161-verification-pressure-kernel/spec.md)
- [../162-cli-verification-transport/spec.md](../162-cli-verification-transport/spec.md)

## Closure & Guardrails

### Closure Contract

`163` 关闭时，docs runtime playground 必须满足：

```text
docs source
  -> Source view
  -> Run non-UI Program example
  -> JSON-safe result projection
  -> optional Check/Trial diagnostic report
```

闭环要求：

- Program 是 Check/Trial 的唯一 Logix verification entry。
- `main` 只属于 docs app-local runner convention。
- `Runtime.run` 是 result face 命名，`Runtime.trial` 是 diagnostic face 命名，`Runtime.check` 是 static face 命名。
- Run projection 不能通过 `ControlPlane.isVerificationControlPlaneReport`。
- Trial output 必须通过 `ControlPlane.isVerificationControlPlaneReport`。
- sandbox public root 不新增 playground API。
- raw Effect smoke examples 不能触发 Trial。
- failure and budget guards 有可运行 proof。

### Must Cut

- `Runtime.playground`
- `Runtime.trial` 作为 example result runner
- `Runtime.runProgram` 作为 docs-facing terminal name
- public `PlaygroundRunResult`
- public worker action family such as `RUN_EXAMPLE / RUNTIME_CHECK / RUNTIME_TRIAL`
- sandbox-owned report shape
- raw Effect example with Trial panel
- UI host trial as v1 blocker
- compatibility alias kept only for imagined users

### Reopen Bar

只有下面证据允许重开本页：

- `Runtime.run / Runtime.trial / Runtime.check` 无法表达 result、diagnostic、static 三面
- docs app-local runner 无法在 browser worker 中稳定返回 JSON projection
- Run projection 与 Trial report 无法可靠隔离
- non-UI Program examples 无法提供足够 docs demo value
- public sandbox API 经过 dominance proof 明显优于 app-local adapter，且不引入第二 report truth
- UI host trial owner 已落地，并能作为后续升级而不污染 v1

## User Scenarios & Testing

### User Story 1 - 文档读者运行非 UI Program 示例并看到结果 (Priority: P1)

作为文档读者，我需要在文档页面运行一个非 UI Logix Program 示例，并看到稳定、简短、可理解的 JSON 结果，这样我能理解源码行为而不用离开文档。

**Traceability**: NS-3, NS-4, NS-8, KF-3, KF-4

**Why this priority**: 这是 docs playground 的最小价值。没有 Run 结果，源码展示无法证明 Logix 的运行时行为。

**Independent Test**: 使用一个导出 `Program` 与 `main` 的 docs source，在 browser worker 中执行 Run，验证结果 JSON-safe、runId 稳定、duration 存在、无 report 字段。

**Acceptance Scenarios**:

1. **Given** 一个非 UI Logix Program example，**When** 文档读者点击 Run，**Then** 页面显示 JSON-safe result、runId、duration 和成功状态。
2. **Given** 同一个 example 指定稳定 runId，**When** 连续运行两次，**Then** 除 duration 外的主要展示结果稳定。
3. **Given** example 返回非 JSON-safe 值，**When** 文档读者点击 Run，**Then** 页面显示 serialization failure，而不是抛出不可解释错误或伪造 Trial report。

---

### User Story 2 - 文档读者按需查看 Check/Trial 诊断 (Priority: P1)

作为文档读者或 Agent，我需要对同一份 Program source 按需运行 Check/Trial，并看到 compact diagnostic summary 与完整 `VerificationControlPlaneReport`，这样可以把 demo 与自我验证闭环连接起来。

**Traceability**: NS-4, NS-8, NS-10, KF-4, KF-8

**Why this priority**: Run 只解释结果，不解释装配与依赖问题。Check/Trial 是 Agent repair 与 docs 诊断的 machine truth。

**Independent Test**: 对同一 docs source 执行 Run 与 Trial，断言 Run projection 不是 report，Trial output 是 `VerificationControlPlaneReport`。

**Acceptance Scenarios**:

1. **Given** 一个 Logix Program example，**When** 用户触发 Trial，**Then** 输出通过 `ControlPlane.isVerificationControlPlaneReport`，且 `stage="trial"`、`mode="startup"`。
2. **Given** 用户只打开文档默认视图，**When** 页面首次呈现 example，**Then** 默认只展示 Source + Run，不默认展开完整 Trial report。
3. **Given** Trial 失败，**When** 用户查看完整报告，**Then** report 保留 `verdict / errorCode / repairHints / nextRecommendedStage`，Run projection 不承接这些字段。

---

### User Story 3 - 维护者完成 runtime result-face 命名 cutover (Priority: P1)

作为 Logix 维护者，我需要把 docs-facing result face 命名收敛为 `Runtime.run`，并处理当前 `Runtime.runProgram`，这样 `Runtime.run / Runtime.trial / Runtime.check` 能形成一致的 session 心智。

**Traceability**: NS-8, NS-10, KF-8

**Why this priority**: 名字不收口会让 docs runner、trial 诊断和 runtime 执行继续分裂。

**Independent Test**: public runtime surface、docs examples 和 package exports 使用 `Runtime.run`；`Runtime.runProgram` 要么不存在于 public docs-facing surface，要么被证明 internal-only。

**Acceptance Scenarios**:

1. **Given** docs example 需要运行 Program，**When** 它引用 runtime result face，**Then** 使用 `Runtime.run(Program, main, options)`。
2. **Given** 代码库仍存在 `Runtime.runProgram`，**When** 执行 public surface guard，**Then** 该名称被标记为 internal-only implementation source 或被完全替换。
3. **Given** 用户查看 runtime API 文档，**When** 阅读运行相关 API，**Then** 能看到 `check / trial / run` 的 static、diagnostic、result 三面关系。

---

### User Story 4 - sandbox public surface 保持窄边界 (Priority: P2)

作为维护者，我需要 docs runner 使用 app-local adapter，而不扩张 `@logixjs/sandbox` public API，这样 browser playground 不会长成第二套 runtime/report 产品。

**Traceability**: NS-4, NS-8, KF-4, KF-9

**Why this priority**: sandbox 是 transport，不是 report authority。public surface 扩张会制造第二系统。

**Independent Test**: root export guard 仍只允许 `SandboxClientTag / SandboxClientLayer`，`@logixjs/sandbox/vite` 仍为唯一 public subpath；Run projection 不作为 sandbox public type 导出。

**Acceptance Scenarios**:

1. **Given** package consumer imports `@logixjs/sandbox`，**When** 检查 root exports，**Then** 只能看到允许的 root symbols。
2. **Given** docs runner 需要区分 Run/Check/Trial intent，**When** 查看 public sandbox API，**Then** 不出现 public worker action family 或 public playground result contract。
3. **Given** Trial report 由 browser worker 返回，**When** 解析输出，**Then** report shape 来自 core `ControlPlane`，不是 sandbox-owned schema。

### Edge Cases

- Run timeout 必须返回 docs transport failure，不得伪造 `VerificationControlPlaneReport`。
- close timeout 必须可见，Run 侧为 transport failure，Trial 侧由 control-plane report 承接。
- result 超预算必须拒绝或截断并标记 `truncated=true`。
- logs 超预算不得污染 primary Run projection。
- raw Effect smoke source 不能触发 Check/Trial。
- `main` 返回需要 Effect 环境时，错误必须归入 Run transport failure或由 Trial 诊断表达，不得混用字段。
- Program imports、mocked HTTP、UI host semantics 默认不进入 v1，除非对应 proof 先落地。
- current worker `stateSnapshot` 不能成为终局 docs contract。

## Requirements

### Functional Requirements

- **FR-001**: (NS-8) System MUST expose terminal runtime result-face naming as `Runtime.run(Program, main, options)`.
- **FR-002**: (NS-8, NS-10) System MUST treat current `Runtime.runProgram` as implementation evidence to be renamed, replaced, or kept internal; it MUST NOT remain the docs-facing terminal name.
- **FR-003**: (NS-8) System MUST keep `Runtime.trial(Program, options)` diagnostic-only and MUST return `VerificationControlPlaneReport` for Trial.
- **FR-004**: (NS-8) System MUST keep `Runtime.check(Program, options?)` as the static diagnostic face.
- **FR-005**: (NS-3, NS-8) Docs runner MUST support Logix Program examples using exactly `export const Program` plus app-local `export const main`.
- **FR-006**: (NS-8, KF-8) `main` MUST remain a docs app-local runner convention and MUST NOT become a core, CLI, Runtime facade, or public sandbox entry kind.
- **FR-007**: (NS-4, NS-8) Run output MUST be an app-local JSON projection and MUST NOT introduce a named public `PlaygroundRunResult`.
- **FR-008**: (NS-4, NS-8) Run projection MUST NOT contain `stage`, `mode`, `verdict`, `repairHints`, `focusRef`, `nextRecommendedStage`, or compare admissibility fields.
- **FR-009**: (NS-4, NS-8) Trial output MUST pass `ControlPlane.isVerificationControlPlaneReport` and MUST NOT include docs-only `result`, `durationMs`, or `truncated` fields.
- **FR-010**: (NS-4, KF-9) `@logixjs/sandbox` public root MUST remain limited to `SandboxClientTag / SandboxClientLayer`, with `@logixjs/sandbox/vite` as the public Vite helper.
- **FR-011**: (NS-4, KF-9) System MUST NOT export public sandbox worker action families or a sandbox-owned report schema for playground execution.
- **FR-012**: (NS-3, NS-4) Docs page default for runnable Program examples MUST be Source + Run, with Check/Trial as on-demand diagnostics.
- **FR-013**: (NS-4, NS-8) Raw Effect smoke examples MAY support Run but MUST NOT show Check/Trial or produce control-plane reports.
- **FR-014**: (NS-10) Run failures MUST distinguish compile, timeout, serialization, worker lifecycle, and runtime result failures as docs transport failures.
- **FR-015**: (NS-10) Run must enforce timeout, close timeout, worker lifecycle, JSON serialization, result size, and log size budgets.
- **FR-016**: (NS-8, NS-10) Same-source Run and Trial proof MUST demonstrate that Run result and Trial report are shape-separated and cannot be confused by Agent or docs code.

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: (NS-10) Run projection MUST remain slim and bounded by explicit size budgets.
- **NFR-002**: (NS-10) Trial/Check diagnostics MUST reuse core `VerificationControlPlaneReport` without sandbox- or docs-owned diagnostic schema.
- **NFR-003**: (NS-8, NS-10) Run with a supplied runId MUST produce stable user-visible output fields except allowed timing differences.
- **NFR-004**: (NS-8) The implementation MUST be forward-only: no compatibility alias or deprecation period for imagined users.
- **NFR-005**: (NS-4, KF-9) Docs examples, spec, SSoT, tests, and package export guards MUST use the same vocabulary: `Runtime.run / Runtime.trial / Runtime.check`, Run projection, `VerificationControlPlaneReport`.
- **NFR-006**: (NS-10) Browser worker execution MUST not rely on process-global mutable truth for report or runner authority.

### Key Entities

- **Runtime Run Face**: The terminal result-facing runtime entry `Runtime.run(Program, main, options)`.
- **Runtime Trial Face**: The diagnostic startup verification entry `Runtime.trial(Program, options)`.
- **Runtime Check Face**: The static verification entry `Runtime.check(Program, options?)`.
- **Docs Runner Adapter**: App-local wrapper that reads docs source, extracts `Program` and `main`, and invokes Run/Check/Trial.
- **Run Projection**: Small JSON-safe app-local display object for example output; it is not a machine diagnostic report.
- **VerificationControlPlaneReport**: Core-owned machine diagnostic report returned by Check/Trial.
- **Program Example Source**: Docs source exporting `Program` and `main`.
- **Effect Smoke Source**: Internal or docs-adjacent source that runs an Effect result only and cannot show Trial.

## Success Criteria

### Measurable Outcomes

- **SC-001**: (NS-8) Runtime public surface and docs-facing examples use `Runtime.run / Runtime.trial / Runtime.check` as the session face vocabulary.
- **SC-002**: (NS-8) Public surface guard proves `Runtime.runProgram` is renamed, removed from docs-facing surface, or explicitly internal-only.
- **SC-003**: (NS-3, NS-4) Browser proof runs a non-UI Program example and returns JSON-safe Run projection with stable supplied runId.
- **SC-004**: (NS-8, NS-10) Same-source Trial proof returns a valid `VerificationControlPlaneReport` for the same Program.
- **SC-005**: (NS-4, NS-8) Shape separation tests prove Run projection fails `isVerificationControlPlaneReport` and Trial output passes it.
- **SC-006**: (NS-10) Failure guard tests cover run timeout, close timeout, serialization failure, result budget overflow, and log budget overflow.
- **SC-007**: (NS-4, KF-9) Sandbox root export guard still passes with no public playground result type or worker action family.
- **SC-008**: (NS-4, NS-8) Docs UI proof or snapshot shows Program examples default to Source + Run, while Check/Trial are on-demand.
- **SC-009**: (NS-8) Raw Effect smoke proof shows Run may work, but Trial cannot be triggered and no control-plane report is produced.

## Clarifications

### Session 2026-04-27

- Q: Is `Runtime.runProgram` the final docs-facing API? A: No. The terminal name is `Runtime.run`; `Runtime.runProgram` is current implementation evidence to rename, replace, or internalize.
- Q: Does this spec create `Runtime.playground`? A: No. V1 composes `Runtime.run`, `Runtime.check`, and `Runtime.trial`.
- Q: Does sandbox expose a public playground contract? A: No. The runner projection is app-local to docs.
