# Feature Specification: DVTools Internal Workbench Cutover

**Feature Branch**: `159-dvtools-internal-workbench-cutover`
**Created**: 2026-04-26
**Status**: Implemented mainline
**Input**: 先在 Docs 记录 DVTools 北极星、边界和核心原则，再新建需求系统梳理这一块；直接面向终局，不考虑兼容。

## 页面角色

本页是 `159` 的 cutover execution contract。

| 文件 | 角色 | 不负责 |
| --- | --- | --- |
| [../../docs/ssot/runtime/14-dvtools-internal-workbench.md](../../docs/ssot/runtime/14-dvtools-internal-workbench.md) | DVTools 长期北极星、负边界、主链和派生原则 | 逐组件实施顺序 |
| 本页 | `159` 的冻结决策、派生权威、组件归宿、proof pack、波次计划 | 重开 runtime control plane 或 public surface |
| [implementation-plan.md](./implementation-plan.md) | `159` 的 implementation plan，按 TDD chunk 拆解执行文件、测试和验证命令 | 冻结 authority 决策 |
| [discussion.md](./discussion.md) | residual risk、rejected alternatives、后续 reopen 记录 | authority 决策 |

`159` 的目标论点固定为：

```text
DVTools 收敛为 internal session-first evidence workbench。
唯一主链是 scope -> session -> finding -> artifact attachment。
focusRef 只作稳定坐标。
report、timeline、inspector、field graph、converge、raw JSON、time travel 都不能形成默认主入口。
短期闭环优先服务 Agent 自我验证：DVTools 导出 canonical evidence package，CLI 消费后通过 runtime.check / runtime.trial / runtime.compare 产出 machine report 和 repair hints。
```

## Binding Authority

- [../../docs/ssot/runtime/14-dvtools-internal-workbench.md](../../docs/ssot/runtime/14-dvtools-internal-workbench.md)
- [../../docs/ssot/runtime/09-verification-control-plane.md](../../docs/ssot/runtime/09-verification-control-plane.md)
- [../../docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md](../../docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md)
- [../../docs/ssot/runtime/01-public-api-spine.md](../../docs/ssot/runtime/01-public-api-spine.md)
- [../../docs/ssot/runtime/10-react-host-projection-boundary.md](../../docs/ssot/runtime/10-react-host-projection-boundary.md)
- [../../docs/ssot/runtime/11-toolkit-layer.md](../../docs/ssot/runtime/11-toolkit-layer.md)
- [../../docs/adr/2026-04-05-ai-native-runtime-first-charter.md](../../docs/adr/2026-04-05-ai-native-runtime-first-charter.md)
- [../../docs/standards/logix-api-next-guardrails.md](../../docs/standards/logix-api-next-guardrails.md)

## Background Only

- [../038-devtools-session-ui/spec.md](../038-devtools-session-ui/spec.md)
- [../015-devtools-converge-performance/spec.md](../015-devtools-converge-performance/spec.md)
- [../../docs/proposals/devtools-appendix-surface-contract.md](../../docs/proposals/devtools-appendix-surface-contract.md)

旧 devtools specs 只提供背景，不覆盖本页或 SSoT。

## Terminal Decisions

### TD-001: Main Chain

默认主链固定为：

```text
Scope Selector
  -> Session Navigator
    -> Selected Session Workbench
      -> Findings
        -> Artifact Attachments
          -> Drilldowns
```

规则：

- `focusRef` 只作为 finding 或 artifact attachment 上的坐标字段。
- `VerificationControlPlaneReport` 只作为 finding 输入或 raw explainer drilldown。
- `Timeline / Inspector / FieldGraph / Converge / lane / state JSON / raw event JSON` 全部是 subordinate drilldowns。
- 默认第一屏只允许有紧凑 header、session navigator、selected session workbench。
- findings 必须在 selected session workbench 主体中可见，不另建默认右侧主 lane。

### TD-002: Public Surface

`@logixjs/devtools-react` public survivor set 继续归零。

禁止新增：

