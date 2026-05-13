---
name: logix-perf-observability-loop
description: 在 logix 仓库规划、实施、评审或收敛任何可能影响运行时性能的需求时使用。只要用户提到性能、CI artifacts、knob snapshot、trend analyze、before/after、soak、default、231-235、pressure knob、性能旋钮、counter、counter census、kernel/runtime hot path、性能证据、性能回归、下一步优化、是否需要改 API 换性能，必须优先使用本 skill。本 skill负责指导 agent 把需求拆成小步可观测实施，获取和解读 CI 性能产物，把压力旋钮映射到内核 owner、运行时配置/逻辑路径和 counters，再决定下一步是补证据、修采集、看同分支趋势、跑显式 convergence、优化内核、还是调整 API/设计。
---

# logix-perf-observability-loop

这个 skill 是 Logix 性能工作的长期观测与实施循环。当前主线是：

```text
需求/实现假设
  -> owner path
  -> pressure knob
  -> required counters
  -> local preflight
  -> small implementation step
  -> PR/push knob snapshot artifact
  -> same-branch trend when enough snapshots exist
  -> explicit convergence only when a delta claim is needed
  -> next focused step
```

核心目标不是让 agent 追一个总耗时数字，而是让每次需求规划和实现都能回答：

```text
这次改动动了哪个运行时 owner？
用哪个压力旋钮证明它？
需要哪些 counters present + value？
CI artifact 里是否真的可比？
当前 snapshot 说明了什么？
同分支趋势是否稳定？
成本是被移除了，还是迁移到 selector/store/react/diagnostics/browser？
下一步应该补证据、修采集、优化实现，还是调整设计/API？
```

## 0. 先读事实源

先读项目路由，再读当前性能规范：

1. `.codex/skills/project-guide/SKILL.md`
2. `docs/standards/kernel-performance-observability-standard.md`
3. 相关运行时事实源，按改动范围选择：
   - `docs/ssot/runtime/02-hot-path-direction.md`
   - `docs/ssot/runtime/09-verification-control-plane.md`
   - `docs/ssot/runtime/01-public-api-spine.md`
4. 当前证据链，按问题选择：
   - `.github/workflows/logix-perf-evidence-structure.yml`
   - `.github/workflows/logix-perf-knob-snapshot.yml`
   - `.github/workflows/logix-perf-trend-analyze.yml`
   - `.github/workflows/logix-perf-convergence.yml`
   - `.github/workflows/logix-perf-convergence-soak.yml`
   - `specs/231-adversarial-performance-matrix/**`
   - `specs/235-kernel-performance-convergence-final-gate/**`
   - CI artifact `perf/snapshot/**`
   - CI artifact `perf/trend/**`
   - CI artifact `perf/convergence/**`

如果没有可用 artifact，先说清楚当前只能做 local preflight 或结构判断，不能下 hard performance claim。

## 1. 工作模式

### A. 规划模式

当用户在规划任何需求、拆任务、评审设计、决定是否实现时，先做性能映射：

```text
requirement
  -> runtime owner path
  -> pressure knob
  -> expected counter movement
  -> forbidden migration target
  -> local preflight
  -> CI snapshot expectation
  -> trend/convergence gate when needed
```

输出至少包含：

- `owner path`
- `pressure knobs`
- `required counters`
- `CI evidence plan`
- `risk of cost migration`
- `small-step implementation boundary`

如果需求触及公开 API 或 authoring surface，先判断是否真的需要 API 变化来换性能。需要时只输出 API 变动提案，不直接实施。

### B. Artifact 分析模式

当用户给出 CI run、artifact、report、snapshot、trend、default/soak diff、regression、timeout、missing counter 或 stability warning 时，先分析证据，不急着改代码。

固定读取顺序：

1. `summary.md` 或 `reports/*.md`
2. `metadata/run-env.json`、`metadata/git.json`、`metadata/matrix.json`
3. `metadata/knob-manifest.json`
4. `counters/counter-census.json`
5. `reports/snapshot.<profile>.json`，如果是 snapshot artifact
6. `reports/trend.<branch>.<profile>.json`，如果是 trend artifact
7. `convergence.<profile>.json` 和 `diff/*.<profile>.json`，如果是 convergence artifact
8. `adversarial.<profile>.json`
9. `examples-playground.<profile>.json`
10. `logs/*.log`
11. `markers/*.json`

输出至少包含：

- `artifact comparability`
- `artifact role: structure | snapshot | trend | convergence | soak`
- `blocked / missing / timeout / regression / stabilityWarning`
- `pressure knob attribution`
- `runtime owner attribution`
- `counter state: missing | 0 | >0`
- `next action`

### C. 实施模式

当用户说“做吧、继续、修这个、按这个方向实施”时，按小步推进：

```text
one pressure knob
one runtime owner path
one counter/cost claim
one local preflight
one CI snapshot expectation
```

实施前先声明这一步要改变哪个 owner path、预期哪个 counter 或 metric 变化、不能把成本迁移到哪里。实施后必须跑最小验证，并说明下一次 CI snapshot 应该看到什么；只有需要 delta claim 或 final gate 时才要求 convergence。

