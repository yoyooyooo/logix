# Feature Specification: Kernel-to-Playground Verification Parity

**Feature Branch**: `168-kernel-to-playground-verification-parity`  
**Created**: 2026-04-30  
**Status**: Draft  
**Input**: User description: "面向终局，从内核往外全链路梳理后续方向，新建 spec；暂时待定细节写入 discussion.md，后续走 plan-optimality-loop 打磨。"

## Current Role

本页是 160 / 162 / 165 / 166 / 167 之后的终局收口 spec。它冻结一条横向压力目标：

```text
core verification / reflection authority
  -> CLI transport and artifact route
    -> Runtime Workbench projection
      -> Playground runtime bridge
        -> Playground UI and curated demos
```

168 不重开 public authoring surface，不替代 Runtime control plane、CLI、Workbench Kernel、Playground product workbench 或 Reflection Manifest 的 owner。它也不充当售后式适配层。若已有实现、166 已完成项、167 已完成项或当前 Playground 行为不能通过本页的终局不变量，168 可以要求 cut、rewrite 或回压内核。

## Review Stance

168 的裁决优先级固定为：

```text
terminal invariant
  > owner truth
    > executable proof
      > implemented behavior
        > prior plan checkbox
```

规则：

- 已实现不等于已采纳。
- 已通过 UI 测试不等于通过 Runtime authority。
- 已写在 166 / 167 的完成状态不保护局部实现。
- 能从 core 产出的真实诊断必须压到 Playground；不能从 core 产出的信息不能在 Playground 里伪装成诊断。
- 如果一个 adapter 只是把上游 truth 换名搬运，它必须证明自己没有新增判断；否则下沉到 owner 或删除。

## Imported Authority

- [../../docs/ssot/runtime/09-verification-control-plane.md](../../docs/ssot/runtime/09-verification-control-plane.md)
- [../../docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)
- [../../docs/ssot/runtime/17-playground-product-workbench.md](../../docs/ssot/runtime/17-playground-product-workbench.md)
- [../160-cli-agent-first-control-plane-cutover/spec.md](../160-cli-agent-first-control-plane-cutover/spec.md)
- [../162-cli-verification-transport/spec.md](../162-cli-verification-transport/spec.md)
- [../165-runtime-workbench-kernel/spec.md](../165-runtime-workbench-kernel/spec.md)
- [../166-playground-driver-scenario-surface/spec.md](../166-playground-driver-scenario-surface/spec.md)
- [../167-runtime-reflection-manifest/spec.md](../167-runtime-reflection-manifest/spec.md)

## Problem Statement

当前 Playground 已经完成 Logic-first workbench、真实 `Runtime.run / Runtime.openProgram / Runtime.check / Runtime.trial` 路径和 resizable UI。下一阶段的问题已经从页面布局转为全链路 truth pressure：

- `Runtime.trial` 能暴露的依赖装配错误，`Runtime.run` 在 Playground 中不能表现为成功的空结果。
- `Runtime.trial` 已经有 `dependencyCauses`、findings、repair hints 的最小 spine，168 初稿里的广义 `DependencyClosureIndex` 过宽，必须先接受最小生成元审查。
- `Runtime.check`、`Runtime.trial`、CLI `check / trial / compare`、reflection manifest 与 Playground Diagnostics 之间还缺 dominance matrix。
- Workbench 已有 `run-failure-facet`，Playground invoker 已有 evidence envelope，但 Run failure、transport failure、compile failure、preview-only failure 仍可能在不同层被解释成不同 truth class。
- `undefined` 被 JSON-safe 投影成 `null` 会丢失语义。若 UI 只显示 `{ value: null }`，用户无法判断是业务返回 null、void main、投影降级、还是执行失败被吞掉。
- 反射能列出的 action、payload、source refs、imports、services、effects 与 Workbench projection 之间还没有通过一个 mandatory projection contract 展开。
- 166 的视觉压力 demo 可以证明 UI 容量，但不能继续用非真实 diagnostics 行模拟 runtime authority。
- Playground 需要把 CLI 和 core 已经能检测的失败类型全部以真实 evidence 展示；若某类缺口还不能被 core 检出，必须显示为 evidence gap 或新增 core pressure demo。

## Terminal Invariants

### I168-001: One Verdict Owner

同一失败只能有一个 verdict owner：

- `runtime.check` owns static declaration verdict.
- `runtime.trial(mode="startup")` owns startup dependency, config, boot and close verdict.
- `Runtime.run` owns business result and run failure facet.
- `runtime.compare` owns before/after comparison verdict.
- Workbench and Playground only project these verdicts.

### I168-002: Lossy Projection Is Evidence

任何把不可 JSON 表达的运行值转换成 UI 值的步骤都必须带 lossiness metadata。`undefined -> null`、oversized payload truncation、function/symbol/stringification 都不能只显示最终值。

