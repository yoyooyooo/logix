# Logix Runtime · 长链路地图（实现视角）

> **目标**：让维护者/LLM 在不通读所有文档的情况下，先建立“广度脉络”，并知道每条链路该去哪里深挖。
>
> **注意**：本文是实现视角小抄（非 SSoT）。对外契约与口径以 `.codex/skills/project-guide/references/runtime-logix` 为准。

## 0. 最短入口（先读哪 3 个点）

1. Runtime 契约（SSoT 总览）：`.codex/skills/project-guide/references/runtime-logix/README.md`
2. Module/Logic/Flow 编程模型：`.codex/skills/project-guide/references/runtime-logix/logix-core/api/02-module-and-logic-api.md`、`.codex/skills/project-guide/references/runtime-logix/logix-core/api/03-logic-and-flow.md`
3. 代码真实落点：`packages/logix-core/src/index.ts`（导出裁决）→ `packages/logix-core/src/internal/runtime/**`（实现内核）

---

## 1. “从定义到跑起来”：Module → Impl → Runtime.make

### 入口（按阅读顺序）

- 运行时 SSoT（概念/契约）：`.codex/skills/project-guide/references/runtime-logix/logix-core/api/02-module-and-logic-api.md`
- 公共入口：`packages/logix-core/src/Module.ts`、`packages/logix-core/src/Runtime.ts`
- 组装容器：`packages/logix-core/src/internal/runtime/AppRuntime.ts`

### 链路概览

1. `Module.make(id, shape)` 定义契约（Schema/Tag/Id）。
2. `Module.logic(($)=>...)` 产出 Logic（会被归一为 LogicPlan：setup/run）。
3. `ModuleDef.implement({ initial, logics, imports?, processes? })` 返回 **Module（wrap module，含 `.impl`）**；需要装配蓝图时取 `.impl`（`ModuleImpl`）。
4. `Runtime.make(root, options)` 合并 Layer/Devtools/EffectOp middleware，构建 AppRuntime 并产出可运行 ManagedRuntime（`root` 可为 program module 或其 `.impl`）。

### 关键不变量（读源码时先记住）

- **Module 定义是纯静态**；所有依赖注入/副作用都必须在 Runtime 侧完成。
- **Runtime.make 只负责“接线与组合”**：Layer 合并、processes fork、debug/middleware 注入；业务语义不应散落在这里。

---

## 2. Logic 两阶段：setup/run 调度 + Phase Guard

### 入口（按阅读顺序）

- SSoT（契约/非法用法矩阵）：`.codex/skills/project-guide/references/runtime-logix/logix-core/api/03-logic-and-flow.md`
- Logic 归一与 Bound API 注入：`packages/logix-core/src/internal/runtime/ModuleFactory.ts`
- setup/run 执行与监督：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`
- Phase Guard（setup-only/run-only）：`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`
- 诊断结构：`packages/logix-core/src/internal/runtime/core/LogicDiagnostics.ts`

### 链路概览

1. `ModuleFactory` 在构造 logic Effect 时创建 Bound API（`BoundApiRuntime.make`），注入 `getPhase()` 与 `phaseRef`。
2. `ModuleRuntime.make` 解析并执行 logic：
   - 若是 `LogicPlan`：先 `setup`，再 `forkScoped(run)`；
   - 若是单阶段旧写法：先 fork 执行；如果最终返回 `LogicPlan` 再补跑 setup/run（兼容形态的归一）。
3. `BoundApiRuntime` 在敏感 API（例如 `$.use`、`$.onAction*`、`$.onState*` 等）处检查当前 phase：
   - setup 段调用 run-only → 抛 `LogicPhaseError` → 转换为结构化诊断（devtools 可消费）。

### 关键不变量

- **setup 段禁止 IO**：只能做“同步注册”（reducer/lifecycle/debug hook 等），不应解析 Env/Service。
- **run 段才允许长期 Fiber**：访问 Env、订阅 action/state 流、跨模块协作。
- **Phase Guard 的价值**：把“看起来能跑但语义错”的用法，在开发期强制变成可诊断错误。

---

## 3. 写入主链路：dispatch → txnQueue → reducer/trait → commit

### 入口（按阅读顺序）

- SSoT（事务窗口/约束）：`.codex/skills/project-guide/references/runtime-logix/logix-core/runtime/05-runtime-implementation.md`
- ModuleRuntime（队列/事务驱动）：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`
- 事务内核：`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- Trait 收敛：`packages/logix-core/src/internal/state-trait/converge.ts`
- Trait 入口（安装/接线）：`packages/logix-core/src/internal/state-trait/install.ts`

### 链路概览

1. `dispatch(action)` 进入 ModuleRuntime（通常会入队到 per-instance 的 txnQueue/worker）。
2. worker 在“事务窗口”内开启 `StateTransaction`：
   - begin：获取当前 state 快照作为 base；
   - reducer/trait 写入通过 `updateDraft/recordPatch` 只影响 draft；
   - converge：根据 dirtyPaths（light/full 都维护）执行 computed/link 等派生；
   - commit：**单次** `SubscriptionRef.set(final)`，保证对外原子可见。
3. commit 后按需发出 Debug 事件（state:update 等）。

### 关键不变量

- **事务窗口禁止 IO**：任何异步/外部调用必须在 run 段单独 Fiber 完成，再通过 `dispatch/update/mutate` 回写。
- **单次提交**：一次事务对外最多一次 `SubscriptionRef.set`，避免 UI tearing。
- **dirtyPaths 始终维护**：即使 instrumentation=light 也要保留 dirty-set，用于低成本调度 trait。

---

## 4. StateTrait 收敛：dirty-set → 计划/拓扑 → 预算与降级

### 入口（按阅读顺序）

- DSL/Program：`packages/logix-core/src/StateTrait.ts`
- build & 约束（Single Writer / deps 等）：`packages/logix-core/src/internal/state-trait/build.ts`
- reverse closure & graph：`packages/logix-core/src/internal/state-trait/reverse-closure.ts`
- converge：`packages/logix-core/src/internal/state-trait/converge.ts`

### 关键不变量

- **Single Writer**：同一路径只能有一个 writer（避免非确定性竞争）。
- **显式 deps 作为事实源**：诊断与增量调度都依赖 deps，避免“暗依赖”。
- **预算/降级是产品能力**：超预算或 runtime 错误时必须可解释（summary/steps/top3），且不能留下半成品状态。

---

## 5. 跨模块协作：imports(strict) / Root.resolve / Link.make

### 入口（按阅读顺序）

- SSoT（strict/root/link 语义）：`.codex/skills/project-guide/references/runtime-logix/logix-core/api/02-module-and-logic-api.md`
- Bound API 侧 resolve：`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`
- Root：`packages/logix-core/src/Root.ts`、`packages/logix-core/src/internal/runtime/core/RootContext.ts`
- Link：`packages/logix-core/src/Link.ts`

### 关键不变量

- **strict 默认**：`$.use(ChildModule)` 只允许解析当前模块 impl 的 imports 范围内的子模块，避免“全局乱 resolve”。
- **root/global 显式**：跨树单例必须通过 `Root.resolve(Tag)`（语义清晰、可诊断、可 mock）。
- **Link 是协作关系的 IR**：不要通过 Tag 猜实例/隐式耦合。

---

## 6. Reducer 注册与诊断：primary reducers / applyPrimaryReducer

### 入口（按阅读顺序）

- reducers 生成：`packages/logix-core/src/internal/runtime/ModuleFactory.ts`
- reducers 应用与诊断：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`、`packages/logix-core/src/internal/runtime/core/ReducerDiagnostics.ts`

