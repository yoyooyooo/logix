---
name: logix-best-practices
description: Use when building or refactoring Logix features and you need a clear route from business feature delivery to runtime-core constraints, with strong alignment to project SSoT and source anchors.
---

# logix-best-practices

把 Logix 开发收敛为“先能交付业务，再不踩运行时红线，最后能被平台解释”的统一工作流。

## 0) 30 秒选路（先判断任务类型）

1. 你只做业务功能，不改 runtime 内核：先读 `references/task-route-map.md` 的 L1 路径，再读 `references/workflow.md`。
2. 你要改跨模块协作语义（`Process.link` / `linkDeclarative`）：先读 `references/workflow.md` + `references/logix-core-notes.md`。
3. 你要改核心路径（`StateTransaction` / `TaskRunner` / `ProcessRuntime` / `DebugSink`）：先读 `references/diagnostics-and-perf-gates.md`。
4. 你在做 Sandbox/Playground/平台对齐：先读 `references/platform-integration-playbook.md`。
5. 你要把资料直接喂给 LLM：按 `references/llms/README.md` 的顺序读取 `01~08`。

## 1) 框架硬约束（不可越线）

- 单一事实源：`Static IR + Dynamic Trace`。
- 稳定锚点去随机化：`instanceId/txnSeq/opSeq/tickSeq` 必须稳定可复现。
- 事务窗口禁止 IO / await / 嵌套 dispatch / `run*Task`。
- 业务不可写 `SubscriptionRef`：尤其派生 `ref(selector)` 只读。
- 诊断事件必须 Slim 且可序列化（`JsonValue`），并可解释降级。
- 命名约定全面采用 `*.make`（不引入 `*.define` 回潮）。
- Playground/Sandbox 是 Runtime Alignment Lab 的一部分，不是普通代码 runner。

完整裁决见：`references/north-star.md`。

## 2) 默认工程策略（业务优先 + 可升级）

- 默认 feature-first：`src/features/<feature>/` 聚合 Module/Logic/Process/Service。
- Composition Root 只做 `imports/processes/layer`：`src/runtime/*`。
- 跨模块协作默认 `Process.linkDeclarative`；确需 async/external bridge 才用 `Process.link`。
- 状态写入优先 `$.state.mutate(...)` / `immerReducers`，整棵替换才用 `$.state.update(...)`。
- 多条长运行 watcher 使用 `Effect.all([...], { concurrency: 'unbounded' })` 并行挂载。

## 3) 压力场景速判

- 同步映射联动却用了 blackbox `Process.link`：先迁回 declarative。
- 在 reducer / 同步事务里调用 `run*Task` 或 dispatch：改成 multi-entry（pending → IO → writeback）。
- 核心路径改动但没有可复现证据：必须补 perf + diagnostics 闭环后再宣称优化成立。
- 需要把运行结果喂给平台评审：按 Alignment Lab 契约产出结构化 RunResult，而不是只给日志。

## 4) 阅读导航

- 任务路线图（L0-L3）：`references/task-route-map.md`
- 工作流与交接清单：`references/workflow.md`
- 北极星与硬约束：`references/north-star.md`
- Core 语义与常见坑：`references/logix-core-notes.md`
- 诊断与性能证据门：`references/diagnostics-and-perf-gates.md`
- 可观测与回放：`references/observability-and-replay-playbook.md`
- 平台集成与 Alignment Lab：`references/platform-integration-playbook.md`
- 文档/样例/脚本一致性核对：`references/consistency-checklist.md`
- LLM 基础知识包（可直接转 llms.txt）：`references/llms/README.md`

## 5) 专题手册（按需加载）

- Builder SDK：`references/builder-sdk-playbook.md`
- IR 与 Codegen：`references/ir-and-codegen-playbook.md`
- 测试策略：`references/testing-strategy-playbook.md`
- Logix Test：`references/logix-test-playbook.md`
- Form 领域落地：`references/form-domain-playbook.md`
- React 注意事项：`references/logix-react-notes.md`
- feature-first 最小样板：`references/feature-first-minimal-example.md`
- 模板资产：`assets/feature-first-customer-search/src`
- 样板脚手架：`scripts/scaffold-feature-first.mjs`
- Pattern 复用门禁：`scripts/check-pattern-reuse.mjs`
- 项目锚点映射模板（可选）：`references/llms/99-project-anchor-template.md`