### I168-003: Adapter Cannot Add Semantics

Adapter 可以做坐标映射、artifact linking、host context 附着和 bounded projection。Adapter 不能新增 error code、severity、dependency kind、repair priority、compare verdict 或 Runtime-looking finding。

### I168-004: Pressure Demo Is Either Real Or Visual

每个 Playground demo 必须选择一种身份：

- real authority demo: 通过真实 runtime/check/trial/run/reflection/compare 路径产出 evidence。
- visual pressure demo: 只验证布局容量，禁止出现在 diagnostics authority lane。

混合 demo 必须把两类数据分到不同 lane，并在 test fixture 中声明 authority class。

## Scope

### In Scope

- Core verification kernel 到 Playground 的 report parity。
- Reflection manifest 到 Playground action、payload、dependency、source drilldown 的 authority parity。
- CLI artifact / stdout transport 与 Playground session capture 的 compare parity。
- Runtime Workbench Kernel 对 full reflection、check/trial/run evidence 的 projection expansion。
- Playground diagnostics demos 的真实性约束。
- Run failure、startup trial failure、check declaration failure 在 Playground 中的 shape separation。
- Scenario trial、payload validation、dependency closure index 等内核缺口的终局方向。
- 对已有实现的 cut / rewrite / keep gate。
- 后续 plan-optimality-loop 的评审对象和待裁决问题清单。

### Out of Scope

- 新增 public `Logix.Reflection` root。
- 新增 public `Runtime.playground`、`Runtime.driver`、`Runtime.scenario`、`Runtime.workbench`。
- 把 Playground Driver / Scenario 元数据提升为 runtime authoring API。
- 把 UI preview error 升级为 Logix diagnostic truth。
- 把 visual pressure fixture 行伪装成 Runtime / CLI diagnostic。
- 把 `CommandResult`、Workbench projection 或 Playground derived summary 升级为 report authority。
- 本轮直接实现代码。

## Terminal Decisions

### TD-001: Kernel First Parity

所有可跨 CLI、Workbench、Playground 复用的诊断、反射、依赖、payload、operation 坐标必须先由 core owner 或已冻结 SSoT 持有。

规则：

- Playground 只消费 authority，不发明 Runtime-looking finding。
- CLI 只路由 control-plane stage 和 transport artifacts，不发明 report truth。
- Workbench Kernel 只投影 authority bundle，不执行 Program，不生成 report。
- 任何 UI 侧发现的真实缺口必须回压 core/reflection/control-plane owner。
- 任何已经存在的 Playground/CLI adapter 若无法证明自己只是 projection，必须改名为 host state helper、下沉为 fixture，或删除。

### TD-002: Run Result Cannot Hide Runtime Failure

`Runtime.run` 是 result face，不返回 `VerificationControlPlaneReport`。但真实运行失败不能在 Playground 中表现为成功的 `{ value: null }`。

规则：

- Run 成功只写 Run Result。
- Run 失败写 result-face failure projection，并进入 Workbench projection 的 `run-failure-facet`。只有 owner failure 不可取得时，才允许降级为 `evidence-gap`。
- 若失败类型也属于 startup trial 可检测范围，Playground 必须能引导到 `Trial` 或展示已捕获 trial report。
- Run failure 不得伪装成 `runtime.trial` report。
- Run failure 与 Trial diagnostics 可以共享 owner coordinate、dependency key、sourceRef 或 repair hint。
- Sandbox/transport 投影不得只保留 `ProgramRunner` 外层 wrapper message；`MainError`、`BootError`、`DisposeError` 的 nested cause message 必须保留在 result-face failure evidence 中。
- `Runtime.run` 成功但返回 `undefined` 时，UI projection 必须显示 `returnKind="undefined"` 或等价 lossiness metadata，不能只显示 `value: null`。

### TD-003: `runtime.check` Remains Static Gate

`runtime.check` 继续是 cheap static gate。它不隐式代跑 startup trial。

终局增强方向：

- `runtime.check` 可以消费 owner-approved declaration dependency index。
- 对已声明的 missing service / config / import risk，`runtime.check` 可以给出 declaration finding。
- 对只能在启动、装配或 Effect DI 求值时发现的失败，authority 仍归 `runtime.trial(mode="startup")`。

### TD-004: Dependency Cause Spine Beats Broad Closure Index

当前优先把已有 `VerificationDependencyCause` 提升为最小 dependency cause spine。广义 `DependencyClosureIndex` 只有在这个 spine 无法覆盖 check / trial / run / CLI / Playground drilldown 时才允许新增。

最小 spine 必须表达：

- dependency kind: service / config / import / external package / host fixture
- owner coordinate
- lifecycle phase
- provider source
- sourceRef or focusRef when owner can provide it
- error code
- child identity when dependency is a Program import

