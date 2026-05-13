# Core Implementation Slices

本文件把 172 core pressure lane 拆成可执行切片。它不替代 [../parity-matrix.md](../parity-matrix.md)，matrix 仍是 route SSoT；本文件只回答实施者在 core/runtime/reflection/field/evidence 层该怎么落。

## 范围

覆盖 work packets:

- `WP-002` P0 target/state inspect core
- `WP-003` P0 reflection/dispatch binding core
- `WP-005` P1 event/timeline/summary core
- `WP-006` P1 field inspect core
- `WP-008` evidence/workbench bridge

不覆盖 CLI parser、browser E2E、coverage harness、skills 文档改写。这些仍由 `WP-004 / WP-007 / WP-009 / WP-010 / WP-011` 持有。

## 共享合同

### 建议落点

| 职责 | 建议文件 |
| --- | --- |
| inspect facet DTO 与 constructors | `packages/logix-core/src/internal/runtime/core/liveInspect.ts` |
| live gap/redaction/degraded helper | `packages/logix-core/src/internal/runtime/core/liveEvidence.ts` 或其 sibling helper |
| target/state/event/timeline runtime projection | `packages/logix-core/src/internal/runtime/core/liveInspectRuntimeProjection.ts` |
| reflection/action live binding projection | `packages/logix-core/src/internal/reflection/staticLiveBinding.ts`、`packages/logix-core/src/internal/reflection/workbenchBridge.ts`、可选 `packages/logix-core/src/internal/reflection/liveActionProjection.ts` |
| field inspect projection | `packages/logix-core/src/internal/field-runtime/liveInspect.ts` 或 `packages/logix-core/src/internal/runtime/core/liveInspectFieldProjection.ts` |
| evidence/workbench mapping | `packages/logix-core/src/internal/runtime/core/liveEvidence.ts`、`packages/logix-core/src/internal/workbench/**` |
| repo bridge export surface | `packages/logix-core/src/internal/repoBridge/live.ts` |

如果本地模块已有更清楚的拆分模式，可以选择邻近文件名。禁止新增 public root，也禁止从 package public entrypoint re-export inspect API。

### 基础 DTO

所有切片输出同一类 facet family：

```ts
type LiveInspectSection =
  | "target-detail"
  | "state"
  | "state-path"
  | "actions"
  | "events"
  | "timeline"
  | "fields"
  | "field-graph"
  | "field-summary"
  | "summary"
  | "snapshot"
  | "react-host"

interface LiveInspectFacetPayloadBase {
  readonly schemaVersion: "live-inspect.v1"
  readonly generatedBy: string
}

interface LiveManifestBindingRef {
  readonly bindingId: string
  readonly target: LiveTargetDescriptor
  readonly manifestDigest: string
  readonly bindingStatus: "matched" | "missing" | "mismatch" | "stale" | "unknown"
  readonly sourceAuthority: "reflection"
  readonly programDigest?: string
  readonly moduleDigest?: string
  readonly actionManifestRef?: VerificationControlPlaneArtifactRef
  readonly validatorDigest?: string
}
```

规则：

- 完整 envelope 继续使用 [runtime-inspect-projection.md](./runtime-inspect-projection.md) 中的 `LiveInspectFacetEnvelope<View, Payload>`。
- payload 离开 owner module 前必须已经 JSON-safe。
- payload 不能暴露 runtime object reference、closure、`SubscriptionRef`、`Effect`、Layer、service map 或 raw graph node。
- owner 数据缺失时，必须返回 `payload` 为空且 `gaps` 非空的 facet。
- 超预算时必须设置 `degraded` 或 `gaps`；禁止 silent truncation。
- `LiveManifestBindingRef` 是 172 唯一 manifest binding fact。actions、dispatch、static-summary 都只能引用它；CLI/daemon/browser adapter 不能携带 manifest 内容来临时拼绑定。

### Gap Taxonomy

优先复用这些稳定 gap code。只有 matrix row 出现新失败类别时才新增。