- root export
- public subpath
- wildcard export
- root style side effect
- `Runtime.devtools`
- `runtime.devtools`
- `Runtime.inspect`
- `runtime.inspect`
- DVTools 专属 report protocol
- DVTools 专属 evidence envelope
- DVTools 专属 scenario language

### TD-003: Mount Contract

`LogixDevtools` 只能作为 repo-internal / examples / tests 的 internal mount wrapper。

禁止把 internal mount 写成：

- 用户可依赖的 public recipe
- docs app 正式使用指南
- toolkit helper
- runtime option
- package export

若未来需要 user-facing helper，必须先走 `@logixjs/toolkit` intake，并证明不新增 authoring 主链、verification lane 或第二 evidence truth。

### TD-004: Time Travel And Mutation Controls

`159` closure 不包含 time travel 或任何会写 runtime state 的 mutation controls。

后续若重开实验能力，必须同时满足：

- 不进入 default shell import path
- 不参与 session / finding / artifact authority
- 不计入 `159` closure proof
- 不写回 evidence truth
- 不复用为 public recipe

做不到这些约束时，直接删除。

### TD-005: Export To CLI Loop

DVTools 必须支持把 selected session / finding 导出为 CLI 可消费的 evidence input。

闭环固定为：

```text
DVTools selected session / finding
  -> canonical evidence package + selection manifest
    -> Logix CLI import
      -> runtime.check / runtime.trial / runtime.compare
        -> VerificationControlPlaneReport + repair hints
          -> Agent repair
            -> trial / compare closure
```

规则：

- exported evidence 必须是 canonical evidence package。
- selection manifest 只能包含 selected session id、finding id、artifact key、focusRef、runtime/module/instance/txn/op/event coordinates。
- selection manifest 只作为 CLI 和 Agent 的入口提示，不拥有 truth。
- CLI output 必须继续使用 `VerificationControlPlaneReport` 或同一 control-plane report family。
- DVTools 不得导出自己的 session truth、finding truth、report truth 或 evidence envelope。
- `runtime.trial` 用于复跑或生成新的 evidence。
- `runtime.compare` 用于比较现场 evidence 与修复后的 trial evidence。
- `runtime.check` 用于在修复前后做静态快检。

### TD-006: Runtime Cost And Future Browser Host

`159` 当前服务 Agent 自我验证，不追求极限性能 profiling。

规则：

- runtime 侧只保留按需、低成本、slim、serializable 的 evidence。
- silent collection 和 recording 不能成为默认运行时成本。
- 性能相关 evidence 必须标注采集档位、测量干扰和适用范围。
- 若为了 profiling 引入的采集会明显改变页面原本执行成本，该能力不得进入 `159` default path。
- Chrome DevTools 或等价浏览器扩展是高成本浏览器采集和 profiling 的未来宿主方向。
- Chrome DevTools 迁移不属于 `159` closure，后续需要单独 spec。

## Derivation Authority Contract

### Normalized Input

DVTools v1 只接受三类输入：

- live debug snapshot
- imported evidence package
- `VerificationControlPlaneReport`

DVTools v1 只允许两类输出：

- canonical evidence package
- selection manifest

三类输入必须先进入同一 normalized input。之后只能按下面链路派生：

```text
normalized input
  -> scope index
    -> sessions
      -> metrics
        -> findings
          -> artifact attachments
            -> drilldown selectors
```

UI state 只能选择、过滤和展示派生结果，不能反向改写 normalized input 或 evidence truth。

### Owner Law

| 派生对象 | owner | 规则 |
| --- | --- | --- |
| `scope index` | normalized debug/evidence coordinates | 只按 runtime/module/instance 与 report source 坐标建索引 |
| `session` | stable coordinate cluster | 由 runtime/module/instance + txn/event coordinates 派生 |
| `metric` | session | 只统计 session 覆盖范围内的 event/report attachment |
| `finding` | session + evidence refs | 只能解释已有 evidence、report repair hints、debug event summaries |
| `artifact attachment` | finding | 只能来自 report artifacts 或 evidence artifacts |
| `drilldown selector` | selected session/finding/artifact | 不拥有新 truth |
| `selection manifest` | selected session/finding/artifact | 只提供 CLI / Agent entry hint |

