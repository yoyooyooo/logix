---
title: Hot Path Direction
status: living
version: 11
---

# Hot Path Direction

## 目标

冻结新体系下内部热链路的主方向。

## 当前方向

- runtime assembly / control plane 不列入 steady-state 热链路主清单
- `process / link` 的定义与监督壳层不列入热链路主清单
- 保留统一事务、统一提交、统一解析轴
- `packages/logix-core/src/internal/runtime/core/**` 继续作为 kernel 热链路主落点，不再为此新开第二套 kernel 目录
- kernel 实验能力统一内收到 runtime internal owner，不再保留独立公开包壳
- 为旧 surface 或旧兼容壳层存在的运行时分支默认删除
- 删除 dead branch
- 显式化 `sync rule / async task`
- 显式化 writeback batching policy 与稳定 batch meta
- 把运行时解释税继续前移到 build / install
- React 内部语义迁到 `Program instance`
- React host projection route 由 core selector law 决定；React host 只消费 route，不保留平行 selector eligibility 判断面
- selector topic identity 由 selector fingerprint 承接；`selectorId` 只允许作为 label，不允许单独决定热链路 topic 身份
- selector fingerprint 必须覆盖 static shape、declared reads、equality/operator 语义，并绑定 path-authority digest 或 epoch
- dirty-side precision loss 与 read-side broad / dynamic fallback 同属默认 dev/test strict failure，当它们影响 host projection 时不得静默回落为 evaluate-all
- 更远大的 domain ambition 只允许 lowering 到同一条 core runtime / host law，不允许长出 domain-specific hot branch 或 host-specific runtime branch

## 当前代码边界

| Zone | 主代码落点 | steady-state |
| --- | --- | --- |
| `kernel` | `packages/logix-core/src/internal/runtime/core/**`，排除 `core/process/**` 与 `core/runner/**` | yes |
| `runtime-shell` | `packages/logix-core/src/Runtime.ts`、`packages/logix-core/src/Module.ts`、`packages/logix-core/src/Logic.ts`、`packages/logix-core/src/internal/runtime/AppRuntime.ts`、`packages/logix-core/src/internal/runtime/ModuleFactory.ts`、`packages/logix-core/src/internal/runtime/hotPathPolicy.ts` 与仍未清空消费者的非 `core/**` 协调代码 | no |
| `control plane` | `packages/logix-core/src/{Runtime,ControlPlane}.ts`、`packages/logix-core/src/internal/{debug,observability,reflection,verification}/**` | no |
| `process` | `packages/logix-core/src/internal/runtime/core/process/**` | no |
| `runner` | `packages/logix-core/src/internal/runtime/core/runner/**` | no |

当前仓内的可执行审计落点：

- `packages/logix-core/src/internal/runtime/hotPathPolicy.ts`
- `packages/logix-core/test/Contracts/RuntimeHotPathPolicy.test.ts`

## 证据入口

当前新树里的方向，主要由以下两类证据支撑：

### A. 可比 baseline / diff 样本

- `specs/115-core-kernel-extraction/perf/*.json`
- 当前活跃 hot-path spec 的 `specs/<id>/perf/*.json`

规则：

- 新的 clean comparable 样本默认落在活跃 spec 的 `perf/` 目录
- 若要复用旧 baseline，优先从 `specs/115-core-kernel-extraction/perf/*.json` 起步
- 当前仓库没有 `docs/perf/**` 作为活跃事实源

### B. 冻结历史背景

当前 worktree 不再维护 `docs/archive/perf/**` 作为可点击事实源入口。冻结历史只能作为背景线索，不能单独关闭 hot-path 结论。

当前可执行背景入口固定为：

- [../../../specs/115-core-kernel-extraction/perf/README.md](../../../specs/115-core-kernel-extraction/perf/README.md)

使用方式：

- 先读本页确认方向
- 若当前变更命中热链路，再看 active spec `perf/*.json` 与 `115/perf/*.json`
- 冻结历史只用于背景、no-go 与 reopen 判定，不单独充当新结论事实源

## Kernel Release Gate Perf Projection

`190-kernel-release-gate-profile` 可以把 hot-path evidence 纳入 repo-local release gate，但它不拥有新的 perf budget 或 metric truth。

`201-kernel-stability-report-gate` 引入的 `KernelStabilityReport` 只作为 internal release gate artifact。它可以汇总 hot-path 风险分类、diagnostics-off guard 和 selector precision guard 的通过状态，但不得运行 benchmark suite，不得把 `UNKNOWN` 解释为 `PASS`，也不得在缺少同 profile before/after/diff 证据时写出 broad performance success claim。

Release gate 中的 perf row 只允许这样关闭：

- 未触及热链路、diagnostics-off、live disabled path 或 React host projection route时，标记为 `not-touched`，并回链本页。
- 触及 selector route、selector fingerprint、path authority、dirty/read overlap、evaluate-all fallback、external-store publish、RuntimeStore notify、Form list scope 或 React host projection route时，必须提供同 profile before/after/diff 证据。
- 只有 after-only、archive-only、diagnostics=on-only 或不可比样本时，只能写风险分类，不能写性能收益或 release closure。
- broad strict、negative dirty、`converge.txnCommit`、Form list、React strict suspense jitter、external-store、RuntimeStore、diagnostics-off 相关 failure 必须逐项分类为真实 regression、测量伪影、预算口径缺口或 future row。