| Gap code | 使用场景 |
| --- | --- |
| `missing-live-target` | target 在已解析 attachment 下不存在 |
| `missing-state-projection` | state owner 没有可读 projection |
| `missing-state-path` | 请求的 state path 不存在 |
| `redacted-state-path` | path 存在但 redaction policy 阻止输出 |
| `non-serializable-state-value` | 值存在但不能安全 JSON 序列化 |
| `state-over-budget` | state 或 path payload 超预算 |
| `missing-live-manifest-binding` | target 不能绑定 reflection manifest |
| `stale-manifest-digest` | 请求 digest 已过期 |
| `payload-validation-unavailable` | non-void payload 无法 owner-side validation |
| `missing-event-producer` | event owner 不能提供 bounded event window |
| `unsupported-event-kind` | `events --kind` 没有 owner-backed producer |
| `missing-operation-window` | summary 找不到 bounded recent operation window |
| `state-after-over-budget` | timeline item 不能在预算内输出 stateAfter |
| `missing-field-event-meta` | field timeline 缺少稳定 field metadata |
| `missing-field-owner-projection` | field owner 没有 safe projection |
| `field-graph-over-budget` | field graph/plan 超预算 |
| `missing-latest-field-summary` | latest field summary 不可按 target 获取 |
| `canonical-evidence-export-unavailable` | lineage artifact 不能导出 canonical evidence |

### 必测文件

core 切片至少补这些定向测试。文件可继续拆小，但命名必须按行为/合同：

- `packages/logix-core/test/internal/LiveBridge/live-inspect-facet.contract.test.ts`
- `packages/logix-core/test/internal/LiveBridge/live-inspect-state.contract.test.ts`
- `packages/logix-core/test/internal/LiveBridge/live-inspect-actions.contract.test.ts`
- `packages/logix-core/test/internal/LiveBridge/live-inspect-events.contract.test.ts`
- `packages/logix-core/test/internal/LiveBridge/live-inspect-fields.contract.test.ts`
- `packages/logix-core/test/internal/LiveBridge/live-inspect-evidence-bridge.contract.test.ts`

测试必须覆盖 DTO shape、owner/gap law、serialization safety、disabled-overhead。

## Slice A - Facet Foundation

Matrix rows: all inspect rows.

Owner:

- Runtime core 拥有 repo-internal facet constructors 与共享 gap helpers。
- CLI 只在 daemon 返回 artifacts 后负责 stdout transport。

实施步骤：

1. 增加 `LiveInspectFacetEnvelope`、`LiveInspectArtifact`、section names、source authority types。
2. 增加 `makeLiveInspectFacet`、`makeLiveInspectGap`、redaction/degraded helpers。
3. 增加 max inline bytes 与 deterministic digest budget helper。
4. 增加 JSON-safety guard，拒绝 function、symbol、未显式表示的 bigint、循环引用、已知 runtime object ref。
5. 增加测试证明非法值会变成 gap 或 redaction marker。

禁止实现：

- 不新增 `Runtime.inspect`、`Runtime.devtools` 或 `Logix.Reflection`。
- 不把单个 `RuntimeInspectProjection` 大对象作为 convenience 加回来。
- 不让 CLI 从任意 JSON 拼 `LiveInspectArtifact`。

证明要求：

- facet constructor 会 normalize target coordinate，并保留 `sourceAuthority`。
- `payload` 缺失时必须有 `gaps.length > 0`。
- 高基数 payload 可以转 artifact ref 或 gap。
- diagnostics disabled path 不分配 event buffer 或 projection cache。

## Slice B - Target And State Inspect

Matrix rows: `R172-002`、`R172-003`、`R172-004`，并支撑 `R172-009`。

Owner:

- target identity 继续归 171 live attachment registry。
- state projection 归 runtime-live owner。

输入：

- `LiveTargetDescriptor`
- optional state path string
- `LiveBudgetProfile`
- redaction policy ref

输出 payload:

```ts
interface LiveTargetDetailPayload extends LiveInspectFacetPayloadBase {
  readonly target: LiveTargetDescriptor
  readonly hostContext?: {
    readonly hostKind: string
    readonly url?: string
    readonly environmentFingerprintRef?: string
  }
  readonly manifestDigest?: string
  readonly availableSections: ReadonlyArray<LiveInspectSection>
}

interface LiveStatePayload extends LiveInspectFacetPayloadBase {
  readonly digest: string
  readonly preview?: unknown
  readonly sizeBytes?: number
  readonly truncated?: boolean
}

interface LiveStatePathPayload extends LiveInspectFacetPayloadBase {
  readonly path: string
  readonly exists: true
  readonly valueDigest: string
  readonly valuePreview?: unknown
  readonly valueKind: "primitive" | "object" | "array" | "null"
}
```

