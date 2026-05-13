# 合同：Agent Live Runtime Bridge

**状态**: 内部规划合同。不是公开 API，不冻结 DTO 名称。CLI live command surface 只按 `logix live <task>` 公开，且所有语义归 core-owned attachment、operation、capture 与 canonical evidence handoff。

## 合同 1：Attachment Authority

Core 拥有：

- runtime identity coordinate
- lifecycle state
- capability gate
- operation admission
- evidence producer feed
- canonical evidence handoff
- budget/redaction constraints
- cleanup invariant
- post-commit IO boundary

Adapters 只拥有：

- attach offer
- transport metadata
- auth metadata
- host lifecycle hints
- host-specific discovery

禁止：

- adapter-owned runtime identity
- adapter-owned operation authority
- adapter-owned evidence envelope
- adapter-owned session/finding/report/verdict truth

## 合同 2：Disabled Path

Disabled bridge behavior 必须是 structural no-op 或 static-empty。

disabled hot path 禁止：

- per-transaction adapter discovery
- transport allocation
- listener fanout
- capture buffer allocation
- serialization
- IO

必需证据：

- before/after perf artifact
- disabled mode allocation/commit evidence
- explicit failure policy for noisy perf runs

## 合同 3：Operation Admission

P1 operation allowlist:

- `target.discover`
- `capture.eventWindow`
- `snapshot.read`
- `wait.condition`
- `evidence.export`
- `dispatch.declaredAction`
- `profile.runtimeSummary`，作为 local-only bounded summary

Admission outcome taxonomy：

```text
matched binding + authorized target
  -> operation.accepted
    -> operation.completed | operation.failed

stale manifest | digest mismatch | unavailable action contract | unauthorized target | missing validator for non-void dispatch
  -> operation.denied
    -> no mutation

observation-only missing data
  -> evidence.gap
```

规则：

- `operation.denied` 是 pre-mutation。
- `operation.failed` 是 post-admission。
- Static binding failure 不能隐藏成 runtime failure。
- 缺失 observation data 时不能升级为 denial，除非请求了 mutation。

已拒绝 operations：

- arbitrary state patch
- time travel mutation
- hidden internal mutation
- undeclared action dispatch
- dynamic code eval
- host DOM mutation through bridge
- transaction-window IO
- unbounded raw trace stream

## 合同 3A：Admission Request Fields

Admission request 最小字段：

- actor id
- adapter kind
- session、tenant 或 process boundary，存在时必填
- target coordinate
- operation kind
- permission scope
- 使用 capability lease 时，必须包含 lease id、过期时间和撤销状态
- origin 或 process id，存在时必填
- mutation-capable 时必须包含 static-live binding header
- budget profile
- redaction policy ref

## 合同 3B：Researchability Header

171 只冻结 comparable evidence header：

- `evidenceSummaryDigest`
- `captureWindow`
- `stageClass` 或 admissibility class
- `runtimeCoordinate`
- `manifestDigest`
- `envFingerprintRef`
- `sourceDigestRef` 或 build digest ref，存在时提供
- `budgetProfileRef`
- `samplingProfileRef`
- `redactionPolicyRef`
- `proofCommandRef[]`
- `metricRef[]`，只包含 owner 与 unit
- `dropped`, `degraded`, `redacted`
- `gap[]`
- `authorityRef` or `derivedFrom`

禁止：

- 171 内的 metric family authority
- 171 内的 decision trace family
- adoption algebra
- adoption ledger
- autonomous adopt/discard
- merge/publish/release authority

## 合同 4：Static Reflection / Live Evidence Split

Reflection 拥有：

- declaration
- Program/module contract
- action tag
- payload schema summary
- validator availability and issue shape
- sourceRef
- manifest digest
- manifest diff

Live evidence 拥有：

- active runtime/module/instance
- transaction and operation facts
- operation admission/result/denial
- selector route observation
- host commit
- profile
- snapshot
- capture budget/drop/redaction/degraded markers

