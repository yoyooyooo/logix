---
title: Logix API Planning Housekeeping
status: draft
version: 6
---

# Logix API Planning Housekeeping

## 目标

控制 `logix-capability-planning-loop` 产生的中间文档规模，避免 proposal、collision、snapshot、review、feedback 等工件同时保持半活跃状态，导致控制面失控。

本页只定义 planning control plane 的清理、归档与预算规则，不承担 authority。

## 文档类型

| type | path | role | allowed content |
| --- | --- | --- | --- |
| `authority` | `docs/ssot/**` | 稳定事实源 | 稳定裁决，不记录过程噪声 |
| `control-plane` | `docs/next/logix-api-planning/**` | 当前活跃状态 | 当前 cursor、portfolio、snapshot、housekeeping |
| `conversion-control` | `docs/next/logix-api-planning/implementation-ready-conversion.md` | planning closure 后的实施包切分或已消费索引 | active conversion set；若已消费则只保留 outcome index |
| `implementation-task-queue` | `docs/next/logix-api-planning/post-conv-implementation-task-queue.md` | proof refresh 后的 residual implementation queue | post-CONV task、scope seed、non-claims、proof gates |
| `surface-registry` | `docs/next/logix-api-planning/surface-candidate-registry.md` | 公开概念候选控制面 | candidate、proof、authority、status |
| `implementation-gap-ledger` | `docs/next/logix-api-planning/api-implementation-gap-ledger.md` | 冻结 API 点位的实现 / 类型 / proof 缺口总账 | authority status、runtime status、type status、proof status、gap kind、next route |
| `workspace` | `docs/proposals/logix-api/**` | 单 proposal 工作文档 | 单提案 planning 内容 |
| `ledger` | `docs/review-plan/runs/**` | review 记录 | review rounds、freeze、residual risk |
| `implementation-proof-artifact` | production internal or test files touched by implementation proof | 临时验证代码 | lifecycle state、naming review、cleanup trigger |
| `archive` | future archive path or consumed indexes | 历史工件 | superseded / consumed / historical 状态 |

## 状态机

统一 frontmatter 或正文状态只允许：

- `draft`
- `active`
- `frozen`
- `consumed`
- `superseded`
- `archived`

## 状态含义

| status | meaning | next allowed states |
| --- | --- | --- |
| `draft` | 尚未进入主控制面 | `active`, `superseded`, `archived` |
| `active` | 当前活跃推进中 | `frozen`, `consumed`, `superseded`, `archived` |
| `frozen` | 本轮结论已定，等待消费 | `consumed`, `superseded`, `archived` |
| `consumed` | 已被更高层文档吸收 | `archived` |
| `superseded` | 已被更优方案替换 | `archived` |
| `archived` | 退出活跃工作集 | terminal |

## 预算

| document | budget |
| --- | --- |
| `run-state.md` | 只保留当前 cursor，正文尽量小于 80 行 |
| `proposal-portfolio.md` | 只保留 `active / frozen / implementation-ready` 主体；其他状态只留索引 |
| `surface-candidate-registry.md` | 只保留仍影响 shape 的候选；被消费的候选压缩成一行 |
| `api-implementation-gap-ledger.md` | 每个 frozen API 点只保留一行当前状态；旧 owner route 与旧 gap 不复制成长段历史 |
| `shape-snapshot.md` | 每个场景最多一个主片段；多候选时最多两种并排 |
| `implementation-ready-conversion.md` | 只保留当前 active conversion set；已完成 conversion 降成 outcome index |
| `post-conv-implementation-task-queue.md` | 只保留当前 ready / deferred residual task，不复制 packet 全文 |
| single proposal file | 尽量小于 250 行；超过则拆出 principle / collision / proof 附件 |
| `feedback/active-learnings.md` | 只保留当前仍影响行为的 lesson |
| review ledger | 可长，但只允许长在 `docs/review-plan/runs/**` |
| verification artifacts | wave 结束时必须有 lifecycle decision |

## 归档触发条件

出现下面任一情况，必须清理或归档：

- proposal 状态变成 `consumed` 或 `superseded`
- review ledger 已有 freeze record
- verification artifact 被 generalize、demote、delete 或 promoted-authority-request 消费
- snapshot 被新 snapshot 替代
- surface candidate 变成 `rejected / superseded / authority-linked` 且已被 snapshot 或 authority 消费
- principle candidate 被 adopted 或 rejected
- run-state 发生 phase 切换
- portfolio 中某条连续三轮没有变化
- collision 被关闭且已写回 authority 或 projection

## Housekeeping Checklist

每轮 planning wave 结束后必须执行：

1. 更新 `run-state.md`
2. 关闭已解决 proposal
3. 把 `consumed` proposal 降成一行索引
4. 把 `superseded` proposal 标记并移出活跃工作集
5. 更新 `surface-candidate-registry.md`，确保候选状态与 portfolio / authority 对齐
6. 压缩 `shape-snapshot.md`，确保 snapshot 从 registry 读取，不自造候选
7. 把重复 feedback 压进 `feedback/active-learnings.md`
8. 检查 portfolio 中是否存在：
   - 无 owner
   - 无 next action
   - 无 close predicate
   - 无 review ledger
9. 检查 surface registry 中是否存在：
   - 无 owner projection
   - 无 authority target
   - 无 proof state
   - 长期停留 `candidate / under-review`
10. 检查 implementation gap ledger 中是否存在：
   - 冻结 API 点没有对应行
   - authority 已冻结但 runtime/type/proof 状态未更新
   - next route 指向已关闭或不存在的 packet / task / FU
   - 同一 API 点存在并行重复行
11. 检查 verification artifacts 中是否存在：
   - 无 lifecycle state
   - 场景化命名被跨 proof 复用但没有 naming review
   - production internal 中长期保留 artifact-local helper
   - cleanup trigger 缺失
12. 检查 run-state 里的 resume artifact 是否仍真实可恢复
13. 检查 `implementation-ready-conversion.md` 是否只保留 active conversion set；已完成 conversion 应降成 outcome index
14. 检查 `post-conv-implementation-task-queue.md` 是否只保留真实 residual，不把已 proof-refreshed packet 重新展开成活跃计划

## Control Principle

control-plane 只保留活的东西：

- 活跃状态看 `docs/next/logix-api-planning/**`
- 历史判断看 `docs/review-plan/runs/**`
- 稳定事实看 `docs/ssot/**`

同一个结论不得同时活在三层。

## 当前一句话结论

planning control plane 要可恢复，也要可收缩。任何中间工件只要不再活跃，就应被降级、消费或归档。