实施步骤：

1. 从 attachment-first 输入解析唯一 `LiveTargetDescriptor`。
2. 在 runtime-live owner 中实现 latest state bounded projector；不可读时返回 `missing-state-projection`。
3. path 解析在 owner projection 内做，不在 CLI 内做。第一波只支持 dot path 与 `$root`。
4. redaction 先于 serialization。
5. budget 检查在 redaction 后、payload 离开 owner 前执行。
6. 将 `target-detail`、`state`、`state-path` facets 接入 live operation lane。

禁止实现：

- CLI-side path traversal over raw state。
- 序列化整个 runtime 或 module instance。
- 用 browser title/url 当 target identity。
- 返回无 digest 或无 budget marker 的 state。

证明要求：

- state path exists、missing path、redacted path、non-serializable value、over-budget value。
- 同一 target coordinate 出现在两个 attachment 时，daemon/CLI 必须要求显式 `attachmentId`。
- disabled live bridge 不分配 state projection cache。

## Slice C - Reflection Actions And Dispatch Binding

Matrix rows: `R172-005`、`R172-006`、`R172-007`、`R172-008`、`R172-021`。

Owner:

- reflection 拥有 static action/payload/validator facts。
- runtime-live 拥有 operation admission 与 dispatch result。

输入：

- live target descriptor
- owner-side `LiveManifestBindingRef`
- optional `actionTag`、`payloadSchemaRef`、`validatorAvailable`
- user payload as JSON transport value

输出 payload:

```ts
interface LiveActionInspectPayload extends LiveInspectFacetPayloadBase {
  readonly binding: LiveManifestBindingRef
  readonly actions: ReadonlyArray<{
    readonly actionTag: string
    readonly payloadKind: "void" | "nonVoid" | "unknown"
    readonly payloadSummary?: string
    readonly schemaDigest?: string
    readonly validatorAvailable?: boolean
    readonly bindingStatus: "matched" | "missing" | "mismatch" | "stale" | "unknown"
  }>
}
```

实施步骤：

1. 在 reflection/live owner 内生成 `LiveManifestBindingRef`。它可以指向 167 manifest artifact，但不能复制出第二套 manifest contract。
2. 用 `bindingId / target / manifestDigest / bindingStatus` 作为 actions、dispatch、static-summary 的唯一绑定事实。
3. 复用 `checkStaticLiveBinding` 判断 digest/action/validator status，并把结果投影到 `LiveManifestBindingRef` 或 operation binding header。
4. 复用现有 payload summary shape，不发明第二套 payload schema model。
5. dispatch validation 必须通过 browser/runtime owner，在 mutation 前完成。
6. stale digest、mismatch、unavailable action、missing validator 返回 `operation.denied` 且 `noMutation: true`。
7. accepted/completed/failed operation facets 必须携带由 `LiveManifestBindingRef` 派生的 binding header。

禁止实现：

- CLI-side reflection extraction from source files。
- Browser adapter 发明 payload schema。
- 只因为 action name 存在就允许 dispatch。
- reflection owner 没说 `validatorAvailable=true` 时自行标 true。
- CLI、daemon 或 browser adapter 传完整 `RuntimeReflectionManifest` / minimum action manifest 作为绑定事实。
- 将 `missing-live-manifest-binding` 作为 P0 结构性关闭条件。P0 只能因单个 target transient failure 返回该 gap；实现必须提供 owner-side binding contract。

证明要求：

- `LiveManifestBindingRef` 可以由 owner-side projection 生成，并被 actions、dispatch、static-summary 复用。
- action list 包含 payload kind、schema digest、validator availability。
- stale manifest、digest mismatch、unknown action、missing validator 产生 no-mutation denial。
- void action 可以无 payload validator dispatch。
- non-void payload 没有 validator 时不能 mutate。

## Slice D - Events, Timeline And Summary

Matrix rows: `R172-010` 到 `R172-015`、`R172-019`、`R172-020`。

Owner:

