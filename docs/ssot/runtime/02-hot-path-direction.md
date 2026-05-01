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

### B. archive 背景证据

当前 archive 中仍可作为 reopen 背景入口的材料：

- [2026-03-14 Current Effective Conclusions](../../archive/perf/2026-03-14-current-effective-conclusions.md)
- [2026-03-30 Latest Main Quick Identify Reading](../../archive/perf/2026-03-30-latest-main-quick-identify-reading.md)
- [06 Current Head Triage](../../archive/perf/06-current-head-triage.md)

使用方式：

- 先读本页确认方向
- 若当前变更命中热链路，再看 active spec `perf/*.json` 与 `115/perf/*.json`
- archive 只用于背景、no-go 与 reopen 判定，不单独充当新结论事实源

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