### Session Boundary Precedence

Session v1 以稳定坐标聚类为权威，timestamp 只用于展示和弱排序。

分界顺序固定为：

1. 不同 `runtimeLabel / moduleId / instanceId` 必须进入不同 session。
2. 有 `txnSeq` 的 event，按同一 instance 内连续 `txnSeq` 聚类。`txnId` 只能作为补充显示或 legacy normalization 输入。
3. 缺 `txnSeq` 但有 `eventSeq` 的 event，按同一 instance 的连续 `eventSeq` 形成 bounded session，并附 `missing-txn-coordinate` gap。
4. action event 只作为 session label 或 suggested entry，不单独持有 session 边界。
5. render、lifecycle、state、field converge、hot lifecycle events 只能附着到最近的同 scope 坐标 cluster。
6. imported evidence 与 live snapshot 使用同一 normalization 和 clustering。
7. ring buffer 中段窗口缺少 session 起点时，创建 bounded session，并附 `truncated-window` gap。
8. 无法满足最小 scope coordinate 的 event 不进入普通 session，只进入 evidence gap bucket。

排序优先级固定为：

```text
runtimeLabel -> moduleId -> instanceId -> txnSeq -> opSeq -> eventSeq -> timestamp
```

`timestamp` 不得独自决定 session identity。

### Report Placement Law

`VerificationControlPlaneReport` 不形成独立 report lane。

规则：

- report 通过 `focusRef`、artifact output keys、evidence refs 关联到 session 或 finding。
- report 的 `stage / mode / verdict / errorCode / summary / artifacts / repairHints / nextRecommendedStage` 必须可在 drilldown 中完整查看。
- report 可以生成 finding，但 finding 必须保留原始 report refs。
- report 缺少可关联坐标时，只创建 `report-only-evidence` gap，不创建第二套 summary model。

### Artifact Attachment Law

Artifact attachment 是 finding 的附属对象。

最小字段：

- `artifactKey`
- `artifactKind`
- `artifactRef`
- `evidenceRefs`
- `focusRef`
- `sourceRef`
- `summary`

规则：

- artifact attachment 不形成 root lane。
- artifact output key 必须出现在默认 actionable path。
- 缺少 artifact key 时必须产生 `missing-artifact-key` gap。
- materialized path 只作为 derived display data，不成为新 evidence truth。

### Evidence Gap Code Set

`159` v1 只允许下面 gap codes：

| code | 触发条件 | 默认落点 |
| --- | --- | --- |
| `missing-runtime-scope` | 缺 runtime label 或无法建立 scope index | evidence gap bucket |
| `missing-instance-coordinate` | 缺 instance id | evidence gap bucket |
| `missing-txn-coordinate` | 缺 `txnSeq` 且无法从 legacy `txnId` 正规化 | bounded session |
| `missing-event-sequence` | 缺 `eventSeq` 且无法稳定排序 | evidence gap bucket |
| `missing-source-coordinate` | 缺 `sourceRef / declSliceId / reasonSlotId / scenarioStepId` | finding |
| `missing-artifact-key` | report artifact 或 evidence artifact 缺 output key | finding |
| `missing-static-summary` | imported evidence 缺少 materialization 所需 summary | drilldown |
| `dropped-evidence` | evidence 标记 dropped 或 ring buffer 丢弃 | session |
| `oversized-evidence` | payload 被裁剪或超过展示预算 | session |
| `truncated-window` | evidence window 从交互中段开始 | bounded session |
| `report-only-evidence` | report 无法关联到 runtime event session | gap session |
| `diagnostics-disabled` | diagnostics level 为 off 或仅有 counters | empty or gap state |
| `non-serializable-payload` | payload 被 downgrade 为不可序列化摘要 | drilldown |
| `legacy-time-travel-data` | old snapshot 带 time travel data | drilldown, never default |

新增 gap code 必须先回写本页，并说明为何不能归入上表。

## Component Disposition Freeze

Disposition vocabulary 只允许五类：

- `rewrite`
- `keep-drilldown`
- `fold-then-delete`
- `remove`
- `experimental-internal`

