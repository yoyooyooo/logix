# 数据模型：Agent Live Runtime Bridge

**状态**: 规划合同。以下 shape 是内部规划模型，不是 public API、DTO freeze 或 exported schema。

## 权威分层

```text
RuntimeAttachment substrate
AdapterAttachOffer
AttachmentSession
LiveTarget
TransportProjection
StaticLiveBindingHeader
OperationAdmissionRequest
OperationAdmissionOutcome
LiveOperationFacet
LiveCaptureFacet
CanonicalEvidenceHandoff
RuntimeWorkbenchAuthorityBundle
RuntimeWorkbenchProjectionIndex
VerificationControlPlaneReport
ResearchabilityEvidenceHeader
```

权威规则：

- Core 拥有 attachment authority、operation admission、identity coordinate、evidence producer feed。
- 167 拥有 static reflection facts 与 validator issue projection。
- 09 拥有 verification verdict、stage、compare admissibility。
- 165 只拥有 projection law。
- Adapter 只拥有 transport/auth/host lifecycle metadata。

## RuntimeAttachment

Planning label：

```ts
interface RuntimeAttachmentSubstrate {
  readonly attachmentId: string
  readonly runtimeCoordinate: RuntimeCoordinate
  readonly lifecycle: "disabled" | "offered" | "attached" | "draining" | "closed"
  readonly capabilities: ReadonlyArray<AttachmentCapability>
  readonly budgetPolicyRef: string
  readonly redactionPolicyRef: string
  readonly evidenceProducerRef?: string
}
```

规则：

- 不是 public name 或 exported schema。
- Disabled state 必须是 structural no-op。
- Lifecycle cleanup 必须 drain evidence，或带 marker 显式 drop evidence。

## AdapterAttachOffer

```ts
interface AdapterAttachOffer {
  readonly offerKind: "browser-dev" | "node-local" | "playground-host" | "cloud-remote" | "cli-daemon"
  readonly hostCoordinate: HostCoordinate
  readonly transport?: TransportProjection
  readonly transportRef?: string
  readonly authRef?: string
  readonly tenantRef?: string
  readonly requestedCapabilities: ReadonlyArray<AttachmentCapabilityKind>
  readonly lifecycleHints?: ReadonlyArray<"hmr" | "reload" | "process-exit" | "tab-close">
}
```

规则：

- Offer 不持有 authority。
- Cloud offer 必须包含 auth/tenant/session boundary。
- Browser dev offer 可以使用 hook-like discovery，但 exact global name 不冻结。
- Browser dev real carrier offer 必须由浏览器 adapter 通过 daemon WebSocket 提交；daemon 只记录 transport locator，不生成 runtime identity。
- Browser dev adapter 必须能通过 Vite dev plugin injection 或 `@logixjs/react/dev/live` dev-only import 安装；两种安装入口必须生成同一类 attachment offer 与 wire envelope。

## 坐标

```ts
interface RuntimeCoordinate {
  readonly runtimeId: string
  readonly moduleId?: string
  readonly instanceId?: string
  readonly txnSeq?: number
  readonly opSeq?: number
}

interface HostCoordinate {
  readonly hostKind: "browser" | "node" | "playground" | "cloud" | "cli-daemon"
  readonly processId?: string
  readonly tabId?: string
  readonly projectId?: string
  readonly url?: string
  readonly environmentFingerprintRef?: string
}

interface TransportProjection {
  readonly carrier: "websocket" | "ipc" | "stdio" | "in-process" | "test"
  readonly connectionId?: string
  readonly socketPath?: string
  readonly port?: number
  readonly health?: "connecting" | "ready" | "degraded" | "closed"
}
```

规则：

- Missing coordinate 产生 evidence gap。
- 禁止 random/time default identity，除非显式 injected 并记录为 host context。
- `tabId` 只是 browser host locator，不是 runtime identity。
- 同一 runtime/module/instance 出现在多个 browser tabs 时，必须按独立 attachment offer 投影；CLI 看到的是多个 attachment rows，而不是把它们压成一个 UI tab truth。
- `attachmentId + hostCoordinate + runtimeCoordinate` 才是多 tab / 多 process 场景里可比对的稳定 join 面。

## RealCarrierWireEnvelope