- runtime-live 拥有 event window 与 timeline。
- field-runtime 提供 field convergence summary。
- reflection 可以用 static summary enrich process events。

第一波 event kind:

- `diagnostic`
- `process`
- `operation`
- `state`
- `field`

输出 payload:

```ts
interface LiveEventWindowPayload extends LiveInspectFacetPayloadBase {
  readonly events: ReadonlyArray<{
    readonly eventId: string
    readonly kind: string
    readonly txnSeq?: number
    readonly opSeq?: number
    readonly linkId?: string
    readonly summary: string
    readonly artifactRef?: VerificationControlPlaneArtifactRef
  }>
  readonly droppedCount?: number
}

interface LiveTimelinePayload extends LiveInspectFacetPayloadBase {
  readonly items: ReadonlyArray<{
    readonly eventId: string
    readonly txnSeq?: number
    readonly opSeq?: number
    readonly linkId?: string
    readonly stateAfterPreview?: unknown
    readonly stateAfterRef?: VerificationControlPlaneArtifactRef
    readonly gaps?: ReadonlyArray<LiveEvidenceGap>
  }>
}

interface LiveOperationSummaryPayload extends LiveInspectFacetPayloadBase {
  readonly eventCount?: number
  readonly txnCount?: number
  readonly fieldConvergeTopN?: ReadonlyArray<{
    readonly fieldPath: string
    readonly count: number
    readonly degraded?: string
  }>
  readonly degradedReasons?: ReadonlyArray<string>
}
```

实施步骤：

1. 从 runtime-live owner 投影 bounded event window。
2. `kind` filter 必须在 owner projection 中执行。
3. 没有 owner producer 的 kind 返回 `unsupported-event-kind`。
4. timeline 从 owner-side event window 与 event-causal post-state source 生成。
5. `stateAfter` 只允许来自 recorded post-event state、event 自带 artifact ref，或 watermark 精确匹配该 timeline item 的 current head state。
6. 没有真实 post-event source 时，返回 per-item `missing-operation-window` gap；存在真实 source 但预算不足时，返回 `state-after-over-budget`。
7. summary 只从 bounded event window 与 field summary 生成；render count 保持 P2 React host deferred。

禁止实现：

- CLI-side roll-forward over raw events。
- React UI state 作为 timeline source。
- unbounded event stream 或 long-running raw stream。
- P1 summary 在没有 React host evidence owner 时派生 render count。
- 用 latest state 回填历史 timeline item 的 `stateAfter`。

证明要求：

- event kind filter 只返回 owned kinds。
- unknown/unsupported kind 返回 structured gap。
- timeline item 在可用时携带稳定 `txnSeq / opSeq / linkId`。
- 没有 recorded post-event state 时，timeline item 返回 gap 而不是 latest state。
- `stateAfter` 超预算返回 `state-after-over-budget`。
- summary 不含 render count，但能报告 txn/event/field converge 数据。

## Slice E - Field Inspect

Matrix rows: `R172-016`、`R172-017`、`R172-018`，并支撑 `R172-015`。

Owner:

- field-runtime 拥有 field list、field graph/plan summary、latest field summary。
- internal debug hooks 只能作为 producer fallback，不是 authority。

输出 payload:

```ts
interface LiveFieldListPayload extends LiveInspectFacetPayloadBase {
  readonly fields: ReadonlyArray<{
    readonly fieldId: string
    readonly path: string
    readonly description?: string
    readonly provenanceDigest?: string
  }>
}

interface LiveFieldGraphPayload extends LiveInspectFacetPayloadBase {
  readonly graphDigest?: string
  readonly staticIrDigest?: string
  readonly nodeCount?: number
  readonly edgeCount?: number
  readonly fields: ReadonlyArray<{
    readonly fieldPath?: string
    readonly fieldId?: string
    readonly provenanceDigest?: string
    readonly writerKind?: string
    readonly writers?: ReadonlyArray<{
      readonly writerKind: string
      readonly sourceDigest?: string
    }>
    readonly dependencyPathTopN?: ReadonlyArray<string>
    readonly droppedDependencyCount?: number
    readonly dependsOn?: ReadonlyArray<{
      readonly fieldPath: string
      readonly relationDigest?: string
      readonly edgeKind?: "dependency" | "writer" | "unknown"
    }>
    readonly degradedReason?: string
  }>
  readonly truncated?: boolean
  readonly degradedReasons?: ReadonlyArray<string>
}

interface LiveFieldSummaryPayload extends LiveInspectFacetPayloadBase {
  readonly summaries: ReadonlyArray<{
    readonly fieldPath: string
    readonly convergeCount?: number
    readonly lastTxnSeq?: number
    readonly degradedReason?: string
  }>
}
```