| 当前对象 | disposition | 新归宿 | proof |
| --- | --- | --- | --- |
| `src/internal/state/model.ts` | rewrite | 增加 session/finding/artifact/gap 派生 model，移除默认 time travel state | derivation model tests |
| `src/internal/state/compute.ts` | rewrite | normalized input + derivation kernel | deterministic and live/import equivalence tests |
| `src/internal/state/logic.ts` | rewrite | import/live normalization actions 和 selected session/finding actions | no second interpreter tests |
| `DevtoolsShell` | rewrite | session workbench shell | default shell import and layout tests |
| `LogixDevtools` | rewrite | internal-only mount wrapper | public surface guard |
| `LogixIsland` | rewrite | internal host for workbench runtime | internal mount guard |
| `Sidebar` | rewrite | scope selector + session navigator | selected session tests |
| `OverviewStrip` | fold-then-delete | selected session metrics and pulses | no top global band test |
| `OverviewDetails` | fold-then-delete | selected session metrics drilldown | default shell import test |
| `OperationSummaryBar` | fold-then-delete | selected session summary | constrained-height test |
| `EffectOpTimelineView` | keep-drilldown | session-scoped timeline drilldown | range filter tests |
| `Timeline` | keep-drilldown | timeline drilldown shell | drilldown selector tests |
| `Inspector` | keep-drilldown | session/finding scoped inspector | no free-text parsing guard |
| `FieldGraphView` | keep-drilldown | inspector drilldown only | no standalone public path test |
| `ConvergePerformancePane` | keep-drilldown | finding drilldown | finding evidence refs tests |
| `ConvergeTimeline` | keep-drilldown | converge drilldown | session range tests |
| `ConvergeDetailsPanel` | keep-drilldown | converge finding detail | artifact/focusRef visibility tests |
| `SettingsPanel` | rewrite | evidence tiers and display thresholds only | no mode toggle regression test |
| Time travel controls | remove | none in `159` default path | time travel exclusion test |

Any `or` disposition is invalid after this spec.

## Implementation Cutover Plan

### Wave 0: Inventory And Guards

Goal: freeze current surface and prevent regression before UI rewrite.

Must do:

- assert `@logixjs/devtools-react` root export remains empty
- assert package exports keep `.` and `./internal/*` as null
- assert no runtime `devtools/inspect` facade appears
- snapshot current internal component imports
- add component disposition snapshot

Exit:

- public surface guard passes
- component disposition table has no unresolved row

### Wave 1: Derivation Kernel

Goal: build the single normalized derivation path before shell rewrite.

Must do:

- define normalized input model
- derive scope index
- derive sessions by Session Boundary Precedence
- derive metrics
- derive findings
- derive artifact attachments
- derive evidence gaps using closed code set
- run live/import equivalence against the same golden events

Exit:

- deterministic derivation tests pass
- gap code tests pass
- report placement tests pass
- no free-text diagnostic parsing guard passes

### Wave 2: Default Workbench Shell

Goal: replace timeline-first default path with session-first workbench.

Must do:

- rewrite `DevtoolsShell`
- rewrite `Sidebar` into scope selector + session navigator
- fold overview and operation summary into selected session summary
- make workbench body the only primary scroll container
- expose default actionable path with `finding -> focusRef -> artifactKey -> stable coordinates`

Exit:

- default shell renders session navigator before raw timeline
- constrained height test proves workbench is scrollable
- no-events state occupies workbench body
- artifact output keys are visible from selected finding

### Wave 3: Drilldown Adapters

Goal: keep useful old panels only as session/finding scoped drilldowns.

Must do:

- adapt timeline to selected session range
- adapt inspector to selected finding/session
- adapt FieldGraph to inspector drilldown
- adapt converge pane to finding evidence refs
- keep raw JSON under explicit drilldown
- remove default time travel controls

Exit:

- drilldowns cannot change evidence truth
- drilldowns cannot create sessions or findings
- time travel does not appear in default path

### Wave 4: Legacy Sweep And Docs Closure

Goal: remove stale mental models and close docs.

Must do:

