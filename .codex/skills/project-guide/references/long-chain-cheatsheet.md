---
title: 长链路小抄（总骨架 / 不变量 / 关键机制）
status: draft
version: 1
---

# 长链路小抄（总骨架 / 不变量 / 关键机制）

> 用途：在不通读 `references/long-chain-*.md` 的前提下，快速建立“运行时总骨架 + 必要不变量 + 常用机制”的心智模型；细节以各平面文档与代码为准。

## 目录

- 1. Runtime 总骨架
- 2. 不变量速记
- 3. 关键机制（极简解释）
- 4. 深挖入口
- 5. 长链路专用 auggie 查询模板

---

## 1) Runtime 总骨架（最常见长链路）

1. **定义期（纯静态）**：`Module.make` / `StateTrait.from(...).computed/link/source(...)`
2. **组装期（接线与组合）**：`ModuleDef.implement(...)` → `Runtime.make(root, options)` → `AppRuntime.make`（`root` 可为 program module 或其 `.impl`）
3. **运行期（实例内核）**：`ModuleFactory` 构建 `ModuleRuntime`
4. **写入期（事务窗口）**：`dispatch` → `txnQueue` → `StateTransaction(begin/patch/converge/commit)`
5. **对外可见**：commit 发生 **0/1 次** `SubscriptionRef.set(nextState)`；React/Devtools 只看到“原子替换后的状态”

---

## 2) 不变量速记（读源码前先记住）

- **实例级串行队列**：单实例内部永远串行，消灭写竞态；不同实例可并行
- **事务窗口禁止 IO**：任何异步/外部调用必须在 run 段单独 Fiber 完成，再通过 `dispatch/update/mutate` 回写
- **单次提交**：一次事务对外最多一次 `SubscriptionRef.set`，避免 UI tearing
- **Logic 两阶段**：setup 只做同步注册；run 才允许长期 Fiber/Env/订阅；Phase Guard 把“语义错”变成可诊断错误
- **StateTrait 的确定性**：Single Writer（同一路径只能有一个 writer）；dirty roots 归一化（聚合/前缀收敛/兜底）决定增量边界
- **增量也要有性能下界**：增量决策/计划超过预算则 cut-off 回退 full，避免负优化
- **Auto Converge 决策预算（Decision Budget）**：`traitConvergeDecisionBudgetMs` 默认 `0.5ms`（`Runtime.make(...,{ stateTransaction:{ traitConvergeDecisionBudgetMs } })` 或 `StateTransactionConfig/Overrides` 覆写），用于限制 auto 模式“计划计算/决策”成本；超预算会记录 `budget_cutoff` 并回退 `full`（014 以 `runtime.decisionMs` 观测）
- **决策预算检查粒度（默认 32）**：扫描 topoOrder 时每 `32` step 检查一次预算；并对 `totalSteps < 32` 的小图禁用“扫描前 early-cutoff”，避免 sub-ms 时钟抖动引入 flaky（落点：`packages/logix-core/src/internal/state-trait/converge.ts`）
- **`near_full` 判定**：auto 模式下若受影响计划 `planSteps/totalSteps >= 0.8`，则选择 `full` 并记录 `near_full`（落点同上）
- **别和 014 的 steps 轴混淆**：`specs/014-browser-perf-boundaries/matrix.json` 的 `steps=200/800/2000` 指 trait 图规模（`totalSteps`），不是预算检查粒度
- **副作用数据化**：业务逻辑发射 `EffectOp`，runtime 通过 middleware 链注入 trace/拦截/观测；平台层再桥接到真实 IO
- **观测分级与 Slim 约束**：`off/light/full`；诊断事件必须 Slim 且可序列化（避免闭包/循环引用/超大 payload）
- **稳定标识去随机化**：`instanceId/txnSeq/opSeq` 稳定且单调；禁止 `Math.random()`/`Date.now()` 作为核心标识

---

## 3) 关键机制（极简解释）