禁止：

- produced runtime evidence inside manifest
- live-owned validator
- second manifest family
- durable live sidecar

## 合同 5：Canonical Evidence Handoff

Live bridge output 只能持久交接：

- canonical evidence package
- canonical evidence event/artifact facets
- target or selection coordinates
- artifact refs
- evidence gaps
- budget/sampling/drop/degraded/redaction markers

禁止：

- second evidence envelope
- live session envelope as durable truth
- `CommandResult` as live transport truth
- host files outside artifact refs or gaps

## 合同 6：Workbench Projection

165 消费：

- `truthInputs`
- `contextRefs`
- `selectionHints`

规则：

- Live facets 只有在 canonical evidence normalization 后才能进入 `truthInputs`。
- Static binding refs 进入 `contextRefs` 或 facet metadata。
- Selection manifests 只能进入 `selectionHints`。
- Workbench 可以投影 sessions、artifacts、metrics、drilldowns、degradation notices 和 evidence gaps。
- Workbench 不能创建 report truth、verdict truth、operation truth 或 standalone denial truth。

## 合同 6A：Run Evidence Repair Closure

运行证据进入修复闭环只能走一条路径：

```text
logix live ...
  -> LiveCommandResult repair clues
    -> canonical evidence package / artifact refs / evidence gaps
      -> runtime.trial or runtime.compare
        -> VerificationControlPlaneReport.repairHints
```

`LiveCommandResult` 可以携带：

- operation denial reason
- evidence gap
- degraded marker
- target coordinate
- binding header
- sourceRef or declaration coordinate ref when available
- artifact refs

`LiveCommandResult` 禁止携带：

- `repairHints`
- repair policy
- `nextRecommendedStage`
- verification verdict
- report-owned focusRef authority

规则：

- repair advice authority 只属于 `VerificationControlPlaneReport.repairHints`。
- live-derived evidence 触发 localized verification failure 时，repair hint 必须通过 `relatedArtifactOutputKeys`、evidence refs 或 owner-approved stable coordinate 追溯到 live evidence。
- evidence gap 或 operation denial 可以成为 repair clue；只有 verification report 可以把它升级为 finding 或 repair hint。
- Workbench 可以展示 repair clues 和 report-linked hints，但不能独立创建修复裁决。

## 合同 7：Selector / Host Stage Authority

Selector-route、host-commit、profile、snapshot quality claims 必须携带：

```text
stageClass = static | startup | scenario | host-harness | drilldown-only
```

规则：

- `static` 与 `startup` 需要 control-plane report 或 artifact authority。
- `scenario` 与 `host-harness` 需要 explicit scenario evidence 或 repo-internal host-harness artifact authority。
- `drilldown-only` 可以展示，但不能成为 check/startup verdict。
- Missing `stageClass` 降级为 drilldown 或 evidence gap。

## 合同 8：CLI Boundary

当前 public CLI：

```text
logix check
logix trial
logix compare
logix live <task>
```

当前 public live command set 只允许：

```text
logix live start
logix live stop
logix live status
logix live targets
logix live inspect
logix live capture
logix live snapshot
logix live wait
logix live dispatch
logix live profile start|stop|summary
logix live export evidence
```

规则：

- Flat root commands `logix status/capture/snapshot/wait/export` 不存在。
- `trigger` 不进入 public CLI；mutation command 固定为 `logix live dispatch`，并映射 core-owned `dispatch.declaredAction`。
- `CommandResult` 保持为 `check / trial / compare` 的 stdout envelope。
- `LiveCommandResult` 服务 `logix live` stdout transport，但不拥有 report、stage、policy、verdict、operation authority、runtime identity、session 或 evidence-envelope authority。
- Internal bridge transport 可以存在，但只作为 public live command 和 adapters 背后的 repo-internal projection，不能形成第二 runtime truth。

当前 implementation closure：

