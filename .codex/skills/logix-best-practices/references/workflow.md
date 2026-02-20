---
title: 工作流与检查清单
---

# 工作流与检查清单

## 1) 新建一个 feature（feature-first）

按顺序落地，保证每一步都能独立解释与可测试：

1. 定义最小领域模型：`src/features/<feature>/model.ts`
2. 定义 Tag-only Service 契约（插槽）：`src/features/<feature>/service.ts`
3. 定义 ModuleDef（Shape + 纯 reducers；不放长逻辑）：`src/features/<feature>/<Feature>.def.ts`
4. 编写 Logic（Fluent/Flow）：`src/features/<feature>/<Feature>.logic.ts`
   - 只在 run 段/Effect 主体里使用 `$.use / $.onAction / $.onState / $.flow`
   - handler 内统一 `Effect.gen` + `yield*`，避免 `async/await`
   - 多条长运行 watcher 用 `Effect.all([...], { concurrency: "unbounded" })` 并行启动（不要顺序 `yield*` 多条 `.run*`）
   - action surface：监听优先 `$.onAction($.actions.<K>)`（payload-first）；执行面在 `$.dispatchers.<K>(payload)` 与 `$.actions.<K>(payload)` 中二选一并团队统一，避免散落字符串 tag
   - Action → State 的纯同步更新优先用 `immerReducers` / `$.reducer`；局部字段写入优先 `$.state.mutate`（避免 `state_transaction::dirty_all_fallback`）
   - 长链路（pending → IO → writeback）优先用 `run*Task`（并发语义清晰，IO 不落进同步事务 body）
   - 错误在靠近 Service 调用边界处收敛为领域错误（或在 UI 层转成可展示 message）
5. 组合 ModuleImpl：`src/features/<feature>/<Feature>.impl.ts`（initial + logics）
6. 有跨模块协作时：新增 `src/features/<feature>/processes/*.process.ts`
   - 默认协作：`Process.linkDeclarative({ modules }, ($) => [...])`（确定性优先）
   - 需要 async/external bridge：`Process.link({ modules }, ($) => ...)`（best-effort）
   - Declarative 约束：
     - read side 必须是 static ReadQuery（`lane=static`、`readsDigest!=null`、`fallbackReason==null`）
     - write side 只做 `dispatch(actionTag)`；不混入任意 IO/闭包副作用
7. 需要复用的长逻辑：
   - 先放 `src/features/<feature>/patterns/*`（feature 私有）
   - 当被多个 feature/场景消费后，再提升到 `src/patterns/*`
8. 加一个可运行入口：`src/scenarios/<feature>.ts`（确保 runtime.dispose）
9. 在组合根装配：`src/runtime/root.impl.ts` + `src/runtime/layer.ts`
10. 如果改动触及 runtime 核心路径（StateTransaction / TaskRunner / ProcessRuntime / DevtoolsHub 等）：
   - 必走 `references/diagnostics-and-perf-gates.md` 的证据闭环

## 2) Pattern 提炼与升级规则

把 Pattern 当成“可组合的 Effect 程序”，不要把它做成框架：

- Pattern 形态优先：
  - 纯 Effect：`(input) => Effect.Effect<A, E, R>`
  - 依赖 Logix `$` 的 helper：`($, config) => Effect` 或 `($) => $.onAction(...).run*(...)`
- Pattern 内只依赖 Service Tag（插槽）+ 输入参数；不要在 Pattern 内偷偷 provide 实现。

升级到 `src/patterns/*` 的门槛：

- 至少被 ≥2 个 consumers 引用（否则属于“伪复用”）
- 给出最小使用样例（通常就是另外一个 feature/场景）
- 在 CI/本地门禁里跑 `scripts/check-pattern-reuse.mjs`（见 SKILL.md “资源导航”）

最小用法（示例）：

```bash
# 在你的项目根目录运行（patterns 与 consumers 目录按你项目结构调整）
# <skill-root> 即 SKILL.md 所在目录
node <skill-root>/scripts/check-pattern-reuse.mjs \
  --patterns-dir src/patterns \
  --consumer-dirs src/features,src/scenarios \
  --min 2
```

或使用配置文件（建议放在项目根目录）：

```json
{
  "patternsDir": "src/patterns",
  "consumerDirs": ["src/features", "src/scenarios"],
  "minConsumers": 2,
  "allowlist": []
}
```

## 3) Process（跨模块协作）写法约束

跨模块协作默认是“可审查的显式胶水”，而不是某个模块的副作用：

- 协作落点：`processes/`
- 协作输入：显式声明 `modules: [A, B, ...]`
- 协作方式：监听 A 的 state/action 变化，驱动 B 的 action（避免读/写 B 的内部实现细节）
- 语义选择：
  - `Process.linkDeclarative`：默认（确定性 + 同 tick 收敛前提）
  - `Process.link`：仅用于 async/external bridge（运行时可发 `process_link::blackbox_best_effort`）

## 4) Definition of Done（交接清单）

- Root（Composition Root）只包含 `imports/processes/layer`，没有业务细节
- Service 契约与实现分离（Tag-only + Layer）
- 跨模块协作通过 Process 明确表达（而不是模块间私下耦合）
- Pattern：要么留在 feature 内私有目录，要么满足复用门槛再进全局
- 至少完成一次验证链：类型检查 → lint → 非 watch 测试（按项目脚本）
- 至少跑通一个 `src/scenarios/*` 的最小闭环
- 文档、assets、脚本三者语义一致（可按 `references/consistency-checklist.md` 逐项核对）
- 若改动核心路径：补充 perf/diagnostic 证据并可复现（见 `references/diagnostics-and-perf-gates.md`）

## 5) 常见坑速查

- Logic 两阶段（setup/run）与 Phase Guard：`references/logix-core-notes.md`
- React hooks 性能与语义（useModule/useSelector/shallow）：`references/logix-react-notes.md`
- 核心路径诊断与性能基线：`references/diagnostics-and-perf-gates.md`