### D. Final Gate 模式

当用户讨论 231-235、final gate、hard claim、release-safe 性能结论时，必须严格区分：

```text
local quick      -> clue
local default    -> preflight
PR/push snapshot -> current-state evidence
same-branch trend -> trend candidate evidence
explicit convergence -> candidate before/after evidence
manual/nightly soak -> hard-evidence candidate
release/spec close final gate -> hard only if complete
```

没有完整 CI/stable-runner artifact 时，禁止说“最终完成”“全局性能改善”“soak 已通过”。

负向边界必须进入 perf-evidence 报告和测试，但不得进入 runtime 语义：

```text
snapshot/trend:
  写入 claimBoundary / forbiddenClaims，只允许 current-state 或 trend-prioritization

LLM summary / reviewer notes:
  只能 advisory，final gate 必须忽略 advisory 并只读机器字段

pressure knobs:
  只能作为 perf-evidence workload axes / report schema / matrix policy
  不能升格为 @logixjs/core 或 @logixjs/react public runtime config

matrix:
  默认 sparse anchors + selected pair interactions
  full Cartesian 需要 blocked-marker 或 maintainer override
```

## 2. Pressure Knob 到 Runtime Owner 的映射

每个性能讨论都要尽量落到这个表。没有映射就先补 evidence，不要先优化。

代码中的共享映射落点是 `packages/logix-perf-evidence/scripts/lib/kernel-performance-observability.ts`。它服务 CI/report 归因，不是 runtime/public API。

矩阵稀疏策略的物理落点是 `packages/logix-perf-evidence/assets/matrix.json` 的 `matrixPolicy` 和 `packages/logix-perf-evidence/scripts/lib/adversarial-matrix-policy.ts`。

| Pressure Knob | Runtime Owner | 观察重点 |
| --- | --- | --- |
| `steps` | transaction commit / scheduler | commit duration, cutoffs, queue timing |
| `dirtyRootsRatio` | dirtyPlan / source / selector | dirty fallback, source key eval, selector route |
| `mutationPattern` | dirty precision | unknown write, missing registry, dirty-all fallback |
| `selectorFanout` | selector graph | evaluateAll, dirtyAllFallback, notify fanout |
| `sourceListWidth` | source/list evidence | row full scan, list normalize, key eval |
| `diagnosticsLevel` | diagnostics | payload count, diagnostics-off payload, overhead |
| `storeTopicCount` | RuntimeStore | retained topics, topic notify, no-tearing notify |
| `txnQueueBacklog` | txn queue / lane policy | direct idle, queue wait, backpressure |
| `reactMode` | React host | render count, commit count, strict/suspense jitter |
| `playgroundNoise` | examples/playground isolation | runtime witness vs product/editor cost separation |

每个 knob 必须进一步映射到：

```text
scenario fixture
expected runtime owner
required counters
primary metric budget
forbidden migration target
```

## 3. Counter 规则

counter 的三态不能混淆：

```text
missing -> 证据不可判定
0       -> recorded scope 内没有发生该 fallback/risk
>0      -> blocker 或 cost migration signal
```

禁止把 missing 补成 0。禁止用“suite pass”代替 required counter present + value。

当前 231-235 重点 counters：

```text
dirtyPlan.unknownWrite
dirtyPlan.missingRegistry
dirtyPlan.dirtyAll
dirtyPlan.nonFieldAuthority
dirtyPlan.legacyDirtyInput
source.fullFallback
source.rowFullScan
source.keyEval.unrelatedMutation
selector.evaluateAll
selector.dirtyAllFallback
selector.nonFieldAuthorityFallback
txnQueue.directIdleQueueWaitNonZero
txnQueue.directIdleBackpressureNonZero
dispatch.noTopicFanoutAlloc
runtimeStore.runSyncFallbackAfterBoot
runtimeStore.retainedTopicLeak
diagnosticsOff.payloadCount
listEvidence.stringNormalizeHotPath
examples.kernelPlaygroundCostMixed
examples.publicResidueViolation
```

新 counter 只能用于补真实归因缺口，不能长出第二套 runtime truth。

## 4. CI 产物判断

优先用 CI 或专用 stable runner artifact。local evidence 只用于调试和 preflight。

当前分层：

```text
logix-perf (evidence structure)
  -> PR/push 快门禁，schema / assembly / stage gate / counter census / marker plumbing

logix-perf (knob snapshot)
  -> PR/push 单分支当前 commit artifact，记录 knob vector / counters / suite status / logs / markers；collect 失败也应产 blocked snapshot

logix-perf (trend analyze)
  -> scheduled/manual 下载同分支最近 N 个 snapshot artifacts 做趋势分析

logix-perf (convergence)
  -> manual/path-triggered default before-after candidate artifacts，只服务明确 delta claim

logix-perf (convergence soak)
  -> manual/scheduled soak artifacts，只服务 tail/stability/final gate

logix-perf (quick), logix-perf (sweep)
  -> diagnostic/capacity exploration，不直接支撑 final hard claim
```