```ts
interface RealCarrierWireEnvelope<TPayload = unknown> {
  readonly schemaVersion: 1
  readonly id: string
  readonly role: "browser" | "cli" | "daemon"
  readonly type:
    | "host.offer"
    | "host.disconnect"
    | "live.targets.request"
    | "live.targets.response"
    | "live.operation.request"
    | "live.operation.response"
    | "live.evidence.export.request"
    | "live.evidence.export.response"
    | "live.status.request"
    | "live.status.response"
    | "live.error"
  readonly payload: TPayload
}
```

规则：

- Wire envelope 是 carrier DTO，不是 public API 或 evidence envelope。
- Envelope root 禁止出现 `repairHints`、`nextRecommendedStage`、`verdict`、`primaryReportOutputKey`。
- CLI IPC 与 browser WebSocket 可以使用同一 envelope family，也可以分开实现；无论实现形态如何，都必须映射回 attachment offer、target descriptor、operation facet、canonical evidence handoff 或 evidence gap。
- Vite plugin 和 dev-only import 不能定义不同 envelope family；它们只是同一 browser adapter 的安装入口。
- Daemon 只能把 connection lifecycle 投影成 attachment lifecycle hint，不得恢复 terminal attachment 为 writable live truth。

## LiveTarget

```ts
interface LiveTarget {
  readonly kind: "runtime" | "module" | "instance" | "transaction" | "operation" | "selector-route" | "host-binding"
  readonly coordinate: RuntimeCoordinate
  readonly status: "ready" | "busy" | "stale" | "closed" | "unknown"
  readonly hostContextRef?: string
  readonly evidenceGapReason?: string
}
```

规则：

- Target selection 不能依赖 human log parsing。
- Stale target 不能接收 mutation-capable operation。
- 多个 host attachment 可能共享同一 runtimeCoordinate；此时 selection 仍必须保留 attachment / host locator，以避免把并行 tab 混成同一个 target truth。

## StaticLiveBindingHeader

```ts
interface StaticLiveBindingHeader {
  readonly manifestDigest?: string
  readonly actionTag?: string
  readonly payloadSchemaRef?: string
  readonly validatorAvailabilityRef?: string
  readonly bindingStatus: "matched" | "stale" | "mismatch" | "unavailable" | "unknown"
  readonly reason?: string
  readonly runtimeCoordinate: RuntimeCoordinate
}
```

规则：

- Binding header 引用 reflection facts。
- 它不 mutate manifest 或 Runtime state。
- `actionContractDigest` 只能在 future proof 之后作为 internal-derived ref 存在。

## OperationAdmission

```ts
interface OperationAdmissionRequest {
  readonly actor: "agent" | "maintainer" | "test-harness" | "internal"
  readonly adapterKind: "browser-dev" | "node-local" | "playground-host" | "cloud-remote" | "cli-daemon"
  readonly operationKind:
    | "target.discover"
    | "capture.eventWindow"
    | "snapshot.read"
    | "wait.condition"
    | "evidence.export"
    | "dispatch.declaredAction"
    | "profile.runtimeSummary"
  readonly target: LiveTarget
  readonly binding?: StaticLiveBindingHeader
  readonly payloadRef?: string
  readonly permissionScope?: string
  readonly capabilityLeaseId?: string
  readonly leaseExpiresAt?: string
  readonly revoked?: boolean
  readonly originRef?: string
  readonly processRef?: string
  readonly budgetProfileRef: string
  readonly redactionPolicyRef: string
}

type OperationAdmissionOutcome =
  | { readonly kind: "accepted"; readonly operationCoordinate: RuntimeCoordinate }
  | { readonly kind: "denied"; readonly reason: string; readonly noMutation: true }
  | { readonly kind: "gap"; readonly reason: string }
```

规则：

- Stale manifest、digest mismatch、unavailable action contract、unauthorized target、missing validator for non-void dispatch -> denied and no mutation。
- Observation-only missing data -> gap。
- Runtime execution failure after acceptance -> operation failed facet，不是 denial。
- `profile.runtimeSummary` 在 P1 中是 local-only bounded summary。Browser CPU profile 与 heap snapshot 属于 P2/future。

## LiveOperationFacet

