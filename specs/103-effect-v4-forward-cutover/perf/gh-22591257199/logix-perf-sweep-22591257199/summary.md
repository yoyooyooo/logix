### logix-perf (summary)
- scope: `test/browser/perf-boundaries,test/browser/watcher-browser-perf.test.tsx`
- profile: `soak`
- envId: `gh-Linux-X64`
- base: `8cb40d43`  head: `8d4f36b1`
- refs: `8cb40d43` -> `8d4f36b1`
- artifacts: `logix-perf-sweep-22591257199`

### Conclusion
- comparable: `?`
- diff: regressions=`0`, improvements=`0`
- head budgetExceeded: `0`
- status: `no_diff`

<details>
<summary>Terminology (maxLevel / steps / dirtyRootsRatio)</summary>


### What do `maxLevel` and `null` mean?
- `maxLevel` is the highest primary-axis level that still satisfies a budget.
- Example (primary axis = `steps`):
  - `maxLevel=2000`: budget passes at `steps=200`, `800`, and `2000`.
  - `maxLevel=800`: budget passes at `steps=200` and `800`, but fails at `steps=2000`.
  - `maxLevel=null`: budget fails already at the first tested level (e.g. `steps=200`).

### What do `steps` and `dirtyRootsRatio` mean?
- `steps` is the primary axis for this suite: it controls the size of the converge state (more steps = more roots/fields).
- `dirtyRootsRatio` controls how many roots/fields are patched per transaction: `dirtyRoots = max(1, ceil(steps * dirtyRootsRatio))`.
- Metrics are evaluated on the p95 statistic (`n = runs - warmupDiscard`; tail-only failures are often noise unless reproducible).

</details>

<details>
<summary>Details (diff / thresholds / points)</summary>


### Diff
_Diff file not found. Collect or diff step may have failed. Check the Actions logs._

### Artifacts (files inside the uploaded artifact)
- `after.head0002.mac-local.quick.json`
- `after.local.json`
- `after.local0002.mac-local.quick.json`
- `before.base0001.mac-local.quick.json`
- `before.local0001.mac-local.quick.json`
- `diff.base0001__head0002.mac-local.quick.json`
- `diff.local0001__local0002.mac-local.quick.json`
- `summary.md`

</details>

