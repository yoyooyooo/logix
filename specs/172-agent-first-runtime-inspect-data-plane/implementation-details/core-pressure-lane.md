# Core Pressure Lane

172 的 core pressure lane 只服务一个目标：让 CLI 终局问题有 owner-backed Runtime fact、structured gap 或 explicit deferred owner。

实施切片详见 [core-implementation-slices.md](./core-implementation-slices.md)。本文件保持 owner law 与禁止形态，切片文档负责具体 DTO、落点、gap taxonomy 和测试。

## 原则

- Runtime fact owner 在 runtime-live、reflection、field-runtime、evidence 或 future react-host/profile owner，不在 CLI。
- Projection 必须 bounded、JSON-safe、可降级。
- 不新增 public root API。
- 不让 Workbench Kernel 变成 Runtime fact owner。Workbench 只消费 owner-backed facts。
- 低层 runtime/debug hooks 只能作为 producer、source material 或 internal projection input，不能直接成为 CLI authority 文案。

## Owner / Producer Table

| Capability | Fact authority | Producer / hook | Implementation rule |
| --- | --- | --- | --- |
| target detail | runtime-live + 171 attachment | daemon target projection + bounded runtime target facet | `inspect <target>` 返回 detail 和 facet refs，不返回大 bundle |
| latest state | runtime-live | runtime-live current-state projection | owner-side read，CLI 不拼 path traversal |
| state path | runtime-live | owner-side path projection | missing/redacted/non-serializable path 返回 gap |
| action manifest | reflection | 174 `LiveManifestBindingRef` projection | browser/runtime owner projection 提供 binding ref，CLI 不跑 reflection，不传 manifest 内容 |
| payload validation | reflection + runtime-live | 174 dispatch admission + runtime-live operation lane | dispatch 先 validation/binding，失败 no mutation |
| event window | runtime-live | 175 `LiveOperationWindow` projection | bounded window，支持 optional `kind` filter |
| timeline stateAfter | runtime-live | 177 timeline projection over 175 source refs | `stateAfter` 只来自 recorded post-event state、event-carried artifact ref 或 exact watermark current head，缺 source/超预算 gap |
| operation summary | runtime-live + field-runtime | 178 summary composition over 175/176 | 不依赖 React DevTools UI state |
| final fields | field-runtime | 176 final field projection | 输出 field list / digest / source refs，不输出 raw runtime object |
| field graph/plan | field-runtime | 176 semantic adjacency projection | 输出 fieldPath-keyed semantic adjacency summary，不输出 raw node/edge 或临时 graph id |
| latest field summary | field-runtime | 176 latest field summary projection | target-scoped read，缺失返回 gap |
| evidence export | evidence | daemon lineage export + canonical evidence writer | live artifact refs 进入 canonical package |

## Field Inspect Rule

Field inspect projection must produce a safe summary:

- field path / field id where stable.
- dependency path summary.
- writer/evaluator kind.
- static or source digest guard when source mapping is included.
- convergence count/topN/degraded reason when known.
- budget markers for dropped nodes or large dependency sets.

It must not output:

- raw runtime field node objects.
- raw graph edge objects with private closures.
- evaluator closures or SubscriptionRef internals.
- unbounded source maps.

## Timeline Rule

`stateAfter` belongs to the timeline facet.

Allowed behavior:

- owner-side projection joins bounded event window only with recorded post-event state, event-carried state artifact ref, or current head state whose watermark exactly matches the timeline item.
- each item may include `txnSeq / opSeq / linkId / stateAfterRef / stateAfterPreview`.
- large or sensitive stateAfter becomes artifact ref, redaction marker or gap.
- missing true post-event state returns per-item gap; latest state must not be used as historical `stateAfter`.

Forbidden behavior:

- CLI-side roll-forward over raw events.
- unbounded state snapshot per event.
- React UI state as source of timeline truth.
- latest state backfill for historical event `stateAfter`.

## Action Manifest Rule

Live action manifest comes from reflection-backed live binding. The single internal binding fact is `LiveManifestBindingRef`.

Required output:

- binding id and binding status.
- target coordinate and manifest digest.
- action tag.
- payload kind or void marker.
- payload summary.
- schema digest when available.
- validator availability and binding status.
- stale/digest mismatch/missing validator denial shape.

Forbidden behavior:

- CLI private extraction from source files.
- Browser adapter inventing payload schema.
- Dispatch allowed only because an action name exists in UI state.
- CLI, daemon or browser adapter carrying full reflection manifest as binding truth.
- closing P0 actions/dispatch by accepting a structural `missing-live-manifest-binding` gap. That gap is allowed only for per-target transient failure after owner-side binding contract exists.

## Evidence Bridge Rule

Every daemon-backed inspect command should mint a lineage artifact ref unless it returns only a transport error.

The lineage record should include:

- command route and argv digest.
- target coordinate and attachment id.
- source authority and producer.
- budget/redaction/degraded markers.
- payload digest or artifact file ref.
- gaps.

Canonical evidence export consumes these refs; Workbench consumes canonical evidence or owner-approved artifact refs.
