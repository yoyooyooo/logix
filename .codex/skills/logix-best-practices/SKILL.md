---
name: logix-best-practices
description: Use when building or refactoring business features in any Logix + Effect project and you need feature-first module design, explicit cross-module collaboration boundaries, and evidence-driven runtime quality gates.
---

# logix-best-practices

把 Logix 写法收敛成一个可运行、可复用、可交接的工程模式：优先 feature-first，显式区分 Module / Process / Pattern，并把事务边界、可解释诊断、性能证据纳入默认交付面。

## 统一北极星

- 单一事实源：`Static IR + Dynamic Trace`。
- 协作默认确定性优先：可静态表达的跨模块关系，优先 `Process.linkDeclarative`。
- 事务安全优先：同步事务窗口内禁止 IO / 嵌套 dispatch / `run*Task`。
- 证据先于结论：核心路径改动必须给出可复现的性能与诊断证据。

## 快速入口（默认 feature-first）

1. 选择落点：用 `src/features/<feature>/` 聚合该 feature 的 Module/Process/局部 Pattern/Service Tag。
2. 建最小闭环：用 `src/runtime/*` 作为 Composition Root（imports/processes/layer），再用 `src/scenarios/*` 提供可运行入口。
3. 跨模块协作先判定形态：
   - 可静态表达 `read -> dispatch`：优先 `Process.linkDeclarative`（ReadQuery 必须 static + readsDigest）。
   - 需要异步桥接/外部副作用：再用 `Process.link`（blackbox、best-effort）。
4. 状态写入：优先 `$.state.mutate(...)` / `immerReducers`；仅在整棵替换或回滚场景用 `$.state.update(...)`。
5. 若改动触及 runtime 核心路径（StateTransaction/TaskRunner/ProcessRuntime/DevtoolsHub 等），必须走性能与诊断证据闭环（见资源导航）。

## 专题选路（按问题类型直达）

- 你在做 Builder SDK、静态分析或代码生成：`references/builder-sdk-playbook.md`
- 你在做 DSL/Parser/Codegen/IR 一致性：`references/ir-and-codegen-playbook.md`
- 你在做诊断事件、evidence package、replay：`references/observability-and-replay-playbook.md`
- 你在做测试体系与回归门设计：`references/testing-strategy-playbook.md`
- 你在做 Logix 测试工具链与场景 DSL：`references/logix-test-playbook.md`
- 你在做表单等领域能力落地：`references/form-domain-playbook.md`
- 你在做 CLI/React/Worker 宿主接入：`references/platform-integration-playbook.md`

## 工作流（从需求到落点）

1. 先判断你要产出哪一类：`scenario` / `pattern` / `module` / `process`。
2. 选落点：
   - 业务开发推荐目录（feature-first）：`src/features/<feature>/**`（Module/Process/局部 Pattern/Service Tag 就近聚合）。
   - 可复用 Pattern 目录（跨 feature）：`src/patterns/*`（至少 2 个 feature/场景消费再升级）。
   - 组合根（Composition Root）：`src/runtime/*`（只做 imports/processes/layer）。
   - 可运行入口：`src/scenarios/*`（单文件闭包；确保资源释放）。
   - IR/Parser 映射演示：独立放 `src/scenarios/ir/*`（非业务推荐）。
3. 组合根原则：Root 只做 `imports/processes/layer`，避免堆业务细节。
4. 依赖注入原则：Pattern/Module 只声明 Tag 契约；实现集中在组合层用 `Layer` 提供。
5. Pattern 升级门槛：进入 `src/patterns/*` 前，确保有 ≥2 个 consumers；用脚本做门禁（见 “资源导航”）。
6. 交付前验证默认顺序：类型检查 → lint → 非 watch 测试（按项目脚本执行；可用 `<pkg-manager> run typecheck|lint|test` 等等价命令）。

## 压力场景速判

- 你看到 “只是同步映射联动，却默认写了 blackbox Process.link”：
  - 先改成 `Process.linkDeclarative`，只在确实需要 async/external bridge 时退回 blackbox。
- 你看到 “事务里顺手 dispatch/run*Task”：
  - 立即改为 multi-entry（pending → IO → writeback），避免触发 `logic::invalid_usage` / `state_transaction::enqueue_in_transaction`。
- 你看到 “核心路径改了但只跑了单测”：
  - 补 perf baseline + diagnostics evidence（见 `references/diagnostics-and-perf-gates.md`）。

## 资源导航（本 skill 内置）

- 最小闭环工作流与检查清单：`references/workflow.md`
- 统一北极星与裁决优先级：`references/north-star.md`
- 文档/样例一致性核对（防漂移）：`references/consistency-checklist.md`
- Logix Core 注意事项（setup/run、Phase Guard、Tag 泛型）：`references/logix-core-notes.md`
- Logix React 注意事项（useModule/useSelector 性能与语义）：`references/logix-react-notes.md`
- 核心路径改动的诊断与性能证据闭环：`references/diagnostics-and-perf-gates.md`
- Builder SDK：`references/builder-sdk-playbook.md`
- IR 与 Codegen：`references/ir-and-codegen-playbook.md`
- 可观测性与回放：`references/observability-and-replay-playbook.md`
- 测试策略：`references/testing-strategy-playbook.md`
- Logix Test：`references/logix-test-playbook.md`
- Form 领域落地：`references/form-domain-playbook.md`
- 平台集成（CLI/React/Worker）：`references/platform-integration-playbook.md`
- feature-first 逐文件最小写法（可复制模板）：`references/feature-first-minimal-example.md`
- 内置可复制样板源码（按目录拷贝进你的项目）：`assets/feature-first-customer-search/src`
- 一键落地样板到目标目录（默认不覆盖）：`scripts/scaffold-feature-first.mjs`
- Pattern 复用门禁脚本（可放进 CI/本地 preflight）：`scripts/check-pattern-reuse.mjs`
