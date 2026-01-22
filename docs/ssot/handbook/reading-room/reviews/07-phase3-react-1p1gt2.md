# Phase 3：React 1+1>2（极致方案）

本章目标：让 Logix 在“逻辑编排层”获得 React 在“渲染层”同等级别的自动性能消化能力，并且在 React 并发/StrictMode/多实例场景下依然保持 **确定性、可诊断、可回放**。

---

## 0. 现状回顾（为了定位 1+1>2 的“差一刀”）

当前实现已经具备 1+1>2 的关键骨架：

- core：单实例 `txnQueue` + `StateTransaction.commit` 的 0/1 commit（每次事务最多一次 `SubscriptionRef.set`）。
- react：`useSyncExternalStoreWithSelector` + `queueMicrotask` 合并通知（`ModuleRuntimeExternalStore.ts`）。
- devtools：`trace:react-render` / `trace:react-selector` + `lastTxnIdByRuntime` 兜底对齐（`DebugSink.ts`）。

但仍缺少“极致”的三件事：

1. **通知粒度**：现在是“每次 commit 通知所有订阅者，让每个 hook 自己算 selector”，复杂度≈O(订阅数)。
2. **因果协议**：txnId→render 仍有推断/兜底，不是强协议；稳定标识仍被随机数污染。
3. **性能与正确性的统一边界**：可写 `ref` 逃逸、`update` 可跑 Effect、`path="*"` 让 dirty-set 失真，使增量策略难以成立。

---

## 1. 终态契约：React 与 Logix 的强边界协议

### 1.1 运行时必须提供的 Commit Meta（强制）

每次事务提交都必须产生一条 **Commit Meta**（无论是否启用 Devtools）：

- `instanceId`：稳定实例标识（由 React key/业务 session id 注入，禁止随机数默认）
- `txnSeq`：单调递增序号（同一 instance 内唯一且可排序）
- `txnId`：派生 id（建议 `${instanceId}::${txnSeq}`）
- `origin`：`{ kind, name, details }`
- `dirtyRoots`：最小触发集合（禁止 `*`；若确实未知，显式标记 `dirtyAll=true`，不要用字符串 `*` 混淆）
- `patchSummary`：至少 `patchCount`；full 模式下提供 patches（用于 Devtools 与冲突检测）
- `policy.reactPriority`（可选但推荐）：由 runtime 根据 origin 自动推导（例如 action=sync，service-callback=transition）

### 1.2 React 侧的唯一订阅入口：订阅 Commit，而不是订阅 State

React adapter 必须基于 commit meta 驱动：

- **每次 commit**：只根据 `dirtyRoots` 选择性重算 selector；
- **只通知受影响 selector 的订阅者**：组件订阅的是 selector（或 field），不是整棵 state。

### 1.3 强因果链：txn → selector → render

每次 React 侧的“可观察变化”都必须能挂到同一条链路上：

- selector 重算：`txnId + selectorId + deps + durationMs + changed`
- render commit：`txnId(or txnWindow) + componentId + usedSelectorIds + durationMs`

严禁使用“最近一次 txnId 推断”作为主要机制（兜底可以保留，但必须被强协议替代）。

---

## 2. 极致实现：SelectorGraph（核心关键）

### 2.1 Selector 变成第一公民（可编译、可缓存、可诊断）

引入 `SelectorSpec`（概念层）：

- `selectorId`（稳定，可序列化）
- `deps`（字段路径集合，必须显式）
- `select(state)`（纯函数）
- `equals(prev, next)`（可选）
- `meta`（可诊断：label、owner、tags）

#### `selectorId` 从哪来（建议的唯一答案）

`selectorId` 必须是 **稳定、可序列化、可比较** 的字符串（不能用函数引用/随机数），并且在同一 `moduleId` 下唯一；全局唯一性由 `(moduleId, selectorId)` 组合保证。

推荐来源只有三类：

1. **Field Selector（最常见）**：由路径自动派生
   - `useField(ref, "a.b.c")` ⇒ `selectorId = "field:a.b.c"`，`deps = ["a.b.c"]`
2. **命名 Selector（可复用/可共享缓存）**：由代码/生成器显式声明
   - 例如 `Selector.make("search.results", { deps, select, equals })`，其中 `"search.results"` 就是 `selectorId`
   - 平台/IR 模式下直接使用 IR 节点 id（稳定 nodeId）作为 `selectorId`（这样 Code↔IR↔Trace 可对齐）
3. **历史兼容路径（不推荐，极致方案中应删除）**：从 `selector.debugKey` / `function.name` 退化推断
   - 仅用于过渡期诊断展示；不应作为引擎缓存/依赖索引的 key（因为不稳定且不可合并）

原则：

- **业务默认只写 selectorId + deps + select**；工具链/LLM 可生成 deps；
- dev 模式用 deps-trace 校验“实际读取 vs 声明 deps”（类似 trait computed 的 deps-trace），不一致直接 diagnostic（可升级为硬失败）。

### 2.2 SelectorGraph：依赖索引 + 共享缓存 + 精准通知

