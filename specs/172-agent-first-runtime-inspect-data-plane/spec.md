# 功能规格：Agent-first Runtime Inspect Data Plane

**Feature Branch**: `172-agent-first-runtime-inspect-data-plane`
**Created**: 2026-05-03
**Status**: Done
**Input**: "开一个 172，把 Agent-first CLI 能摸到的 Runtime 信息面按概念 DevTools 思维补到终局。若为达成目标需要压榨内核，则拆成 core pressure lane 与 CLI product lane。"

## Post-172 Handoff

172 已关闭 live inspect route、artifact family、structured gap 和 coverage harness。172 之后不再把 owner-backed producer work 回填进本 spec。

后续长期 owner law 迁移到 [../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md](../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md)。执行编排由 [../173-runtime-inspect-evidence-end-state/spec.md](../173-runtime-inspect-evidence-end-state/spec.md) 承接，foundation specs 为 `174/175/176`。

## 当前角色

本页是 `172` 的需求事实源。它承接 `171` 已完成的 live carrier、attachment、并发隔离和 evidence handoff，把后续目标从“连上 live runtime”推进到“Agent 通过 CLI 结构化读取 Runtime inspect data plane”。

`172` 不重启 DVTools 产品，不定义 DevTools UI，也不把当前 DevTools 面板实现当成覆盖标准。这里的 DevTools 是一种观察问题集：如果调试工具合理地想问 Runtime 某个事实，Agent-first CLI 也应有等价、结构化、可机读的问法。

## 目标函数

172 的成功标准不是“复刻 DevTools 面板”，而是关闭 Agent live repair/debug context：

```text
Agent needs runtime context
  -> logix live question
    -> owner-backed live inspect facet
      -> daemon lineage artifact
        -> canonical evidence export or structured gap
          -> runtime.trial / runtime.compare repair loop
```

概念 DevTools parity 是 coverage heuristic，不是产品目标本身。它只帮助枚举 Agent 在调试运行中页面时会问的问题。

规则：

- CLI 不复制 DevTools UI state。
- CLI 不制造第二套 Runtime truth。
- Browser adapter、daemon、IPC、WebSocket 只是 carrier。
- Workbench Kernel 只消费 owner-backed facet、canonical evidence 与 gap，不拥有 Runtime fact。
- 若 CLI 终局问题当前没有 owner hook，必须进入 core pressure lane，而不是在 CLI 层拼私有事实。

## Fact Authority

| Fact family | Authority | Producer / hook | 172 规则 |
| --- | --- | --- | --- |
| active target、attachment、host locator、operation lineage | 171 live attachment / operation semantics | browser adapter、daemon registry、live operation lane | CLI 只能路由 attachment-first 查询，不能按 tab title、connection order 或裸 target 猜测 |
| active runtime state、event window、timeline、operation summary | runtime live inspect owner | 175 operation ledger、177 timeline projection、178 summary projection | 只能输出 bounded JSON-safe facet 或 gap |
| static action、payload、validator、static-live binding | reflection live binding owner | 174 owner-side `LiveManifestBindingRef` projection | 唯一内部绑定事实为 owner-side `LiveManifestBindingRef`；CLI 不运行私有 reflection extraction，不携带 manifest 内容，不声称 validator availability |
| field list、field graph、field summary | field runtime inspect owner | 176 field-runtime inspect projection | field graph/plan 只输出 fieldPath-keyed semantic adjacency summary；不输出 raw node/edge/runtime object，不合成临时 graph id |
| canonical evidence envelope | verification control plane + evidence exporter | daemon lineage export、canonical evidence writer | live result 必须先转 evidence package 或 artifact ref 后进入 trial/compare |
| Workbench projection | 165 Workbench Kernel | Workbench projection adapter | Workbench 只投影事实与 gap，不反向拥有 Runtime fact |
| React host render/selector evidence | future react-host evidence owner | React host debug events | P2 deferred，未关闭前只能输出 structured gap |
| runtime profile summary | future local profiler owner | local-only profile summary hook | P2 deferred，沿用 171/15 profile lane，不进入 172 inspect facet family |

