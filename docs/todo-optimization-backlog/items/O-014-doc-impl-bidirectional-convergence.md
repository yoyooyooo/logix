---
id: O-014
title: 文档-实现双向收敛机制固化
priority: P2
status: done
owner: pr/o014-doc-impl-bidirectional-convergence
updatedAt: 2026-02-26
links:
  spec:
    spec: specs/102-o014-doc-impl-bidirectional-convergence/spec.md
    plan: specs/102-o014-doc-impl-bidirectional-convergence/plan.md
    tasks: specs/102-o014-doc-impl-bidirectional-convergence/tasks.md
  implementation:
    - docs/todo-optimization-backlog/README.md
    - docs/todo-optimization-backlog/items/_template.md
    - docs/todo-optimization-backlog/items/README.md
    - docs/todo-optimization-backlog/status-registry.json
    - docs/specs/README.md
    - specs/102-o014-doc-impl-bidirectional-convergence/spec.md
    - specs/102-o014-doc-impl-bidirectional-convergence/plan.md
    - specs/102-o014-doc-impl-bidirectional-convergence/tasks.md
  evidence:
    perf:
      - "N/A: 文档/流程变更，不触达 runtime 核心热路径"
    diagnostics:
      - "N/A: 文档/流程变更，不引入新的诊断事件开销"
  writeback:
    ssot:
      - docs/specs/README.md
      - docs/todo-optimization-backlog/README.md
    userDocs:
      - "N/A: 无用户向功能变更"
notes:
  blockingReason: ""
  freezeReason: ""
---

# O-014 文档-实现双向收敛机制固化

## problem

高价值结论散落在 runtime/impl/reviews 多处，缺少稳定的“机会池 -> spec -> 实现 -> 证据 -> 回写”闭环，导致优化项推进与复用效率不稳定，且状态回写易漂移。

## evidence

- 参考条目中已明确缺口：未冻结最小模板与回写流程（见本条目历史背景）。
- 当前仓库缺少面向 backlog item 的统一模板与状态机说明，无法保证 `links` 与 `status` 的一致回写。
- 缺少机器可读注册表，难以做自动检查与批量盘点。

## design

本条目仅做文档与流程固化，不改 runtime/业务代码：

1. 固化最小模板：在 `items/_template.md` 固定 `problem/evidence/design/budget/check` 五段。
2. 固化推进机制：在 backlog README 定义 `pool -> spec -> implement -> evidence -> writeback -> done`。
3. 固化链接契约：统一 `spec/implementation/evidence/writeback` 字段语义与必填规则。
4. 固化状态回写：每次变更强制同步 item frontmatter、`items/README.md`、`status-registry.json`。

## budget

- 性能预算：`N/A`（文档流程变更，不触达 runtime 热路径）。
- 诊断预算：`N/A`（不新增运行时诊断事件）。
- 工程预算：新增最小文档资产，降低后续条目进入 spec 的信息损耗与回写成本。

## check

- [x] C1 最小模板已固定：`problem/evidence/design/budget/check`
- [x] C2 机制已固定：`机会池 -> spec -> 实现 -> 证据 -> 回写`
- [x] C3 链接契约已补齐并可引用到条目索引
- [x] C4 状态回写规范已补齐（文档 + 注册表）
- [x] C5 `items/README.md` 与 `status-registry.json` 中 O-014 状态一致