规则：

- `runtime.trial` 已经能产出的 `dependencyCauses` 必须成为 CLI、Workbench、Playground 的 shared spine。
- `runtime.check` 只有在声明期能得到同一 spine 的子集时，才允许产出 dependency finding。
- Reflection manifest 可以引用 dependency spine，但不能发明另一套 dependency cause schema。
- 广义 closure index 留在 discussion 作为挑战项，不作为默认终局对象。

### TD-005: Payload Validation Belongs To Reflection Owner

Playground 可以持有 JSON text editor、parse failure 和 UI presentation。稳定 payload schema carrier、validator availability 和 issue code 必须由 reflection owner 持有。

规则：

- Unknown schema 显示为 evidence gap。
- Invalid JSON text 是 Playground input failure。
- Schema-backed value validation issue 是 reflection-owned projection。
- Playground demo 需要展示 payload failure 时，必须通过真实 reflected validator 或明确标为 validator unavailable。

### TD-006: Workbench Projection Must Expand Full Authority

165 的 projection-only law 继续有效。168 要求后续 bridge 不只保存 artifact ref，还要把 owner-approved authority 展开成可浏览节点，并修正当前 id 与文本耦合风险。

最低展开对象：

- check/trial report findings
- run result or run failure facet
- reflection actions and payload metadata
- dependency closure nodes
- imports/services/config nodes
- sourceRef/focusRef drilldown refs
- artifacts and capture refs
- evidence gaps and degradation notices

规则：

- Workbench finding id 不得依赖 report summary 文本。
- Control-plane report input id 必须优先来自 runId、stage、mode、errorCode、focusRef、artifact output key 或 owner digest。
- Reflection bridge 必须把 167 manifest 展开成 action、payload 与 dependency browse nodes；不能只停留在 `reflectionManifest` artifact ref。
- `fallback-source-regex`、missing manifest、unknown payload schema 与 stale manifest digest 只能成为 evidence gap。
- Preview-only failure 不能进入 `run-result` truth input；它只能是 host state、preview artifact 或 evidence gap。
- Compile failure 只有在它来自 Runtime/transport authority 时才能进入 run-failure facet，否则归 transport/pre-control-plane failure。

### TD-007: CLI And Playground Share Adapter Law

CLI `CommandResult` 继续是 stdout transport envelope，Playground session evidence envelope 继续是 product host state。二者必须共享投影到 `RuntimeWorkbenchAuthorityBundle` 的 adapter law。

规则：

- CLI adapter 输入是 `CommandResult + artifacts + optional evidence package`。
- Playground adapter 输入是 `ProjectSnapshot + run/check/trial/session captures`。
- 两者输出同一种 workbench authority bundle 分层：truthInputs、contextRefs、selectionHints。
- artifact key、report stage、focusRef、source digest、dependency coordinate 必须能跨宿主比较。

### TD-008: Playground Compare Needs Captured Report Refs

CLI compare 使用 before/after report refs。Playground 也需要 session-local captured report refs，而不是让 UI 直接比较当前屏幕文本。

规则：

- Check、Trial 与 Run failure projection 应产生 capture ref。
- 当前 compare-compatible proof 只消费 captured Check/Trial report refs；Run failure capture 可被展示和下钻，但不作为默认 compare pair。
- Future Scenario trial 只有在 core executor 落地后才能产生 compare-admissible control-plane capture。
- Compare 只消费 admissible captured reports / evidence summaries / artifact refs。
- Raw trace 全量比较不进入默认 compare truth。
- Playground 可以提供 before/after selection UI，但 selection state 不进入 compare authority。

### TD-009: Scenario Trial Awaits Core-Owned Executor

Playground Scenario playback 是 product demo runner。`runtime.trial(mode="scenario")` 需要 core-owned scenario executor 才能成为 control-plane 成功路径。

规则：

- Product scenario expect failure 不能冒充 control-plane compare truth。
- CLI `trial --mode scenario` 在 executor 落地前保持结构化失败。
- Playground 可以展示 product scenario result，但必须标注 authority class。
- 终局要复用 `fixtures/env + steps + expect`，并由 core executor 产生 canonical evidence。

### TD-010: No Fake Diagnostics

Playground 中标记为 Runtime、CLI、Reflection 或 Workbench authority 的信息必须来自真实 owner。

规则：

- Visual pressure rows 只能证明布局容量。
- diagnostics demo 要展示不同错误类型时，必须通过 demo 写法触发真实 build/check/trial/run/validation failure。
- 若当前内核无法产生某类 error code，demo 必须显示 evidence gap 或等待 core gap closure。
- 测试必须覆盖 “fake-looking rows absent from authority lanes”。

### TD-011: Existing Implementation Must Pass Dominance Gate