### 关键不变量

- **注册期 vs 执行期**：reducer 注册应发生在 setup 段；执行发生在事务窗口内。
- **诊断可序列化**：reducer/logic/lifecycle 相关错误应以结构化事件对外，不依赖字符串解析。

---

## 7. Lifecycle & Scope：onInit/onDestroy/onError 与资源释放

### 入口（按阅读顺序）

- lifecycle 内核：`packages/logix-core/src/internal/runtime/core/Lifecycle.ts`
- lifecycle 绑定与诊断：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`、`packages/logix-core/src/internal/runtime/core/LifecycleDiagnostics.ts`

### 关键不变量

- **生命周期绑定 Scope**：资源（fiber/queue/subscription）应随 Scope close 自动释放，避免悬挂。
- **destroy 顺序可解释**：需要明确 FIFO/LIFO 与最终一致性策略（否则 devtools/测试难写）。

---

## 8. Debug/Devtools：DebugSink → ring buffer → time travel

### 入口（按阅读顺序）

- SSoT（事件类型/口径）：`.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md`
- 公共 Debug API：`packages/logix-core/src/Debug.ts`
- DebugSink 内核：`packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- DevtoolsHub（聚合/订阅）：`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
- 时间旅行入口：`packages/logix-core/src/Runtime.ts`（`applyTransactionSnapshot`）
- 时间旅行实现：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`（`__applyTransactionSnapshot`）

### 关键不变量

- **dev-only 冷路径**：事务历史与 time-travel 必须在 prod 保持冷（先 `isDevEnv()` 守卫）。
- **time travel 也是一笔事务**：回放应以 `origin.kind = "devtools"` 记账，保证可追踪与可解释。

---

## 9. React 订阅链路：SubscriptionRef.changes → useSelector/useModule

### 入口（按阅读顺序）

- SSoT（React 集成）：`.codex/skills/project-guide/references/runtime-logix/logix-react/01-react-integration.md`
- hooks：`packages/logix-react/src/hooks/useModule.ts`、`packages/logix-react/src/hooks/useSelector.ts`
- external store：`packages/logix-react/src/internal/ModuleRuntimeExternalStore.ts`
- runtime provider：`packages/logix-react/src/components/RuntimeProvider.tsx`

### 关键不变量

- **订阅来自 runtime.changes**：React 层只读订阅，不应直接写 SubscriptionRef。
- **runFork/runSync 的边界清晰**：React 侧只负责把 Effect 驱动起来，业务错误语义应回到 Debug/diagnostics。

---

## 10. 还有哪些“长链路”值得继续提炼？

下面这些链路当前也很关键，适合后续按同样格式补齐（入口/不变量/深挖）：

1. **EffectOp middleware 全链路**：`packages/logix-core/src/EffectOp.ts` → `packages/logix-core/src/internal/runtime/EffectOpCore.ts` → Debug/Devtools 的 trace:effectop。
2. **Replay/Recording**：`packages/logix-core/src/internal/runtime/core/ReplayLog.ts` 与任何导出/导入证据包（如果要做 Sandbox replay，需要把因果/ID/窗口语义补齐）。
3. **TestRuntime/Trace 组装**：`packages/logix-test/src/runtime/TestRuntime.ts` 如何把 actions$/changes 与 DebugSink 融合成可断言 Trace。
4. **Sandbox/Alignment Lab 证据链**：`packages/logix-sandbox` 内 “录制 → 聚合 → 导出/导入 → 回放” 的数据结构与边界（目前如果没有稳定协议，建议先沉淀最小可序列化证据包结构）。
