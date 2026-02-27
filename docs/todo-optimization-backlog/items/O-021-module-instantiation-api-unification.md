---
id: O-021
title: Module 实例化 API 统一（build/createInstance）
priority: P1
status: writeback
owner: depth1-implementation
updatedAt: 2026-02-27
links:
  spec:
    spec: specs/102-o021-module-api-unification/spec.md
    plan: specs/102-o021-module-api-unification/plan.md
    tasks: specs/102-o021-module-api-unification/tasks.md
  implementation:
    - packages/logix-core/src/Module.ts
    - packages/logix-core/src/Runtime.ts
    - packages/logix-core/src/internal/runtime/core/DebugSink.record.ts
    - packages/logix-core/test/Module/Module.api-unification.test.ts
    - packages/logix-core/test/internal/Runtime/Runtime.ModuleInput.Unification.test.ts
    - docs/ssot/runtime/logix-core/observability/09-debugging.01-debugsink.md
    - docs/ssot/runtime/logix-core/observability/09-debugging.02-eventref.md
    - docs/ssot/runtime/logix-core/observability/09-debugging.05-diagnostics.md
    - docs/ssot/runtime/logix-core/api/02-module-and-logic-api.00-quick-overview.md
    - docs/ssot/runtime/logix-core/api/02-module-and-logic-api.03-module-logic.md
    - docs/ssot/runtime/logix-core/api/02-module-and-logic-api.04-live-layer.md
    - docs/ssot/runtime/logix-core/api/02-module-and-logic-api.06-runtime-container.md
    - docs/ssot/runtime/logix-core/api/03-logic-and-flow.02-logic-program.md
    - docs/ssot/runtime/logix-core/api/05-runtime-and-runner.md
    - apps/docs/content/docs/api/core/module.cn.md
    - apps/docs/content/docs/api/core/runtime.cn.md
  evidence:
    perf:
      - specs/102-o021-module-api-unification/perf/before.local.darwin-arm64.node22.quick.json
      - specs/102-o021-module-api-unification/perf/after.local.darwin-arm64.node22.quick.json
      - specs/102-o021-module-api-unification/perf/diff.before__after.node22.quick.json
    diagnostics:
      - packages/logix-core/test/Module/Module.api-unification.test.ts（断言 module_instantiation::legacy_entry + source）
      - packages/logix-core/test/internal/Runtime/Runtime.ModuleInput.Unification.test.ts（统一入口契约）
  writeback:
    ssot:
      - docs/ssot/runtime/logix-core/observability/09-debugging.01-debugsink.md
      - docs/ssot/runtime/logix-core/observability/09-debugging.02-eventref.md
      - docs/ssot/runtime/logix-core/observability/09-debugging.05-diagnostics.md
      - docs/ssot/runtime/logix-core/api/02-module-and-logic-api.00-quick-overview.md
      - docs/ssot/runtime/logix-core/api/02-module-and-logic-api.03-module-logic.md
      - docs/ssot/runtime/logix-core/api/02-module-and-logic-api.04-live-layer.md
      - docs/ssot/runtime/logix-core/api/02-module-and-logic-api.06-runtime-container.md
      - docs/ssot/runtime/logix-core/api/03-logic-and-flow.02-logic-program.md
      - docs/ssot/runtime/logix-core/api/05-runtime-and-runner.md
    userDocs:
      - apps/docs/content/docs/api/core/module.cn.md
      - apps/docs/content/docs/api/core/runtime.cn.md
notes:
  blockingReason: ""
  freezeReason: ""
---

# O-021 Module 实例化 API 统一（build/createInstance）

## problem

`live/implement/impl` 并行存在，导致实例化入口与术语分叉；Runtime 装配链路中同一个 root 可能经由不同入口解析，增加行为漂移与迁移成本。

## evidence

- 运行时代码锚点：`packages/logix-core/src/Module.ts`、`packages/logix-core/src/Runtime.ts`。
- 诊断锚点：legacy 入口触发 `module_instantiation::legacy_entry`，并携带 `source/hint`。
- 性能证据：`specs/102-o021-module-api-unification/perf/*`（before/after/diff 已落地，diff comparable=true）。

## design

- 对外统一到 `ModuleDef.build(...)` + `createInstance(...)`，并支持 Layer-first 的 `ModuleDef.layer(config)`。
- Runtime root 解析优先 `createInstance()`，并对 legacy `.impl` 做一致性断言与输入校验。
- `writeback` 阶段保留 legacy 读口仅用于迁移盘点，但通过结构化诊断显式提示替代路径；`done` 门禁前移除 legacy 公开可用面。
- 文档口径统一：SSoT 与中文 API 文档默认推荐新入口，legacy 仅保留迁移说明。

## budget

- perf：以 `quick` 子集采样作为当前阶段门禁，`diff.before__after.node22.quick.json` 显示 `comparable=true`、`regressions=0`、`budgetViolations=0`；当前为同 commit 双采样，跨提交预算对照留待 `done` 前补齐。
- diagnostics：新增字段为 `diagnostic.source?: string`，保持 Slim/可序列化，不引入额外对象图。

## check

- [x] C1 机会池 -> spec 链路已补齐（`links.spec.*`）
- [x] C2 spec -> 实现链路已补齐（`links.implementation[]`）
- [x] C3 实现 -> 证据链路已补齐（`links.evidence.*`）
- [x] C4 证据 -> 回写链路已补齐（`links.writeback.*`）
- [x] C5 `items/README.md` 与 `status-registry.json` 状态一致