实施步骤：

1. 优先使用 field-runtime owner projection；internal `Debug.*` helper 只能是 fallback producer。
2. final fields 从 finalized module field snapshot 映射。
3. graph/plan 映射为 fieldPath-keyed adjacency summary，不返回 generic `nodes/edges/from/to`。
4. 只有 owner 提供稳定 `fieldPath` 或 digest-guarded semantic id 时，字段才进入 `fields[]`。
5. 无法稳定映射的 raw node/edge 只进入 `nodeCount / edgeCount / droppedDependencyCount / degradedReasons`，或返回 gap。
6. field graph 超预算时返回 `field-graph-over-budget`。
7. 没有 safe field projection 时返回 `missing-field-owner-projection`。
8. summaries 不能按 target 获取时返回 `missing-latest-field-summary`。

禁止实现：

- 返回 raw `FieldProgram`、raw graph、raw plan 或 evaluator closure。
- 暴露 `SubscriptionRef`、resource handle 或 runtime internals。
- source path mapping 没有 digest guard 时当作有效输出。
- 合成临时 graph node id、edge id 或 raw-like `from/to` 关系。

证明要求：

- 从有 field snapshot 的 module 输出 final fields projection。
- graph/plan projection 只包含 fieldPath-keyed adjacency summary。
- 缺稳定 field identity 或 digest guard 时返回 gap/degraded，不合成 id。
- graph 超预算返回 degraded/gap。
- 缺 field snapshot 返回 structured gap。

## Slice F - Evidence And Workbench Bridge

Matrix row: `R172-022`。

Owner:

- daemon lineage 拥有 live command artifact reference。
- canonical evidence exporter 拥有 evidence package。
- Workbench 只消费 evidence、artifact refs 和 gaps。

lineage payload 最小形态：

```ts
interface LiveInspectLineagePayload {
  readonly command: string
  readonly argvDigest: string
  readonly target: LiveTargetDescriptor
  readonly sourceAuthority: string
  readonly producer: string
  readonly section: LiveInspectSection
  readonly requestId?: string
  readonly attachmentId: string
  readonly connectionId?: string
  readonly payloadDigest?: string
  readonly artifactRef?: VerificationControlPlaneArtifactRef
  readonly gaps: ReadonlyArray<LiveEvidenceGap>
}
```

实施步骤：

1. 每个 daemon-backed inspect command 都 mint lineage artifact ref，除非返回 transport error。
2. lineage metadata 保留 `requestId + attachmentId + WebSocket connection`，用于 isolation proof。
3. 将 `LiveInspectArtifact(section=...)` 映射为 canonical evidence artifact entries。
4. gaps/redaction/degraded markers 映射为 canonical evidence gap 或 metadata entries。
5. Workbench adapter 只消费 canonical evidence packages、owner-approved refs 与 gaps。

禁止实现：

- Workbench 读取 raw inspect payload 作为 standalone truth。
- 多个 lineage refs 命中时用 bare `captureId` export。
- 导出 lineage metadata 时丢失 attachment id 或 connection id。

证明要求：

- 能从 state/actions/events/fields artifacts export evidence。
- duplicate bare artifact refs 返回 `ambiguous-live-artifact-ref`。
- Workbench projection 只拿 refs/gaps，不拿 raw Runtime object。
- forged response 不能为另一个 connection mint lineage。

## 执行顺序

推荐顺序：

1. Slice A foundation。
2. Slice B target/state P0。
3. Slice C actions/dispatch P0。
4. Slice F lineage/export for P0 artifacts。
5. Slice D events/timeline/summary P1。
6. Slice E field inspect P1。
7. 回到 Slice F 补 P1 evidence/workbench mappings。

这个顺序先给 CLI product lane 一个稳定的 P0 core surface，再扩展 P1 drilldown。
