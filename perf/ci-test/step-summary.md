### logix-perf (quick)
- scope: `test/browser/perf-boundaries/converge-steps.test.tsx`
- profile: `quick`
- envId: `gh-Linux-X64`
- base: `11111111`  head: `22222222`
- refs: `base` -> `head`
- artifacts: `local-test`

### What do `maxLevel` and `null` mean?
- `maxLevel` is the highest primary-axis level that still satisfies a budget.
- Example (primary axis = `steps`):
  - `maxLevel=2000`: budget passes at `steps=200`, `800`, and `2000`.
  - `maxLevel=800`: budget passes at `steps=200` and `800`, but fails at `steps=2000`.
  - `maxLevel=null`: budget fails already at the first tested level (e.g. `steps=200`).

### Comparability
- comparable: `true`
- diffMode: allowConfigDrift=true, allowEnvDrift=true

**warnings**
- `git.dirty.before=true (before report was collected from a dirty working tree)`
- `git.dirty.after=true (after report was collected from a dirty working tree)`

### Automated interpretation
- regressions: `0`
- improvements: `0`
- budgetViolations: `0`

### Budget details (computed from points)

#### [P1] `converge.txnCommit` — converge: txn commit / derive
- primaryAxis: `steps` (max=`2000`)

**Budget: `auto<=full*1.05`**
- metric: `runtime.txnCommitMs`
- maxRatio: `1.05`
- numeratorRef: `convergeMode=auto`
- denominatorRef: `convergeMode=full`

| where | before maxLevel | after maxLevel | before ratio | after ratio |
| --- | --- | --- | --- | --- |
| dirtyRootsRatio=0.005 | 2000 | 2000 | 0.9858 (0.836/0.848 ms) @ steps=2000 | 0.9858 (0.836/0.848 ms) @ steps=2000 |
| dirtyRootsRatio=0.05 | 2000 | 2000 | 0.9954 (0.868/0.872 ms) @ steps=2000 | 0.9954 (0.868/0.872 ms) @ steps=2000 |
| dirtyRootsRatio=0.25 | 2000 | 2000 | 1.0000 (1.002/1.002 ms) @ steps=2000 | 1.0000 (1.002/1.002 ms) @ steps=2000 |
| dirtyRootsRatio=0.75 | 2000 | 2000 | 0.9723 (1.402/1.442 ms) @ steps=2000 | 0.9723 (1.402/1.442 ms) @ steps=2000 |

### Artifacts (files inside the uploaded artifact)
- `after.22222222.gh-Linux-X64.quick.json`
- `before.11111111.gh-Linux-X64.quick.json`
- `diff.11111111__22222222.gh-Linux-X64.quick.json`

### logix-perf (quick)
- scope: `test/browser/perf-boundaries/converge-steps.test.tsx`
- profile: `quick`
- envId: `gh-Linux-X64`
- base: `11111111`  head: `22222222`
- refs: `base` -> `head`
- artifacts: `local-test`

### What do `maxLevel` and `null` mean?
- `maxLevel` is the highest primary-axis level that still satisfies a budget.
- Example (primary axis = `steps`):
  - `maxLevel=2000`: budget passes at `steps=200`, `800`, and `2000`.
  - `maxLevel=800`: budget passes at `steps=200` and `800`, but fails at `steps=2000`.
  - `maxLevel=null`: budget fails already at the first tested level (e.g. `steps=200`).

### Comparability
- comparable: `true`
- diffMode: allowConfigDrift=true, allowEnvDrift=true

**warnings**
- `git.dirty.before=true (before report was collected from a dirty working tree)`
- `git.dirty.after=true (after report was collected from a dirty working tree)`

### Automated interpretation
- regressions: `0`
- improvements: `1`
- budgetViolations: `0`

### Top improvements
- [P1] `converge.txnCommit` — converge: txn commit / derive: `auto<=full*1.05` `{dirtyRootsRatio=0.05}`
  - before: maxLevel=2000 (passes all levels)
  - after: maxLevel=2000 (passes all levels)

### Budget details (computed from points)

#### [P1] `converge.txnCommit` — converge: txn commit / derive
- primaryAxis: `steps` (max=`2000`)

**Budget: `auto<=full*1.05`**
- metric: `runtime.txnCommitMs`
- maxRatio: `1.05`
- numeratorRef: `convergeMode=auto`
- denominatorRef: `convergeMode=full`

| where | before maxLevel | after maxLevel | before ratio | after ratio |
| --- | --- | --- | --- | --- |
| dirtyRootsRatio=0.005 | 2000 | 2000 | 0.9858 (0.836/0.848 ms) @ steps=2000 | 0.9858 (0.836/0.848 ms) @ steps=2000 |
| dirtyRootsRatio=0.05 | 2000 | 2000 | 0.9954 (0.868/0.872 ms) @ steps=2000 | 0.9954 (0.868/0.872 ms) @ steps=2000 |
| dirtyRootsRatio=0.25 | 2000 | 2000 | 1.0000 (1.002/1.002 ms) @ steps=2000 | 1.0000 (1.002/1.002 ms) @ steps=2000 |
| dirtyRootsRatio=0.75 | 2000 | 2000 | 0.9723 (1.402/1.442 ms) @ steps=2000 | 0.9723 (1.402/1.442 ms) @ steps=2000 |

### Artifacts (files inside the uploaded artifact)
- `after.22222222.gh-Linux-X64.quick.json`
- `before.11111111.gh-Linux-X64.quick.json`
- `diff.11111111__22222222.gh-Linux-X64.quick.json`
- `step-summary.md`
- `summary.md`

