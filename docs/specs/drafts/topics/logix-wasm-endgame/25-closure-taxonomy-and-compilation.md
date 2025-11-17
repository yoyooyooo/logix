---
title: "25. Closure Taxonomy & Compilation (A+B Strategy)"
status: draft
version: 2025-12-30
value: vision
priority: next
---

# 25. 动态闭包税与编译化路线（B 极致 + A 走远）

本篇把一条结论写死：**WASM 友好姿势 = 把 B 做到极致，同时尽量把 A 走远**。

- **B（极致）**：WASM 只做纯数值 Planner（传播/调度/plan），JS 本地 tight loop 执行闭包；跨边界必须是常数级（理想“一笔 txnCommit 一次调用”），传输只允许整型/TypedArray/线性内存视图。
- **A（走远）**：把一部分“热闭包”编译成统一 IR/bytecode；入口允许两种形态合流为同一产物：`AST 自动识别（保守正确）` → 不行再用 `Builder/DSL 兜底`；支持 `compile: try|must`（try 可回退，must 失败即报错）。

> 目标不是“全都 WASM 化”，而是：**用编译期 + 运行时的组合拳，让 WASM 只收纳稳赚的部分，并且可证据化地证明“没有负优化”。**

## 1) 动态闭包到底卡在哪些环节？

动态闭包（JS/TS 的函数值 + 捕获外部变量）在 Logix 全链路里主要出现在以下环节；它们也是 WASM “容易没戏/负优化” 的根源，因为闭包既难静态化也会引入高频跨边界调用。

### 1.1 事务热路径（最危险，决定 WASM 成败）

- `Reducer.mutate(...)` / reducer 函数：本质是“任意 JS 写 state”的闭包。
- `StateTrait.computed({ deps, get })` 的 `get`：每个 step 的计算闭包（图越大调用越多）。
- 校验/派生类 trait（`validate/check/derive`）：通常也是闭包，且可能在 `txnCommit` 内多次触发。
- “动态构造 path/selector”的逻辑常嵌在闭包里（例如 `v${i}`、join/split、自由文本 reason），会把桥接税拉满。

### 1.2 事务外（可保留 JS，但要隔离到边界）

- 业务 Logic/Flow（Effect 程序）、Service Tag 实现（IO/异步/外部依赖）：天然是闭包，且 **不应该进 txn window**。
- React 渲染相关 selector（如 `useSelector(selectorFn)`）：与宿主绑定，通常不适合 WASM。
- 中间件/Observer/Debug 过滤器：也是闭包，但必须通过 `diagnostics=off` 闸门做到近零成本（否则 off 也背税）。

> 结论：真正“必须对付”的闭包，几乎都集中在 **txn 内 per-step 执行** 的位置（computed/reducer/validate）。

## 2) 闭包三分类：C0/C1/C2（这是总开关）

为了让“智能调节只让 WASM 收纳能吃到红利的部分”可工程化，需要先把闭包按可处理性分三类。

### C0：可编译闭包（A 的目标）

特征：纯表达式、无副作用、只读写已知字段、无动态 key、无不受控函数调用。

- 编译产物：统一 IR/bytecode（可先跑在 JS interpreter，后续搬进 WASM VM）。
- 对性能/可诊断性：最友好（trace 可对齐到 stepId/pathId/opSeq）。

### C1：可批处理闭包（B 的目标）

特征：闭包本身很动态/复杂，但我们能在编译/装配期拿到至少一部分“静态事实”，例如：

- read-set（依赖字段集合）可枚举，或至少可证据化；
- write-set（会写哪些 FieldPathId）可枚举，或至少可证据化；
- 执行时不需要 per-step 向 Kernel 询问“下一步做什么”（否则会拉高跨边界次数）。

策略：不必编译闭包，但必须做到：

- Kernel 只给 plan（整型），JS 本地 tight loop 执行闭包；
- 跨边界次数保持常数（理想 1 次/txnCommit）。

### C2：不可分析闭包（WASM 的敌人）

特征：依赖不明、写入集合不明、动态 key/反射/大量自由函数调用，或任何会迫使内核在执行期间“回头问”的形态。

策略：必须显式降级（例如 `dirtyAll=true`），并且在 P1 Gate 覆盖场景应视为 **FAIL**（否则你永远无法保证“只让 WASM 吃红利部分”）。

> “智能调节”的本质：只在 C0/C1 的区域启用 wasm-backend；C2 不是智能，而是必须被关进笼子里（显式降级 + 明确门禁）。

## 3) 把 B 做到极致：Planner/Executor 常数跨边界

### 3.1 固定两段式管线（推荐形态）

- **Planner（WASM 或 JS）**：输入 `dirtyRoots: FieldPathId[]` + Static IR tables（graph/topo/indices），输出 `plan: StepId[]`（或 bitset）。
- **Executor（JS）**：拿到 plan 后，在 JS 本地按 topo/plan 批量执行闭包（computed/reducer/validate），并把写入“按整型记录”为：
  - 下一轮 dirtyRoots（FieldPathId[]，id-first）；
  - 可选的 `patch buffer`（`pathId/op/...`，用于 trace/调试/证据，而不是为了让 Planner 读取业务值）。

关键要求：