`Debug.*` hook 是 producer 或 source material，不是 public authority。它的输出必须先归一到上表的 fact family，再进入 CLI artifact。174 到 179 关闭后，当前 coverage harness 不再依赖 DevTools UI state 作为 inspect truth。

## Inspect Facet Contract

172 采纳 facet-first 合同，不采纳一个大而全的 `RuntimeInspectProjection` bundle。

核心 repo-internal 形态固定为：

```ts
interface LiveInspectFacetEnvelope<View extends string, Payload> {
  readonly kind: "live.inspect.facet"
  readonly view: View
  readonly target: LiveTargetDescriptor
  readonly sourceAuthority:
    | "runtime-live"
    | "reflection"
    | "field-runtime"
    | "react-host"
    | "evidence"
  readonly producer: string
  readonly payload?: Payload
  readonly artifactRef?: VerificationControlPlaneArtifactRef
  readonly budget: LiveBudgetProfile
  readonly gaps: ReadonlyArray<LiveEvidenceGap>
  readonly degraded?: LiveDegradedMarker
  readonly redacted?: ReadonlyArray<LiveRedactionMarker>
}
```

CLI stdout 继续使用 `LiveCommandResult`。inspect 类输出统一落入 `LiveInspectArtifact(section=...)`，而不是按命令扩张一组长期 artifact family。

`snapshot` 不是新事实模型。它只返回一个 bounded target bundle composition，内部由多个 facet refs 组成。

## Priority Closure

`parity-matrix.md` 是 172 route SSoT。其他文档只能引用或摘要它，不能另起一套命令到事实的映射。

优先级关闭规则：

- P0：必须在 172 实施中完成 owner-backed facet、operation facet 或 canonical evidence export。
- P1：必须至少完成 owner-backed artifact route 或 structured gap。若因内核 hook 缺失暂不能返回 payload，也必须返回稳定 gap、future owner 和 reopen bar。
- P2：默认 deferred。只保留未来 owner、structured gap 和 reopen bar，不阻塞 172。
- Rejected/Future：不提供 CLI route，matrix 必须写清楚拒绝原因或 future protocol 条件。

172 关闭时，P0/P1 rows 不允许出现空白 `CLI route`、`Fact authority`、`Artifact family` 或 `Evidence handoff`。

172 还必须通过 Runtime Inspect Coverage Harness。该 harness 以当前内核可 inspect fact family 为输入，证明每个 fact family 都有 CLI-visible route、owner-backed facet、structured gap、explicit deferred owner 或 rejected/future row。缺少 harness 证明时，不能宣称 172 已达到 Agent-first Runtime inspect data plane 终局。

## 双轨范围

### Lane A - Core Pressure Lane

这条 lane 记录为了让 CLI 达成 Runtime inspect data plane 而必须压出的内核升级。

必须压出的 owner-backed 能力：

- target-scoped inspect facet。
- bounded latest state 和 state path projection。
- live binding 到 reflection manifest 的 action/payload/validator 信息，唯一内部绑定事实为 owner-side `LiveManifestBindingRef`。
- dispatch 前 payload validation 与 static-live binding。
- target-scoped event/timeline projection，包含 `txnSeq / opSeq / linkId / stateAfter`。`stateAfter` 只允许来自 recorded post-event state、event-carried state artifact ref，或 watermark 精确匹配的 current head state；超预算或缺 source 时返回 gap。
- field list、fieldPath-keyed field graph/plan semantic adjacency、latest field summary 的 JSON-safe digest-guarded projection。
- operation summary projection，包含 event/txn count、field converge topN、degraded reasons。render/selector evidence 归入 P2 React host deferred。
- inspect facet 到 daemon lineage artifact、canonical evidence 和 Workbench projection 的桥接。

