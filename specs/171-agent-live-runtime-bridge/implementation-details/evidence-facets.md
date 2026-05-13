# Evidence Facets 规划说明

本页记录 171 canonical live evidence facets 的实施前细节。它不是第二 evidence envelope。

## Operation facets

允许的 event kinds：

- `operation.accepted`
- `operation.completed`
- `operation.failed`
- `operation.denied`

规则：

- accepted 表示 admission passed。
- completed/failed 只能发生在 accepted 之后。
- denied 是 pre-mutation。
- denied 必须包含 no-mutation guarantee。

## Capture facets

允许的 capture kinds：

- `event-window`
- `snapshot`
- `profile`
- `selector-route`
- `host-commit`

每个 capture facet 应携带：

- coordinate 或 evidence gap。
- window 或 artifact ref。
- budget marker。
- 采样时带 sampling marker。
- 不完整时带 dropped/degraded marker。
- 为安全省略时带 redaction marker。

## Stage classification

Selector/host/profile/snapshot quality claims 使用：

- `static`
- `startup`
- `scenario`
- `host-harness`
- `drilldown-only`

缺少 `stageClass` 时降级为 drilldown 或 evidence gap。

## Workbench lanes

- Canonical evidence envelope -> `truthInputs`
- Operation facets -> `truthInputs`
- Capture facets -> `truthInputs`
- Binding header -> `contextRefs` 或 facet metadata
- Selection manifest -> `selectionHints`

不得产生 Workbench-owned fact。

## Researchability Header

171 只冻结 comparable evidence header，不冻结 metric family 或 decision trace family。

Header fields：

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

允许的有界 summary families：

- attachment lifecycle summary
- operation admission summary
- capture budget/drop/redaction summary
- selector route observation classification
- transaction 与 operation count summary
- evidence producer drop summary
- evidence export size 与 duration summary

规则：

- detailed traces 默认转为 artifact ref、redaction marker 或 evidence gap。
- high-cardinality 或 sensitive fields 默认转为 redaction marker 或 evidence gap。
- Workbench 可以把 header data 投影为 metric、degradation、drilldown 或 gap nodes。
- Workbench 不得从 researchability header data 创建 adopt/discard verdicts。