- remove top global summary bands from default imports
- remove timeline-first UI state
- remove legacy settings toggles that imply old modes
- update status and residual risks
- close accepted discussion items
- run closure proof pack

Exit:

- proof pack passes
- SSoT writeback complete
- spec status updated

## User Scenarios

### US1: Session First Diagnosis

Given live or imported evidence, DVTools opens on session navigator and selected session workbench.

Acceptance:

- sessions are deterministic across live/import input
- findings and metrics appear before timeline rows
- missing coordinates produce evidence gaps

### US2: Actionable Finding

Given degraded, dropped, oversized, waterfall, unknown write, hot lifecycle, or report evidence, DVTools derives findings with stable repair coordinates.

Acceptance:

- each actionable finding includes evidence refs
- each actionable finding exposes `focusRef` when available
- each actionable finding exposes artifact output keys when available
- missing coordinates produce explicit evidence gaps

### US3: Evidence Package Equivalence

Given equivalent live snapshot and imported evidence package, DVTools produces the same sessions, metrics, findings, artifact attachments, and gap codes.

Acceptance:

- materialized paths are display-only
- imported path does not use a second interpreter
- missing summary creates `missing-static-summary`

### US4: Usable Constrained Layout

Given a bottom-docked panel or small-height viewport, the selected workbench remains reachable.

Acceptance:

- header stays compact
- workbench body scrolls
- drilldowns scroll locally
- no-events state does not leave a large empty top band

### US5: Legacy Views Have One Owner

Given current internal DVTools components, every component has exactly one disposition from Component Disposition Freeze.

Acceptance:

- no component remains in candidate state
- default shell import path does not depend on removed global bands
- public export path does not expose any component

## Functional Requirements

- **FR-001**: DVTools default view MUST be session-first.
- **FR-002**: DVTools MUST use one normalized input path for live snapshot and imported evidence.
- **FR-003**: DVTools MUST derive sessions by Session Boundary Precedence.
- **FR-004**: DVTools MUST derive findings from evidence, report repair hints, and debug event summaries.
- **FR-005**: DVTools MUST NOT parse free-text diagnostic message as semantic authority.
- **FR-006**: Every actionable finding MUST contain stable evidence coordinates or explicit evidence gaps.
- **FR-007**: Artifact attachments MUST be subordinate to findings and MUST NOT form a root lane.
- **FR-008**: Report display MUST preserve `VerificationControlPlaneReport` fields.
- **FR-009**: DVTools MUST NOT define a competing report shape, evidence envelope, or verification lane.
- **FR-010**: DVTools MUST NOT add public `@logixjs/devtools-react` exports or runtime facades.
- **FR-011**: DVTools MUST keep main workbench body scrollable under constrained height.
- **FR-012**: DVTools MUST remove time travel and mutation controls from the default path.
- **FR-013**: DVTools MUST expose evidence gaps only from the closed code set in this spec.
- **FR-014**: DVTools MUST keep scope UI state as filter/selection only, never evidence truth.

## Non-Functional Requirements

- **NFR-001**: DVTools MUST NOT increase default runtime hot-path cost.
- **NFR-002**: Derivation logic MUST be testable without React rendering.
- **NFR-003**: High-density drilldowns MUST use windowing, memoization, or staged rendering.
- **NFR-004**: Diagnostics-disabled mode MUST NOT rely on DVTools UI state for runtime correctness.
- **NFR-005**: Any new runtime evidence MUST be slim, serializable, stable, and backed by reproducible baseline.
- **NFR-006**: `500-event` golden fixture derivation SHOULD complete within `200ms`; closure requires recording the command, machine class, and measured baseline. If the baseline is not reproducible, this item remains a residual risk and cannot be used to justify new runtime evidence.

## Key Entities

