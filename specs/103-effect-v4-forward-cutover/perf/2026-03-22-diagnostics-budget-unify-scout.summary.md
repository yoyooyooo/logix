# 2026-03-22 · diagnostics budget unify scout summary

## 决策

- 唯一建议下一刀：`D-5 Diagnostics Cost-Class Protocol + Gate Plane Split`
- 结论类型：`docs/evidence-only`
- 是否立即实施：`否`

## 证据摘要

1. `R-2 Gate-C` 7 轮样本：`4 clear + 3 blocked`，blocked 全部集中在 `externalStore.ingest.tickNotify / full/off<=1.25`。  
2. `externalstore-threshold-localize-v4` focused wave：`run_count=7`，`fail_count=4`，`first_fail_level` 在 `128/256/512` 漂移。  
3. `Stage G6` 证据出现首轮 gate 阻塞后复跑清空，说明跨模块事件负载会进入统一 gate 判定。  
4. `P2-4` 与 `R2-B` 已提供可见性与归因，尚未建立跨模块成本分层与 gate 平面隔离。

## 提案骨架

- 协议新增：`costClass/gateClass/samplingPolicy`
- controlplane：phase 事件默认聚合，按需放大明细
- devtools：从“预算展示”升级到“预算准入”
- gate：拆成 `hard(runtime_core)` 与 `soft(all_classes)` 双层

## 变动评估

- 协议变动：`需要`
- public API 变动：`可选`，建议先 internal-first，再按 `R-2 Gate-A/B/E` 决定是否外露

## 关联文档

- `docs/perf/2026-03-22-diagnostics-budget-unify-scout.md`
- `docs/perf/07-optimization-backlog-and-routing.md`
- `docs/perf/README.md`