Lane A 的关闭标准不是“内核暴露全部内部对象”，而是：parity matrix 里的每个 P0/P1 问题都有 owner-backed facet、structured evidence gap 或明确 deferred reason。

### Lane B - CLI Product Lane

这条 lane 打磨 Agent 可用的 `logix live` 命令面。

冻结命令面：

```text
logix live inspect <target> [--attachment <attachmentId>]
logix live state --target <target> [--attachment <attachmentId>] [--path <path>]
logix live actions --target <target> [--attachment <attachmentId>]
logix live dispatch --target <target> [--attachment <attachmentId>] --action <tag> [--payload <json-or-file>]
logix live events --target <target> [--attachment <attachmentId>] [--kind <kind>] [--limit <n>]
logix live timeline --target <target> [--attachment <attachmentId>] [--field <path>] [--limit <n>]
logix live fields --target <target> [--attachment <attachmentId>]
logix live field-graph --target <target> [--attachment <attachmentId>]
logix live field-summary --target <target> [--attachment <attachmentId>]
logix live summary --target <target> [--attachment <attachmentId>]
logix live snapshot --target <target> [--attachment <attachmentId>]
logix live export evidence --from <daemon-lineage-ref> [--out <path>]
```

CLI lane 规则：

- `inspect <target>` 返回 target detail、host context、manifest digest 和 facet refs，不返回完整大 bundle。
- `state/actions/events/timeline/fields/field-graph/field-summary/summary` 是单 facet drilldown。
- `snapshot` 是 bounded target bundle composition，由 facet refs 组成。
- `capture` 仍是 event window / evidence capture，不和 inspect drilldown 合并。
- 所有 target-scoped 命令都必须支持 `--attachment`。多 attachment 命中时返回 `ambiguous-live-target`。
- 所有输出继续使用 `LiveCommandResult`，不输出 verification verdict。
- 所有 missing hook、redaction、over-budget、unsupported host、ambiguous target 都必须结构化为 evidence gap 或 degraded marker。
- 并发隔离继续沿用 `requestId + attachmentId + WebSocket connection`。
- 命令新增必须回写 `docs/ssot/runtime/15-cli-agent-first-control-plane.md`、CLI schema mirror 和 skills。

## 明确不属于 172

- DVTools 面板产品重启。
- 面板 layout、theme、open/closed、selected tab、expanded row、filter UI 等 host view state。
- time travel mutation、arbitrary state patch、dynamic eval、hidden internal mutation。
- browser CPU profile、heap snapshot、remote/cloud mutation、long-running raw stream。
- 新增 public `Runtime.inspect`、`Runtime.devtools`、`Logix.Reflection` root。
- 把 live result 升级成 `VerificationControlPlaneReport`。
- Workbench 自己读取 raw Runtime object 并生成事实。

## 需求

### Functional Requirements

- **FR-001**: System MUST maintain `parity-matrix.md` as the finite route SSoT mapping conceptual DevTools runtime questions to CLI commands, fact authority, producer hook, artifact family and evidence handoff.
- **FR-002**: CLI MUST provide a real `logix live inspect <target>` route, not a selected-target placeholder.
- **FR-003**: CLI MUST provide target-scoped state read, including bounded path read and missing/redacted path gaps.
- **FR-004**: CLI MUST provide target-scoped actions read, sourced from reflection/live binding through `LiveManifestBindingRef`, including payload kind, summary, schema digest and validator availability when known.
- **FR-005**: `logix live dispatch` MUST use owner-backed payload validation and static-live binding before admitted mutation.
- **FR-006**: CLI MUST provide bounded target-scoped events/timeline read with optional event kind and field filters; timeline `stateAfter` MUST NOT be backfilled from latest state for historical events.
- **FR-007**: CLI MUST provide field inspect routes or structured gaps for field list, fieldPath-keyed field graph/plan semantic adjacency and latest field summary.
- **FR-008**: CLI MUST provide operation summary projection for recent selected target activity.
- **FR-009**: Inspect outputs MUST be exportable as canonical evidence, Workbench-consumable projection input, artifact ref or explicit evidence gap.
- **FR-010**: Core pressure gaps MUST be implemented in owner modules or explicitly deferred; CLI MUST NOT compensate by inventing private Runtime truth.
- **FR-011**: All target-scoped commands MUST be attachment-first and preserve 171 concurrency isolation.
- **FR-012**: Live outputs MUST NOT include verification verdict, repair verdict, private session truth or CLI-owned report truth.
- **FR-013**: P1 rows MUST return either owner-backed payload or structured gap; silent omission is forbidden.
- **FR-014**: System MUST provide a Runtime Inspect Coverage Harness that maps current inspectable core runtime fact families to `parity-matrix.md` rows, CLI routes, artifact sections and proof refs.

