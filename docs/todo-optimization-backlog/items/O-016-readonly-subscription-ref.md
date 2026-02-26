---
id: O-016
title: 业务层只读 SubscriptionRef（state.ref/runtime.ref 去可写化）
priority: P1
status: done
owner: depth1-implementation
updatedAt: 2026-02-26
links:
  spec:
    spec: "N/A: depth1 direct task"
    plan: "N/A: depth1 direct task"
    tasks: "N/A: depth1 direct task"
  implementation:
    - packages/logix-core/src/internal/runtime/core/module.ts
    - packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts
    - packages/logix-core/src/ExternalStore.ts
    - examples/logix/src/patterns/long-task.ts
    - examples/logix/src/scenarios/approval-flow.ts
  evidence:
    perf:
      - "N/A: 本次改动不触达 dispatch/commit 热路径，仅收敛 ref 暴露类型与写入口边界"
    diagnostics:
      - "Runtime guard: 对强制 cast 后的写入触发明确 dieMessage，防止 silent bypass"
  writeback:
    ssot:
      - docs/ssot/runtime/logix-core/runtime/05-runtime-implementation.01-module-runtime-make.md
    userDocs:
      - apps/docs/content/docs/api/core/bound-api.cn.md
      - apps/docs/content/docs/guide/learn/managing-state.cn.md
notes:
  blockingReason: ""
  freezeReason: ""
---

# O-016 业务层只读 SubscriptionRef（state.ref/runtime.ref 去可写化）

## problem

当前业务代码可通过 `runtime.ref()` / `$.state.ref()` 直接拿到可写 `SubscriptionRef`，从而绕过事务入口与受控写路径，破坏状态写入边界与可解释链路。

## evidence

- 代码锚点：`ModuleRuntime.ref` 在无 selector 时直接返回底层 `stateRef`（可写）。
- 示例锚点：`examples/logix/src/scenarios/and-update-on-changes.ts`、`examples/logix/src/patterns/long-task.ts` 曾直接 `SubscriptionRef.update`。
- 风险：业务写入可绕开 `$.state.update/mutate` 等受控 API，导致写路径不统一。

## design

- 新增只读句柄 `ReadonlySubscriptionRef<V>`（`get + changes`）。
- `ModuleRuntime.ref` / `$.state.ref` 统一返回只读句柄，不再暴露写能力。
- 运行时增加防护：若调用方强制 cast 后尝试写入，返回明确失败（`dieMessage`）。
- 业务示例迁移到受控写入口（`setState` / `$.state.update`）。

## budget

- perf：`N/A`（不改变事务提交算法与热路径，仅改变 ref 暴露边界与示例写法）。
- diagnostics：保留轻量失败信息，确保越权写入可诊断。

## check

- [x] C1 机会池 -> spec 链路已补齐（`links.spec.*`）
- [x] C2 spec -> 实现链路已补齐（`links.implementation[]`）
- [x] C3 实现 -> 证据链路已补齐（`links.evidence.*`）
- [x] C4 证据 -> 回写链路已补齐（`links.writeback.*`）
- [x] C5 `items/README.md` 与 `status-registry.json` 状态一致
