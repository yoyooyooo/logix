# Research: 087 Async Coordination Roadmap（总控裁决摘要）

## Decision: 用 Spec Group（registry + checklist）作为单入口

**Rationale**:

- Async 协调涉及 Runtime/React/Devtools/Query/Design System 多层，单个 spec 容易变成“万字大杂烩”且无法并行推进。
- group 模式可以把关系与门槛固化为 SSoT（json），并用脚本生成 index-only checklist，避免并行真相源。

**Alternatives considered**:

- 单 spec：交付慢、冲突面大、不可并行、验收门槛不清晰。
- 用 docs/specs/drafts 做总控：不利于落实到可执行 tasks 与验收闭环；最终仍需要落到 specs/*。

## Decision: 先统一 Async Action，再做 optimistic/resource/busy，再补 E2E trace

**Rationale**:

- 088 负责定义“协调单元”（一次交互的 async chain）与稳定标识贯穿；没有它，optimistic/resource/busy/trace 都会各自为政。
- 092 的价值依赖 088/089/090 的稳定语义与事件，否则只能做到“采样渲染耗时”而无法解释因果链。

## Decision: member specs 直接裁决并回写 Clarifications（AUTO）

**Chosen**: 高影响的“默认口径”不留 TBD：由 member specs 在 `spec.md##Clarifications` 中直接裁决并成为 SSoT。

- Busy 默认参数与嵌套裁决：见 `specs/091-busy-indicator-policy/spec.md`
- Resource 默认 suspend/degrade 与缓存上界：见 `specs/090-suspense-resource-query/spec.md`
- E2E trace segment 集合与 paint 可选：见 `specs/092-e2e-latency-trace/spec.md`