当前 release gate 可点名的风险 family 包括：

- `negativeBoundaries.dirtyPattern`
- `converge.txnCommit`
- `form.listScopeCheck`
- `react.strictSuspenseJitter`
- `externalStore.ingest.tickNotify`
- `runtimeStore.noTearing.tickNotify`

这些名字只是 perf row / suite id，不是新的 runtime concept。优化实施顺序仍由 active perf spec 裁决；若需要拆分，默认先看 `StateTransaction.*`、`ModuleRuntime.*`、`BoundApiRuntime.*`、field converge/source/validate 相关 owner 文件，但不得把这些路径写成公开 API 心智。

`logix-kernel-hotpath-convergence` 这类 internal patch bundle 只能按 architectural-risk closure 消化：允许收口 canonical dirtyPlan authority、source/list dirty gate fallback reason、validate static-IR fallback trace annotation 与 selector dirty fallback diagnostic locality。若 bundle 未同时提供同 profile before/after/diff perf evidence，只能关闭 fallback 可解释性和实现风险，不能写成 hot-path performance improvement 或 release perf closure。

## 重开条件

只有出现以下情况，才重开 hot-path 实施线：

- 新的 reproducible implementation failure
- 新的 clean / comparable 证据
- 新的产品级 SLA 压力
- 改动 selector route、selector fingerprint、path authority、dirty/read overlap、evaluate-all fallback 或 React host projection route

以下情况不构成重开：

- 只有 archive 旧文，没有 current-head comparable 样本
- 只有 diagnostics=on 的局部收益，无法解释 default steady-state
- 只是在 shell / control plane 的装配层做了文案或结构整理

若重开命中 selector route、fingerprint、path authority 或 dirty fallback，必须附带同 profile before/after 性能矩阵，至少覆盖 selector graph evaluate、runtime external-store topic publish、dirty path overlap 与 strict-policy diagnostics overhead。没有 clean comparable 样本时，不得把实现收益写成 hot-path 结论。

未满足以上条件时，当前默认不重开 hot-path 实施线。

## 171 Live Bridge 开销门禁

`171-agent-live-runtime-bridge` 的 live bridge 只能在 disabled path 保持 structural no-op 的前提下进入实现。

Disabled path 固定要求：

- no bridge、bridge disabled、adapter present but inactive 三种状态都必须可测。
- 事务窗口内不得出现 serialization、buffer allocation、transport IO、adapter discovery 或 listener fanout。
- capture buffer、event queue、snapshot serialization、profile sampling 和 evidence export writer 都不得在 disabled path 初始化。
- disabled p95 regression gate 固定为相对可比较 baseline 不超过 1 percent 或 0.05 ms。
- `comparable=false`、missing suite、timeout 或 stability warning 禁止关闭 disabled overhead proof。

Enabled path 固定要求：

- event-window capture、snapshot read、local-only runtime profile summary、evidence export 必须分开计量。
- 每类 capture 必须记录 budget、sampling、dropped、degraded、redaction markers。
- browser CPU profile integration、heap snapshot、remote/cloud mutation、long-running stream 和 cross-process aggregation 不属于 `171` P1 hot-path closure。

证明 owner 分工：

- 本页持有 disabled hot-path gate。
- `specs/171-agent-live-runtime-bridge/implementation-details/security-budget.md` 持有 enabled capture/export budget。
- `specs/171-agent-live-runtime-bridge/notes/perf-evidence.md` 只保存实施后的证据，不持有新预算口径。

证明命令：

```bash
rtk pnpm perf collect -- --profile default --out specs/171-agent-live-runtime-bridge/perf/before.<sha>.<envId>.default.json
rtk pnpm perf collect -- --profile default --out specs/171-agent-live-runtime-bridge/perf/after.<sha-or-worktree>.<envId>.default.json
rtk pnpm perf diff -- --before specs/171-agent-live-runtime-bridge/perf/before.<sha>.<envId>.default.json --after specs/171-agent-live-runtime-bridge/perf/after.<sha-or-worktree>.<envId>.default.json --out specs/171-agent-live-runtime-bridge/perf/diff.before__after.json
rtk pnpm perf validate -- --report specs/171-agent-live-runtime-bridge/perf/after.<sha-or-worktree>.<envId>.default.json
```

## 来源裁决

- [../../adr/2026-04-05-ai-native-runtime-first-charter.md](../../adr/2026-04-05-ai-native-runtime-first-charter.md)
- [../../adr/2026-04-04-logix-api-next-charter.md](../../adr/2026-04-04-logix-api-next-charter.md)

## 相关规范

- [./01-public-api-spine.md](./01-public-api-spine.md)
- [./04-capabilities-and-runtime-control-plane.md](./04-capabilities-and-runtime-control-plane.md)
- [./09-verification-control-plane.md](./09-verification-control-plane.md)
- [./10-react-host-projection-boundary.md](./10-react-host-projection-boundary.md)
- [./13-selector-type-safety-ceiling-matrix.md](./13-selector-type-safety-ceiling-matrix.md)
- [../../standards/logix-api-next-guardrails.md](../../standards/logix-api-next-guardrails.md)

## 说明

这份文档只冻结方向，不展开实现细节。

历史论证已经收口到当前 SSoT、ADR 与 standards，后续不再依赖 proposal 目录承载真相源。