- **Normalized Evidence Input**: host-neutral input produced from live snapshot, imported evidence package, and optional control-plane report.
- **Scope Index**: derived runtime/module/instance/report source index.
- **Interaction Session**: stable coordinate cluster over one runtime/module/instance evidence window.
- **Session Metric**: derived count or duration owned by one session.
- **Advisor Finding**: structured diagnosis owned by one session and backed by evidence refs.
- **Artifact Attachment**: report/evidence artifact attached to one finding.
- **Evidence Gap**: closed-code explanation for missing or insufficient evidence.
- **Drilldown View**: subordinate view selected from session/finding/artifact context.
- **Focus Coordinate**: stable pointer such as `declSliceId`, `reasonSlotId`, `scenarioStepId`, `sourceRef`, artifact output key, runtime instance id, txn seq, op seq, event seq.

## Closure Proof Pack

| proof id | target invariant | fixture/input | assertion | command class |
| --- | --- | --- | --- | --- |
| `P-001` | deterministic derivation | fixed debug snapshot with multi-txn events | sessions, metrics, findings, gaps are stable | unit test |
| `P-002` | live/import equivalence | same normalized event set through live and import paths | output equality for sessions/findings/artifacts/gaps | unit test |
| `P-003` | report placement | report with repair hints and artifacts | report attaches to finding/drilldown, no report lane | unit test |
| `P-004` | artifact path | finding with artifact output key | default actionable path shows artifact key and focusRef | render test |
| `P-005` | closed evidence gaps | edge-case matrix from this spec | only allowed gap codes appear | unit test |
| `P-006` | public surface nullity | package export table and root index | no public component export or runtime facade | guard test |
| `P-007` | no free-text parsing | diagnostic message with misleading text | semantic fields come from structured payload only | guard test |
| `P-008` | constrained layout | bottom panel and small-height viewport | workbench body scrolls and header stays compact | render/browser test |
| `P-009` | default shell import | shell import graph | timeline-first shell and global bands are absent from default path | guard test |
| `P-010` | time travel exclusion | old snapshot with time travel data | gap/drilldown only, no default controls | guard test |
| `P-011` | derivation cost | `500-event` golden fixture | measured baseline recorded, target `<=200ms` where reproducible | perf test |
| `P-012` | export to CLI loop | selected session with finding and artifact key | exports canonical evidence package plus non-authority selection manifest | unit/contract test |
| `P-013` | runtime cost boundary | default diagnostics off/light path | no silent recording or profiling cost in default path | guard/perf test |

Suggested future command classes:

- `pnpm -C packages/logix-devtools-react typecheck:test`
- `pnpm -C packages/logix-devtools-react test`
- targeted perf command after `P-011` fixture lands

## Readiness Gates

Implementation may start only after this spec keeps these decisions frozen:

- main chain
- session boundary precedence
- report placement law
- artifact attachment law
- evidence gap code set
- component disposition freeze
- wave plan
- closure proof pack
- export to CLI loop
- runtime cost boundary and Chrome DevTools future-host exclusion

## Done Gates

`159` closes only when:

- all waves are complete
- all closure proofs pass or residual risk is explicitly recorded
- `discussion.md` contains no accepted decision still outside this spec or SSoT
- [../../docs/ssot/runtime/14-dvtools-internal-workbench.md](../../docs/ssot/runtime/14-dvtools-internal-workbench.md) is updated if long-term facts changed
- [../../docs/ssot/runtime/09-verification-control-plane.md](../../docs/ssot/runtime/09-verification-control-plane.md) is updated if report, evidence, or focusRef law changes
- [../../docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md](../../docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md) is updated if negative control-plane statement changes
- [../../docs/ssot/runtime/11-toolkit-layer.md](../../docs/ssot/runtime/11-toolkit-layer.md) is updated only if a user-facing helper is proposed

## Reopen Bar

Only reopen this spec if one of these happens:

- `VerificationControlPlaneReport` cannot carry required repair coordinates
- canonical evidence envelope cannot represent required debug source
- session determinism cannot be achieved from existing stable coordinates
- a real repo-internal or app-local use case requires toolkit intake
- a proposed alternative strictly dominates the adopted contract on proof strength without increasing public surface or compat budget

## Current One-Line Conclusion

`159` cuts DVTools to an internal evidence workbench whose executable contract is `scope -> session -> finding -> artifact attachment`; every other view is subordinate, and every conclusion must return to existing evidence, report, or stable runtime coordinates.