- 执行闭包期间 **不再跨边界**；否则会被 per-step 回调风暴击穿。
- Planner 的输出必须足够“闭包执行不需要回头问内核”；这要求依赖图/反向索引/拓扑序在编译/装配期就稳定。

### 3.2 “一次 txn 一次调用”怎么成立？

只要满足：

- 依赖图是静态的（编译/装配期建好）；
- 运行时输入只有 `dirtyRoots`（整型）；

Planner 就能一次性算出“dirtyRoots 的传递闭包”，给出完整 plan；Executor 不需要“边执行边回头问 Planner”。

反过来：允许动态依赖/动态 watcher，就会逼出多次跨边界——这正是我们要通过 050/051/052 等硬门槛消灭的形态。

### 3.3 Lane 分层（为 L2/L3 预留）

即使在 L1（Planner only）阶段，也建议在 Static IR 里为 step 标注 lane：

- `wasm-lane`：C0 可编译或纯内核步骤（未来可进 WASM VM）。
- `host-lane`：C1/C2 仍需 JS 闭包执行（必须被批处理、不得交错导致多次跨边界）。

这样 plan 可以天然分段，为后续 L2/L3 扩展“更少回调、更少边界税”预留形态。

## 4) 把 A 尽量走远：AST 自动 lift + Builder 兜底合流

“Builder SDK vs AST 解析”不是二选一：正确姿势是把它们做成同一条编译管线的两种入口，并且产出同一 IR/bytecode（避免并行真相源）。

### 4.1 AST 自动 lift（默认路径，尽量不增加心智）

编译期做两类工作（必须“保守正确”，宁可不优化也不误优化）：

1) **读写集合提取（对 B 是巨大利好）**

- 对 computed：推导 read-set（deps）与 write-target（stepOut）。
- 对 reducer/trait：推导 write-set（哪些 FieldPathId 会被写）。

2) **可编译子集识别（对 A 是前进一大步）**

只在能证明安全时才 lift：例如纯表达式、无函数调用（或仅白名单纯函数）、无动态 property、无外部可变捕获。

识别成功：产出 bytecode；识别失败：降级到 C1（仍可批处理、仍能跑 B）。

### 4.2 Builder/DSL（热点/确定性优先的可选路径）

Builder 的价值是把表达式/写入意图显式化，让编译器 **100% 可判定**：

- 适合极少数 perf-critical 模块（由工具/LLM 生成更合适）；
- 必须与 AST lift 产物合流为同一 IR/bytecode，禁止形成第二套语义与协议。

### 4.3 `compile: try | must`（避免“悄悄退化”）

不要让用户“猜我能不能编译”：

- `try`：尽力而为，失败回退到 C1；
- `must`：失败就编译报错（用于热点模块，避免悄悄退化成 C2/C1）。

## 5) 运行时“智能调节”：证据驱动 + 廉价特征 + 迟滞

为了“没有负优化”，运行时的 auto 必须极简且可解释：

- 提供 `kernelBackend=force-js | force-wasm | auto`；
- `auto` 只在离线证据证明“稳赢”的白名单条件下启用 wasm，否则回退 JS；
- 特征必须便宜：`stepsCount`、`dirtyRootsCount`、`dirtyRootsRatio`、`bitsetWords`、`planLen`；
- 加 hysteresis（例如连赢/连输 N 次才切换），避免阈值附近抖动；
- 证据门禁只对 `force-js/force-wasm` 做可比 diff；`auto` 的阈值表来自离线 perf matrix（不是在线学习）。

## 6) 对号入座：与 045/046/049/050/051/052 的关系

- `specs/045-dual-kernel-contract/spec.md`：提供可注入/可对照/可回退的 Kernel Contract（JS/WASM 只是不同实现）。
- `specs/046-core-ng-roadmap/spec.md`：把“L0→L5”路线作为可交付里程碑与硬门槛串起来（证据优先）。
- `specs/049-core-ng-linear-exec-vm/spec.md`：Exec Plan/Exec VM 的 typed buffers + linear plan 是 “可搬到 WASM” 的形态前置。
- `specs/050-core-ng-integer-bridge/spec.md`：稳定 id + 禁止字符串往返，为线性内存传输与 Static IR registry 铺路。
- `specs/051-core-ng-txn-zero-alloc/spec.md`：`instrumentation=light` 下调用点零对象分配、txn 内 id-first dirty roots，为任何后端（JS/WASM）提供公平基线。
- `specs/052-core-ng-diagnostics-off-gate/spec.md`：`diagnostics=off` 近零成本是 WASM 的必要条件（否则 off 也背边界税/诊断税）。

## 7) 下一步需要在草案里继续钉死的问题

- **C2 的判定与隔离**：哪些动态形态必须显式降级？降级如何进入 Gate（P1 中 dirtyAll 是否直接 FAIL）？
- **patch buffer 的最小语义**：只记录 `pathId/op` 是否足够支撑 trace/解释？哪些值绝不能在 txn 内跨边界？
- **动态集合（list/rowId）的图谱表示**：如何避免 runtime 建图？哪些能力必须要求编译期可判定？
- **A 的“最小可编译子集”**：从 computed 纯表达式开始，哪些白名单函数/操作是可接受的？