现有实现按四类处理：

| Class | Meaning | Action |
| --- | --- | --- |
| `keep` | 已通过 terminal invariant 和 owner proof | 进入实现基线 |
| `rewrite-under-owner` | 行为方向正确，但 owner 或 shape 错 | 回写 owner 后重写 |
| `demote-to-host-state` | 只服务 UI、preview、selection 或 pressure | 禁止进入 authority lane |
| `delete` | 伪造 truth、重复 owner、制造第二模型 | 删除 |

第一批必须审查：

- `ProjectSnapshotRuntimeInvoker` 的 `transportFailure` / `evidenceGap` / `runtimeOutput` 分类。
- `runProjection.ts` 的 `undefined -> null` 投影。
- `workbenchProjection.ts` 把 compile/preview failure 投成 `run-result` truth input 的路径。
- Workbench authority id 是否依赖 summary 文本。
- diagnostics pressure routes 是否混入 authority-looking rows。
- reflection bridge 是否只桥接 manifest artifact refs，缺少 action/payload/dependency node 展开。

## Requirements

### Functional Requirements

- **FR-001**: Playground MUST display every `runtime.check` finding available from core without changing report code, severity or focusRef.
- **FR-002**: Playground MUST display every `runtime.trial(mode="startup")` finding available from core without changing report code, severity or focusRef.
- **FR-003**: Playground MUST NOT show a successful Run result when the underlying `Runtime.run` path failed to start, resolve dependency, execute main or serialize output.
- **FR-004**: Run failure MUST remain result-face failure or Workbench `run-failure-facet`; it MUST NOT become a fabricated `runtime.trial` report.
- **FR-005**: Reflection action and payload facts consumed by Playground MUST come from 167 owner-approved manifest or be marked as evidence gap.
- **FR-006**: Payload schema validation issue codes MUST NOT be defined in Playground product code.
- **FR-007**: CLI and Playground adapters MUST be able to emit equivalent `RuntimeWorkbenchAuthorityBundle` inputs for the same report and artifact authority.
- **FR-008**: Playground compare MUST use captured report/evidence refs compatible with CLI before/after compare semantics.
- **FR-009**: Scenario playback results MUST be classified as product output until core scenario executor produces control-plane evidence.
- **FR-010**: Pressure demos MUST NOT populate Runtime-looking diagnostics without owner-backed evidence.
- **FR-011**: Curated diagnostics demos SHOULD cover build failure, static check finding, startup missing dependency, run failure facet, payload validation gap/failure, evidence gap and compare closure when the corresponding core owner exists.
- **FR-012**: Any diagnostic type already detectable by CLI MUST have an equivalent Playground route or documented reason for temporary absence.
- **FR-013**: `VerificationDependencyCause` MUST be the first candidate dependency spine before introducing any broader dependency closure index.
- **FR-014**: Lossy Run value projection MUST expose lossiness metadata.
- **FR-015**: Workbench projection ids MUST NOT depend on summary text.
- **FR-016**: Preview-only failure MUST NOT be encoded as Runtime run-result truth.
- **FR-017**: Existing implementation paths listed in TD-011 MUST be classified before implementation tasks can be marked ready.

### Non-Functional Requirements

- **NFR-001**: No new public authoring root or public workbench facade.
- **NFR-002**: All DTOs crossing package boundaries must be bounded, serializable and deterministic enough for snapshot tests.
- **NFR-003**: Reflection and workbench projection must remain opt-in and off hot paths unless a host explicitly requests them.
- **NFR-004**: Disabled diagnostics and reflection collection must not add measurable dispatch hot-path overhead without perf evidence.
- **NFR-005**: Playground UI state must not influence report ids, finding existence, severity or compare verdict.

## Success Criteria

- A parity matrix proves `Runtime.check`, `Runtime.trial`, CLI `check/trial/compare`, reflection manifest and Playground diagnostics use the same authority for overlapping facts.
- A missing dependency example produces consistent evidence across Trial, CLI trial and Playground diagnostics.
- A Run failure example no longer appears as `{ value: null }` success when the real execution failed.
- A reflection-backed action/payload example shows manifest authority and evidence gaps without source regex promotion.
- A diagnostics-dense demo is either fully real or explicitly split into visual pressure and runtime authority demos.
- Playground can capture before/after report refs and route them to compare-compatible authority.
- `discussion.md` has no blocking implementation item before implementation starts.

## Reopen Bar

Reopen this spec if any of the following happens:

- A new owner-approved verification stage is added beyond check / trial / compare.
- Reflection becomes public authoring surface.
- CLI command surface changes beyond check / trial / compare.
- Playground needs a diagnostic fact that core cannot model as report, run-failure facet, reflection fact or evidence gap.
- Scenario trial gets a core-owned executor and changes the parity matrix.