- semantic MVP 已用 in-process proof transport 证明 owner law。
- real carrier 已补齐 local daemon、browser WebSocket adapter、CLI IPC client、Vite dev plugin entry 与 `@logixjs/react/dev/live` dev-only import entry。
- `logix live status/targets/capture/snapshot/wait/dispatch/profile/export` 在 real carrier 路径中优先使用 daemon-backed artifacts；daemon 不存在时返回 stopped status 或 `live-daemon-not-running` evidence gap。
- daemon-backed `LiveCommandResult` 与 proof transport 适用同一禁止字段：不得包含 `repairHints`、`nextRecommendedStage`、verification verdict、report focus authority 或 evidence-envelope authority。
- daemon lifecycle metadata 是 carrier-local operator snapshot，不是 public file contract 或 runtime/attachment/evidence/report truth。

## 合同 9：Security And Redaction

所有 attachment modes 都需要：

- remote/cloud 需要 explicit auth
- cloud 需要 tenant/session boundary
- revocation
- audit evidence
- redaction policy
- cloud 无 `globalThis` authority
- transaction window 内无 IO

Remote/cloud details 在 local semantics 被证明后后置到 future product protocol。

## 合同 10：重开门槛

重开需要证明当前采纳模型失败，并且替代方案至少改善一个 dominance axis，同时不制造：

- public surface expansion
- second truth
- second envelope
- live validator
- reflection-owned active runtime facts
- Workbench-owned fact

## 合同 11：Host / Transport / Multi-Tab Topology

终局要求：

- browser tab、Node process、Playground host 和 cloud session 都只属于 host coordinate 层。
- `tabId` 是 browser host metadata，可选、辅助、可丢失，不是 runtime identity。
- `attachmentId` 是 attachment offer / session 的稳定 join key。
- 同一 runtime/module/instance 出现在多个 tab 时，必须表现为多个 attachment offer，而不是一个 tab-first runtime truth。
- CLI 和 Workbench 可以展示 host locator、attachment refs 和 target coordinate，但不能靠页面标题、tab 顺序或日志文本推断身份。
- local-dev carrier 可以是 WebSocket、socket、stdio、IPC 或 daemon projection；carrier 不是 owner。
- 任何 carrier 变更都不得改变 attachment authority、admission taxonomy、canonical evidence handoff 或 verification closure 路径。

## 合同 12：Real Local Carrier Delta

Real local carrier 的最小合同：

```text
browser dev adapter
  -> WebSocket
    -> local daemon transport projection
      -> local IPC
        -> logix live
```

daemon 可以拥有：

- connection id
- socket path / port / metadata file
- connection health
- browser close / reload / daemon stop hints
- transport-local request correlation id

daemon 禁止拥有：

- runtime identity
- operation admission truth
- evidence envelope truth
- Workbench session/finding/artifact truth
- verification verdict or repair advice

browser adapter 可以拥有：

- host coordinate and optional `tabId`
- project/url/environment locator
- runtime binding snapshot derived from React dev lifecycle carrier
- connection lifecycle hints
- installation through Vite dev plugin injection or `@logixjs/react/dev/live` dev-only import, as long as both entries call the same adapter contract

browser adapter 禁止拥有：

- second React host registry
- random runtime id
- second browser bridge protocol between plugin and import paths
- validator truth
- repair verdict
- React DevTools protocol authority for Logix evidence

proof requirements：

- one browser tab -> one attachment row
- Vite dev plugin and dev-only import -> same `host.offer` wire contract
- lightweight dev-only import page -> browser -> daemon -> CLI/IPC chain works without Playground
- two browser tabs -> two attachment rows even if runtime coordinate matches
- WebSocket close/reload/daemon stop -> disconnected/degraded/terminal attachment state
- `capture/snapshot/export evidence` -> daemon-backed artifact or canonical evidence package, not in-process proof gap
- no daemon / disabled bridge -> structured status or evidence gap without hot-path IO