### Non-Functional Requirements

- **NFR-001**: Runtime inspect hooks MUST be bounded and JSON-safe.
- **NFR-002**: Diagnostics disabled path MUST avoid material inspect overhead unless requested by live command.
- **NFR-003**: Sensitive, non-serializable or high-cardinality data MUST degrade into redaction markers, dropped markers or evidence gaps.
- **NFR-004**: Shared facet code MUST be reusable by CLI and future DVTools/Playground hosts without depending on React UI state.
- **NFR-005**: New command docs, CLI schema mirrors and skills MUST be updated when public live command surface changes.
- **NFR-006**: Serialization budget, redaction marker, degraded marker and disabled-overhead proofs MUST be part of 172 verification.
- **NFR-007**: Coverage harness output MUST be deterministic and must fail when a current core fact family lacks route, structured gap, deferred owner or rejected/future row.

## 成功标准

- **SC-001**: `logix live inspect <target>` returns real target detail from browser-backed runtime data.
- **SC-002**: Agent can list actions, read state, read events/timeline, inspect fields and dispatch declared actions without human log parsing.
- **SC-003**: Dispatch denial/completion cites owner-backed static-live binding and payload validation status.
- **SC-004**: Multi-tab and concurrent command tests prove no cross-tab or same-tab response mixing.
- **SC-005**: Inspect/capture/snapshot outputs can be exported as canonical evidence or structured gaps and consumed by Workbench projection.
- **SC-006**: Parity matrix has no blank owner/CLI/artifact/evidence cells for P0/P1 rows; P2 and Future rows have future owner and reopen bar.
- **SC-007**: Text sweep proves no new public `Runtime.inspect`, `Runtime.devtools`, `Logix.Reflection`, flat root live commands or live-owned verification verdicts.
- **SC-008**: Runtime Inspect Coverage Harness proves zero unmapped current core fact families and records the inventory digest, gap counts, deferred counts and evidence export proof in `notes/verification.md`.

## Imported Authority

- [../171-agent-live-runtime-bridge/spec.md](../171-agent-live-runtime-bridge/spec.md)
- [../171-agent-live-runtime-bridge/implementation-plan-concurrency-isolation.md](../171-agent-live-runtime-bridge/implementation-plan-concurrency-isolation.md)
- [../165-runtime-workbench-kernel/spec.md](../165-runtime-workbench-kernel/spec.md)
- [../167-runtime-reflection-manifest/spec.md](../167-runtime-reflection-manifest/spec.md)
- [../../docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)
- [../../docs/ssot/runtime/14-dvtools-internal-workbench.md](../../docs/ssot/runtime/14-dvtools-internal-workbench.md)
- [../../docs/ssot/runtime/09-verification-control-plane.md](../../docs/ssot/runtime/09-verification-control-plane.md)
- [../../docs/standards/logix-api-next-guardrails.md](../../docs/standards/logix-api-next-guardrails.md)

## Implementation Detail References

- [implementation-details/runtime-inspect-coverage-harness.md](./implementation-details/runtime-inspect-coverage-harness.md)
- [implementation-details/owner-gap-closure-analysis.md](./implementation-details/owner-gap-closure-analysis.md)
