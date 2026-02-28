### logix-perf (summary)
- scope: `test/browser/perf-scenarios`
- profile: `default`
- envId: `darwin-arm64.local`
- base: `baseline`  head: `head`

### Conclusion
- comparable: `false`
- comparability config drift: `matrixHash: before=72024dcbdc8cc0df7195ac982026eaf68ebcb86fc217f6fa9e7a8ab59bb8e7d9 after=5e43bddfd8e970072889caaf89dbcbb154d0c4c750b9cf02683a014f6c80bc0d`
- diff: regressions=`0`, improvements=`0`
- scenario suite deltas(`examples.logixReact.scenarios`): `0`
- scenario evidence signals: memory=`5`, diagnostics=`4`
- head budgetExceeded: `0`
- head auto-probe sufficiency: insufficient=`0`, reasonCodes=`none`
- status: `triage_only_not_comparable`

**Scenario evidence signals (`examples.logixReact.scenarios`)**
- `memory.gcSupported`: before=`n/a` after=`true` `memory.gcSupported(points) unit=count: before[value=undefined ok=0 unavailable=0 missing=15] after[value=true ok=15 unavailable=0 missing=0]`
- `memory.heapDriftBytes`: before=`n/a` after=`6495484` `memory.heapDriftBytes(points) unit=bytes: before[value=undefined ok=0 unavailable=0 missing=15] after[value=6495484 ok=15 unavailable=0 missing=0]`
- `memory.heapDriftRatio`: before=`n/a` after=`0.06943138708437167` `memory.heapDriftRatio(points) unit=ratio: before[value=undefined ok=0 unavailable=0 missing=15] after[value=0.06943138708437167 ok=15 unavailable=0 missing=0]`
- `memory.heapEndBytes`: before=`n/a` after=`106413106` `memory.heapEndBytes(points) unit=bytes: before[value=undefined ok=0 unavailable=0 missing=15] after[value=106413106 ok=15 unavailable=0 missing=0]`
- `memory.heapStartBytes`: before=`n/a` after=`106058742` `memory.heapStartBytes(points) unit=bytes: before[value=undefined ok=0 unavailable=0 missing=15] after[value=106058742 ok=15 unavailable=0 missing=0]`
- `diagnostics.level`: before=`off` after=`off` `diagnostics.level(points) unit=count: before[value=off ok=15 unavailable=0 missing=0] after[value=off ok=15 unavailable=0 missing=0]`
- `diagnostics.overheadLevel`: before=`n/a` after=`off` `diagnostics.overheadLevel(points) unit=count: before[value=undefined ok=0 unavailable=0 missing=15] after[value=off ok=15 unavailable=0 missing=0]`
- `diagnostics.overheadMs`: before=`n/a` after=`0` `diagnostics.overheadMs(points) unit=count: before[value=undefined ok=0 unavailable=0 missing=15] after[value=0 ok=15 unavailable=0 missing=0]`
- `diagnostics.overheadRatio`: before=`n/a` after=`0` `diagnostics.overheadRatio(points) unit=ratio: before[value=undefined ok=0 unavailable=0 missing=15] after[value=0 ok=15 unavailable=0 missing=0]`

**Recommended actions**
- 对长时场景增加 heap 观测，若 drift 持续上升优先检查对象保留与缓存回收边界。
- 诊断开销异常时先降到 sampled/light，再对高开销场景定点开启 full。

<details>
<summary>Terminology (maxLevel / steps / dirtyRootsRatio)</summary>


### What do `maxLevel` and `null` mean?
- `maxLevel` is the highest primary-axis level that still satisfies a budget.
- `maxLevel=null`: budget fails already at the first tested level.

### What do `scenarioId` and `loadLevel` mean?
- `scenarioId` identifies real business paths in examples/logix-react (route/query/form/burst/external).
- `loadLevel` is workload tier (`low/medium/high`), used to locate the first failing pressure level.
- Metrics are evaluated on the p95 statistic (`n = runs - warmupDiscard`; tail-only failures are often noise unless reproducible).

</details>

<details>
<summary>Details (diff / thresholds / points)</summary>


### Comparability
- comparable: `false`
- diffMode: allowConfigDrift=true, allowEnvDrift=true

**configMismatches**
- `matrixHash: before=72024dcbdc8cc0df7195ac982026eaf68ebcb86fc217f6fa9e7a8ab59bb8e7d9 after=5e43bddfd8e970072889caaf89dbcbb154d0c4c750b9cf02683a014f6c80bc0d`

**warnings**
- `git.dirty.before=true (before report was collected from a dirty working tree)`
- `git.dirty.after=true (after report was collected from a dirty working tree)`

### Automated interpretation
- regressions: `0`
- improvements: `0`
- thresholdSlices: compared=`4`, afterOnly=`0`, beforeOnly=`0`, skippedData=`0`, total=`4`

_Triage-only diff: before/after are not strictly comparable. Treat deltas as hints, not conclusions._

### Head budget status (quick warning)
_Based on head-only thresholds (not a diff). Useful even when comparable=false._

- headBudgetFailures: `0` (reason=budgetExceeded)
- headDataIssues: `0` (missing/timeout/etc)
- classification: `tail-only` = p95 over budget but median within; `systemic` = median also over

_Tip: quick profile still has limited samples vs default; tail-only failures are often noise unless reproducible._

### Notes
- [P1] `examples.logixReact.scenarios` — examples/logix-react: real project browser scenarios: stabilityWarning: metric=workflow.scenarioMs {loadLevel=low&scenarioId=external-push-sync} baselineP95=22.90ms afterP95=15.50ms diff=7.40ms limit=5.00ms (possible causes: tab switch, power-saving mode, background load, browser/version drift)

### Budget details (computed from points)

#### [P1] `examples.logixReact.scenarios` — examples/logix-react: real project browser scenarios
- primaryAxis: `scenarioId` (max=`route-switch`)

**Budget: `high<=medium*1.20`**
- metric: `runtime.txnCommitMs`
- maxRatio: `1.2`
- minDeltaMs: `0.5ms`
- numeratorRef: `loadLevel=high`
- denominatorRef: `loadLevel=medium`

| where | before maxLevel | after maxLevel | before ratio | after ratio |
| --- | --- | --- | --- | --- |
| {} | route-switch | route-switch | 0.6457 (0.681/1.055 ms) @ scenarioId=route-switch | 0.6917 (0.713/1.030 ms) @ scenarioId=route-switch |

### Artifacts (files inside the uploaded artifact)
- `README.md`
- `after.head.darwin-arm64.local.default.json`
- `baseline.darwin-arm64.local.default.json`
- `before.baseline.darwin-arm64.local.default.json`
- `diff.baseline__head.darwin-arm64.local.default.json`
- `summary.md`

</details>