```ts
interface LiveOperationFacet {
  readonly facetKind: "operation"
  readonly eventKind: "operation.accepted" | "operation.completed" | "operation.failed" | "operation.denied"
  readonly actor: string
  readonly operationKind: string
  readonly targetCoordinate?: RuntimeCoordinate
  readonly binding?: StaticLiveBindingHeader
  readonly resultSummaryDigest?: string
  readonly reason?: string
  readonly sequence: number
  readonly budgetRef?: string
  readonly redactionMarkers?: ReadonlyArray<string>
}
```

规则：

- `operation.denied` 是 pre-mutation。
- `operation.failed` 是 post-admission。
- Workbench 可以 project operation facet，但没有 report/gap/degradation authority 时不能 invent diagnostic finding。

## LiveCaptureFacet

```ts
interface LiveCaptureFacet {
  readonly facetKind: "capture"
  readonly captureKind: "event-window" | "snapshot" | "profile" | "selector-route" | "host-commit"
  readonly coordinate?: RuntimeCoordinate
  readonly stageClass?: "static" | "startup" | "scenario" | "host-harness" | "drilldown-only"
  readonly windowRef?: string
  readonly artifactRef?: string
  readonly budgetRef?: string
  readonly sampling?: string
  readonly dropped?: boolean
  readonly degraded?: boolean
  readonly redactionMarkers?: ReadonlyArray<string>
}
```

规则：

- selector/host/profile/snapshot quality claims 必须携带 `stageClass`。
- Missing `stageClass` 降级为 drilldown 或 evidence gap。
- Live observation 不能 mint `runtime.check` 或 startup verdict。

## CanonicalEvidenceHandoff

```ts
interface CanonicalEvidenceHandoff {
  readonly evidencePackageRef: string
  readonly summaryDigest: string
  readonly facets: ReadonlyArray<LiveOperationFacet | LiveCaptureFacet>
  readonly artifactRefs: ReadonlyArray<string>
  readonly evidenceGaps: ReadonlyArray<EvidenceGap>
  readonly budgetMarkers: ReadonlyArray<string>
  readonly researchabilityHeader?: ResearchabilityEvidenceHeader
}
```

规则：

- 这是唯一 durable handoff。
- 额外 host files 只能作为 artifact refs 或 evidence gaps 出现。
- 不允许 live sidecar。

## ResearchabilityEvidenceHeader

```ts
interface ResearchabilityEvidenceHeader {
  readonly evidenceSummaryDigest: string
  readonly captureWindow: string
  readonly stageClass?: "static" | "startup" | "scenario" | "host-harness" | "drilldown-only"
  readonly admissibilityClass?: string
  readonly runtimeCoordinate?: RuntimeCoordinate
  readonly manifestDigest?: string
  readonly envFingerprintRef?: string
  readonly sourceDigestRef?: string
  readonly buildDigestRef?: string
  readonly budgetProfileRef?: string
  readonly samplingProfileRef?: string
  readonly redactionPolicyRef?: string
  readonly proofCommandRefs: ReadonlyArray<string>
  readonly metricRefs: ReadonlyArray<{ readonly ref: string; readonly owner: string; readonly unit: string }>
  readonly dropped?: boolean
  readonly degraded?: boolean
  readonly redacted?: boolean
  readonly gaps: ReadonlyArray<EvidenceGap>
  readonly authorityRef?: string
  readonly derivedFrom?: string
}
```

规则：

- 仅冻结 header。它不是 metric family、decision trace family、adoption ledger 或 verdict。
- Missing detailed decision data 变成 artifact ref、redaction marker 或 evidence gap。
- Workbench 可以 display header metadata，但不能 derive adopt/discard。

## Workbench 投影映射

| 输入 | 165 lane | 投影 |
| --- | --- | --- |
| canonical evidence envelope | `truthInputs` | evidence package session, artifact, metric, degradation, gap |
| operation facet | `truthInputs` | session/debugEvidence/artifact/degradation/gap |
| static-live binding header | `contextRefs` or facet metadata | digest guard, drilldown label, mismatch gap |
| selector/host facet with `stageClass` | `truthInputs` plus optional `contextRefs` | drilldown, artifact, degradation, evidence gap |
| selection manifest / selected target | `selectionHints` | initial focus/filter/order only |

禁止：

- Workbench-owned operation truth。
- 来自 live observation 的 check/startup verdict。
- 影响 finding id、severity 或 existence 的 selection hint。