每个 `ModuleRuntime instance` 维护一个 `SelectorGraph`：

- `selectorCache: Map<selectorId, { value, computedAtTxnSeq, deps, equals, cost }>`
- `subscribers: Map<selectorId, Set<listener>>`
- `depIndex`：把 deps 路径编译成可快速 overlap 判断的数据结构（建议前缀 trie；最简也可用 root-normalize + Map）

commit 时的流程（伪流程）：

1. 取 `dirtyRoots`（已规范化）；
2. 用 `depIndex` 找出可能受影响的 selector 集合；
3. 对每个 selector：
   - 若 deps 与 dirtyRoots 无 overlap → 直接跳过（零计算）
   - 否则最多计算一次 `select(nextState)`，与缓存比较；未变化则不通知
4. 对变化的 selector：批量通知其订阅者（microtask 合并）；
5. 同时记录诊断事件（可采样）：topN selector cost、invalidatedCount 等。

这会把复杂度从 “O(组件订阅数)” 下沉为：

- O(受影响 selector 数量 + 受影响订阅者数量)
- 并且同一个 selector 被多个组件使用时只计算一次（共享缓存）

### 2.3 React 优先级（把“自动性能消化”做到像 React）

基于 commit meta 自动决定通知优先级：

- `origin.kind === "action"`：同步通知（用户输入/交互必须即时）
- `origin.kind === "service-callback" | "task:*" | "trait-source"`：默认 transition 通知（降低主线程阻塞）

实现方式（React 侧）：

- `subscribe(listener)` 内部根据 commit 的 `reactPriority` 决定调用方式：
  - sync：直接 `listener()`
  - transition：`startTransition(() => listener())`

这会让 “后台 IO 写回” 的 UI 更新自动进入低优先级车道，减少输入卡顿（1+1>2 的关键增益点之一）。

---

## 3. 必须同步落地的 core 不兼容改造（否则 React 极致方案无法成立）

### 3.1 Patch/dirty-set 必须可信（消灭 `path="*"`）

React 的 SelectorGraph 依赖 `dirtyRoots` 的信息质量，否则只能退化为全量通知。

必须做到：

- reducer / state.mutate / trait/source 写回：都能生成字段级 patch 或至少字段级 dirtyRoots；
- `dirtyAll=true` 只能作为真正“未知写入”的显式降级，不允许长期常态化。

### 3.2 禁止写入逃逸：业务层不可写 `SubscriptionRef`

业务可写 ref 会绕过事务闭包，破坏 txn→render 对齐与增量优化。

结论：业务层的 `state.ref()` 只能返回只读（get+changes），写入只能通过事务入口（reducer/trait/task/writeback）。

### 3.3 事务窗口必须同步：禁止在 update/mutate 路径跑 Effect

任何跨 IO 的逻辑必须通过 task（pending→IO→writeback）拆分成多事务；否则事务不再是“可合并的批处理边界”。

---

## 4. React API 的终态形态（建议）

为了让团队协作与 AI 生成稳定收敛，React 侧建议只保留以下“白盒 API”：

1. `useModule(Impl, { key, label? })`：返回 `ModuleRef`（稳定 instanceId 来自 key）
2. `useSelector(ref, selectorSpec)`：订阅 selector（强制 deps）
3. `useField(ref, "a.b.c")`：field selector 的语法糖（自动 deps=该 path）
4. `useDispatch(ref)`：动作派发（可选）

并明确降级策略：

- 允许 `useSelector(ref, (s)=>...)` 但在 dev 直接 diagnostic/error（因为无法做依赖收敛），生产可降级为 `deps=['*']`（但不建议）。

---

## 5. Devtools：把 1+1>2 的收益做成可量化闭环

必须能在 Devtools 中直接回答：

- “某次 txn 为何触发了 N 次渲染？”（txn→dirtyRoots→selectorIds→componentIds）
- “哪些 selector 最耗时/最频繁 invalidated？”（topN selector cost）
- “背景 IO 写回是否走 transition lane？”（reactPriority）

建议新增（或完善）事件维度：

- `trace:react-selector-eval`（采样）：selectorId、deps、durationMs、changed、txnId
- `trace:react-render`：componentId、usedSelectorIds、durationMs、txnId/txnWindow

注意：这些事件必须是 Slim 数据结构，禁止携带闭包/Effect 本体。

---

## 6. 渐进落地顺序（建议）

不考虑向后兼容时，最短收敛路径如下：

1. core：稳定 instanceId/txnSeq（去随机化）+ commit meta 暴露
2. core：patch/dirtyRoots 一等公民（消灭 `*`）+ 禁止可写 ref + 禁止事务内 IO
3. react：实现 SelectorGraph（先用简单 depIndex，后续再上 trie）
4. react：优先级车道（sync vs transition）
5. devtools：txn→selector→render 强链路视图 + topN cost

完成后，React 与 Logix 的组合将具备真正的 1+1>2：**引擎层保证增量与因果，React 层只负责渲染与并发调度**。