- **事务窗口（StateTransaction）**：在 draft 上累积 patch → 只在窗口末尾 converge → commit 时做一次原子替换（对外 0/1 次可见更新）
- **增量收敛（Auto Converge）**：`DirtyRoots` 先归一化成“pattern”→ 查/算执行计划（可缓存）→ 按计划执行 computed/link/validate；超预算则回退 full 保证下界
- **影响面分析（Reverse Closure）**：用反向邻接表从 dirty 字段做 BFS 得到“受影响闭包”，用于 scoped validate/diagnostics（避免全图遍历）
- **批处理（dispatchBatch）**：把 `[A,B,C]` 作为一个 task 入队，在同一事务窗口内跑完 reducer，最后只 converge 一次、只 commit 一次（减少重算与通知）
- **低优先级刷新（dispatchLowPriority）**：不改变队列优先级，只在 commit meta 标记 `priority="low"`；React 订阅侧据此延后 flush（rAF/timeout + maxDelay 兜底）
- **副作用总线（EffectOp Pipeline）**：逻辑只产出 Op（纯数据）→ runtime middleware 洋葱链（trace 注入/拦截/DebugSink tap）→ platform handler 执行真实 IO
- **证据包（Evidence Package）**：`DevtoolsHub` 按 digest 去重存 Exported IR，事件只引用 digest + integer ID，导出时组装成 `summary(staticIR)` + `events(trace)`
- **模块解析三分法**：本模块 imports（strict）/ Root 单例（global）/ Link 胶水（显式协作）；三者语义混用会让实例绑定与可诊断性崩掉
- **程序化入口（ProgramRunner）**：把“boot→main→dispose”资源化，并把信号/退出码/错误上报变成统一协议，避免到处手写 `ManagedRuntime.make + runPromise`
- **Sandbox 基础设施链路**：编译/执行/协议/证据的边界必须清晰；Sandbox 不只是 runner，而是 Alignment Lab 的可解释执行底座
- **测试=证据回归**：测试侧优先断言“结构化证据/trace”，而不是只断言末态（否则回归难定位）
- **Feature Kits 的职责**：把领域 DSL 与约束下沉到 trait/logic，把平台差异留在 adapter（React/TanStack/…），避免在业务层散落“平台 if/else”

---

## 4) 深挖入口（按需跳转）

- 正交分解索引（A–K）：`references/long-chain-index.md`
- 导览（从业务写法到实现落点）：`.codex/skills/project-guide/references/runtime-logix/logix-core/concepts/02-long-chain-tour.md`
- 数据/性能：`references/long-chain-a-data-plane.md`、`references/diagnostics-perf-baseline.md`
- 执行/并发：`references/long-chain-b-execution-plane.md`
- 副作用/平台桥：`references/long-chain-d-effect-plane.md`
- 观测/证据/回放：`references/long-chain-efg-observability-evidence-replay.md`

---

## 5) 长链路专用 auggie 查询模板（复制即用）

> 更完整模板见：`references/auggie-playbook.md`。

- “`txnQueue` 如何保证实例内串行？`StateTransaction` 的 begin/patch/converge/commit 在哪？”
- “`dispatchBatch`/`dispatchLowPriority` 的实现点分别在哪？commit meta 如何写入/在 React 订阅层如何消费？”
- “`StateTrait.build` 如何构建 deps 图与 reverse closure？dirty roots 归一化与 overlap 判断在哪？”
- “`plan-cache` 以什么 key 缓存？预算 cut-off 的实现点在哪？”
- “`EffectOpCore` 的 middleware 链如何接入 DebugSink/Platform？trace 上下文从哪里来？”
- “`DevtoolsHub` 如何按 digest 去重 Exported IR？Evidence package 的导出入口在哪？”
- “`imports(strict)` 与 `Root.resolve` 的边界在哪里？`resolveImportedModuleRef` 如何决定实例？”
- “`applyTransactionSnapshot` 如何拿到 before/after 快照？为何 dev-only？ReplayLog 在哪记账？”
- “`ProgramRunner` 如何处理 signals/exit code/closeScopeTimeout？哪些错误会上报到 Runtime.onError？”
- “`logix-sandbox` 的 compiler/worker/protocol/client 是怎样串起来的？最小可回放证据从哪导出？”
- “`@logix/test` 的 TestRuntime 如何收集 changes/debug 变成可断言的 trace？Scenario 的最小写法在哪？”
- “`@logix/form`/`@logix/query` 的上层 DSL 是怎样落到 runtime trait/logic 的？React/TanStack adapter 的边界在哪？”
