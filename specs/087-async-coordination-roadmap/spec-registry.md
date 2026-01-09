# Spec Registry: Async Coordination（087 总控）

> 本文件是 `specs/087-async-coordination-roadmap/` 的“总控清单”：列出 Async 协调路线的 **成员 specs（已存在/待推进）**、它们的依赖顺序与验收门槛入口。

## SSoT（机器可读关系）

- 关系 SSoT：`specs/087-async-coordination-roadmap/spec-registry.json`（members / 依赖 / 状态）
- 人读阐述：`specs/087-async-coordination-roadmap/spec-registry.md`（解释/口径/注意事项/表格展示）

> 约定：脚本/自动化只依赖 `spec-registry.json`；本文件可更自由地扩写，但不要引入“只有 md 有、json 没有”的关系信息。

## 使用方式（建议）

1. 先看本目录的 `quickstart.md`：只回答“怎么刷新 group checklist / 怎么汇总进度”。
2. 需要推进时：从 `checklists/group.registry.md` 点到对应 member 的 `tasks.md`。
3. 更新推进状态：只改 `spec-registry.json`（SSoT），再重新生成 group checklist。

## 统一口径（强制）

- **总控只做索引**：087 的 `tasks.md` 不复制 member 的实现任务；只提供跳转入口与里程碑门槛。
- **性能与可诊断性优先**：任何触及 Logix Runtime 核心路径/React 关键路径/诊断协议的成员 spec，都必须在各自 `plan.md` 中写明 Perf Evidence Plan（Node + Browser before/after/diff）与诊断开销预算（`diagnostics=off` 近零成本）。
- **统一最小 IR + 稳定锚点**：成员 spec 的所有新协议/事件必须能降解到统一最小 IR（Static IR + Dynamic Trace），并用稳定锚点贯穿（`instanceId/txnSeq/opSeq/linkId`）。
- **事务窗口禁止 IO**：异步必须拆成“事务内标记 + 事务外 IO + 事务内回写”，不得在事务窗口内 await/IO。
- **React 无 tearing**：同一 React commit 必须读取到同一快照锚点；外部源接入必须 pull-based（signal dirty），禁止 payload/队列风暴。

## 状态枚举（建议）

- `idea`：想法/候选项
- `planned`：已决定要做，但尚未补齐 spec-kit 产物
- `draft`：spec 已创建且产物齐全（至少：`spec.md`/`plan.md`/`tasks.md`/`research.md`/`data-model.md`/`contracts/README.md`/`quickstart.md`/`checklists/requirements.md`；其中 `data-model.md`/`contracts/*` 允许 N/A 但需有原因与替代门槛），但未进入实现
- `implementing`：实现中
- `done`：达标完成（有证据/迁移说明）
- `frozen`：保留为基线/对照，不再扩展

> 状态 SSoT：以 `spec-registry.json` 的 `status` 为准。

## Member Specs（入口表）

| ID | 主题 | 依赖 | 状态 | 实施入口 |
|----|------|------|------|----------|
| 088 | Async Action / Transition 协调面 | - | draft | `specs/088-async-action-coordinator/tasks.md` |
| 089 | Optimistic 协议（确认/回滚/撤销） | 088 | draft | `specs/089-optimistic-protocol/tasks.md` |
| 090 | Suspense Resource/Query（缓存/去重/预取/取消） | 088 | draft | `specs/090-suspense-resource-query/tasks.md` |
| 091 | Busy Indicator 策略（延迟/最短/防闪烁） | 088 | draft | `specs/091-busy-indicator-policy/tasks.md` |
| 092 | 端到端可观测链路（action→txn→notify→render） | 088, 089, 090 | draft | `specs/092-e2e-latency-trace/tasks.md` |

## 里程碑（建议）

> 里程碑的具体“达标口径”以 member spec 的 `spec.md/plan.md/quickstart.md` 为准；本节只给推进顺序建议。

- **M0（基础协议闭环）**：先完成 088（统一 action 协调面），使后续能力有统一锚点与事件链路。
- **M1（体验关键拼图）**：并行推进 089（optimistic）+ 090（resource/suspense）+ 091（busy policy），但都必须对齐 088 的 action 语义与标识。
- **M2（可解释与门禁）**：完成 092（端到端 trace），把“协调是否成功”变成可测、可解释、可回归的事实源。