分析 artifact 时按五种视角交叉看：

```text
snapshot current-state
same-branch trend
same-cell before/after
same-head cross-cell
single-knob attribution
```

分类固定为：

```text
tax_removed
stable_guarded
migrated_cost
migrated_risk
blocked
inconclusive
```

## 5. 下一步决策树

先用证据状态决定动作：

```text
required counter missing
  -> 先补真实采集、sentinel mapping 或 counter census

artifact missing / suite missing
  -> 先修 collection/marker，不优化内核

timeout
  -> 隔离 suite/profile，写 timeout marker，并确认 snapshot report 没有从 artifact 链消失，必要时拆 soak

default regression
  -> 映射到 pressure knob + runtime owner，再做 focused optimization

stability warning
  -> 看 repeat / same-cell jitter，不下 hard claim

browser P2 anomaly
  -> 保留 logs，先判断是否 kernel claim 相关，不能混进 runtime hard claim

snapshot shows missing counter
  -> 修真实采集或 census source，不跑 convergence 试图掩盖

trend shows movement but env/profile/matrix drift
  -> 标为 inconclusive，先补 comparability metadata 或重跑 comparable snapshot

trend shows stable regression on same branch
  -> 映射到 pressure knob + owner path，再决定是否开显式 convergence

counter > 0
  -> 优先修对应 owner path，除非 maintainer 明确接受迁移风险

counter = 0 且 metric 改善
  -> 可标为 candidate improvement，等 CI/stable runner 补齐 claim
```

## 6. 实施纪律

默认小步快跑：

```text
one pressure knob
one runtime owner path
one counter/cost claim
one CI artifact set
```

不要把 evidence schema、collector 修补、runtime optimization 和 API 变化混在同一步，除非 evidence pipeline 不修就无法继续。默认推进顺序：

```text
evidence structure green
focused local preflight
small commit / PR
knob snapshot artifact
same-branch trend after enough snapshots
explicit convergence only for delta/final claim
soak only for tail/stability/final claim
```

遇到上传的 patch/evidence bundle 时，只吸收设计和缺口，不把 bundle 当事实源：

```text
read bundle protocol / coverage / risk / verify
extract artifact classes and missing markers
map into current standard
do not apply patch by default
do not treat bundle checks as runtime performance proof
```

如果发现脚本缺口，只做最小 validation/apply fix，并在 handoff 或 report 里明确标注。

涉及 API 变化时，先输出：

```text
problem
why internal-only fix is insufficient
proposed API change
expected performance evidence
affected authoring/runtime surface
rollback or rejection path
```

## 7. 常用命令

本仓交互时遵守项目规则，shell 命令加 `rtk` 前缀。

结构门禁：

```bash
rtk pnpm -C packages/logix-perf-evidence run ci:preflight
rtk pnpm -C packages/logix-perf-evidence test \
  scripts/ci.kernel-performance-convergence-assembly-input.test.ts \
  scripts/assemble-kernel-performance-convergence-manifest.test.ts \
  scripts/ci.kernel-performance-convergence-stage-gate.test.ts \
  scripts/ci.examples-playground-isolation-report.test.ts \
  scripts/ci.adversarial-matrix-report.test.ts
rtk pnpm -C packages/logix-perf-evidence typecheck
```

本地 default preflight：

```bash
rtk pnpm perf collect -- --profile default --out <before-or-after>.json
rtk pnpm perf diff -- --before <before>.json --after <after>.json --out <diff>.json
```

最终 gate assembly：

```bash
rtk pnpm perf ci:kernel-performance-convergence-assembly-input -- \
  --before <before>.json \
  --after <after>.json \
  --diff <diff>.json \
  --adversarial-report <adversarial>.json \
  --examples-report <examples>.json \
  --profile adversarial-default \
  --out <assembly>.json

rtk pnpm exec tsx packages/logix-perf-evidence/scripts/assemble-kernel-performance-convergence-manifest.ts \
  --input <assembly>.json \
  --out <manifest>.json

rtk pnpm exec tsx packages/logix-perf-evidence/scripts/ci.kernel-performance-convergence-stage-gate.ts \
  --manifest <manifest>.json \
  --out <report>.md \
  --json-out <report>.json
```

## 8. 输出模板

### 规划 / 评审

```text
owner path:
pressure knobs:
required counters:
expected movement:
forbidden migration:
local preflight:
CI artifact gate:
snapshot expectation:
trend/convergence need:
implementation boundary:
API impact:
```

### Artifact 分析

```text
artifact comparability:
artifact role:
profile/env/matrix:
blocked points:
counter state:
pressure knob attribution:
runtime owner attribution:
cost migration:
next action:
claim boundary:
```

### 实施收口

```text
changed:
owner path:
pressure knob:
local verification:
CI snapshot expectation:
trend/convergence needed:
classification:
remaining blocker:
claim boundary:
```

## 9. 参考资料

按需读取，不要一次性展开全部：

- `references/artifact-analysis.md`
- `references/pressure-knob-runtime-map.md`
- `references/implementation-planning-loop.md`
- `references/claim-boundaries.md`
