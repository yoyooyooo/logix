---
title: "26. AST Lift & DSL Subset (C0 Compilation)"
status: draft
version: 2025-12-30
value: vision
priority: next
---

# 26. 用 AST/DSL 打穿 C0：可证明的可编译子集

本篇目标：把 “A（走远）” 从口号落到 **可实现的最小闭环**——定义一套 **可证明正确** 的可编译子集（C0），并给出两条入口（AST 自动 lift + Builder/DSL 兜底）与统一产物（bytecode/IR）。

> 本篇只谈 C0（可编译闭包）。C1/C2 的批处理/降级策略见 `25-closure-taxonomy-and-compilation.md`。

## 1) 为什么从 computed 开始（而不是 reducer）

在 Logix 现有语义里，computed 已天然“更接近可编译形态”：

- computed 的依赖事实源是显式 `deps`（Graph/反向闭包/增量调度只认 deps）。
- computed 的 `get` 采用 **deps-as-args**：`get(...depsValues)`，这意味着 **编译器不必追踪 state 对象的任意读取**，只需处理参数值的纯计算。

因此 C0 的第一落点应当是：**compiled-computed**（表达式 IR/bytecode），并且先跑在 JS interpreter（L3 的早期形态），再迁移到 WASM VM。

## 2) C0 的硬约束（可证明边界）

要做到“可证明正确”，C0 必须是一个强约束子集。建议最小集合如下（不满足即降级 C1/C2）：

### 2.1 纯函数约束（Purity）

- 禁止任何副作用：写外部变量、写参数对象、抛异常作为控制流、访问全局可变单例等。
- 禁止 IO/await/Promise（事务窗口禁 IO 的前置）。
- 禁止依赖时间/随机数（除非通过显式注入的纯常量，且被静态化进 IR）。

### 2.2 语法约束（Syntax）

仅接受最小可判定形态（推荐从最保守版本开始）：

- 只接受 `({ deps, get })` 中的 `get` 为 **箭头函数** 或 `function` 表达式；
- 初期只接受 **表达式体**：`() => expr`（不接受 block + 多语句）；
- 只接受参数为标识符（不接受解构、rest、默认值）；
- 禁止 `this` / `arguments` / `new` / `try` / `with` / `eval` / `for/while/switch` 等。

### 2.3 可搬到 WASM 的值域（Value Domain）

为了避免把“对象/字符串税”带入可编译通道，建议 C0 初期限定：

- 输入/输出只允许 `number | boolean | null | undefined`（可扩展，但每次扩展都必须补 Gate 证据与 ABI 规则）。
- 允许 `NaN/Infinity` 需显式定义（否则跨后端语义差异会变成雷）。

> 若 computed 的业务确实需要字符串/对象，仍可留在 C1（JS 批处理执行），但不得阻碍 B 的常数跨边界。

## 3) AST 自动 lift：保守正确的识别与降解

AST lift 的定位：**尽可能不增加用户心智**，但必须宁可不编译也不误编译。

### 3.1 识别目标（pattern）

以“最小、可判定”的 pattern 为主：

- `StateTrait.computed({ deps: [...], get: (a, b, ...) => <expr> })`
- 编译时只看 `get` 的 AST；其他形态（闭包捕获、函数引用、间接传递）一律降级。

### 3.2 捕获检测（Closure Capture）

`get` 体内出现的自由变量必须全部满足：

- 是内建常量（`true/false/null/undefined`）或字面量；
- 或是白名单纯函数（例如 `Math.*` 的某些成员）；
- 否则视为捕获外部动态环境：降级。

### 3.3 运算白名单（Opcodes）

初期只允许可直接映射为 opcode 的运算：

- 算术：`+ - * / %`（含一元 `+ -`）
- 比较/逻辑：`=== !== < <= > >= && || !`
- 条件：`cond ? a : b`
- 空值合并：`??`（需明确定义短路语义与值域）

所有允许项都必须能在 bytecode 与 WASM 中 **无分配** 执行。

## 4) Builder/DSL 兜底：让“must compile”可落地

Builder 的价值不是“另一套语义”，而是让编译器获得 100% 可判定的输入。

### 4.1 统一产物（No Parallel Truth）

AST lift 与 Builder 必须合流为同一产物：

- 同一套 opcode/bytecode
- 同一套类型/值域约束
- 同一套 trace 锚点（stepId/pathId/opSeq）

### 4.2 `compile: try | must`

- `try`：可编译就编译，否则回退到 C1（JS 批处理闭包）。
- `must`：不可编译直接构建失败（用于 perf-critical 模块，避免悄悄退化）。

## 5) 统一 IR/产物建议（面向 L3/L4）

建议把 “可编译逻辑” 作为 Static IR 的一部分：

- `stepLaneByStepId`：`wasm | host`
- `stepBytecodeOffsetByStepId` / `stepBytecodeLenByStepId`
- `bytecodeU32`：opcode stream（线性内存友好）
- `bytecodeConstPool`（可选）：常量池（初期可只支持数字常量）

同时产出一份 **Compile Report（构建期 artifact）**：

- 每个 step 的状态：`compiled | fallback` + reason（捕获、语法超集、值域不支持等）
- 用于 Devtools/CI Gate 的解释链路（避免“黑盒退化”）

## 6) 与 B 极致的耦合点（避免互相拖累）

- C0 的引入不应改变 B 的 Planner/Executor 管线：Planner 仍只输出 plan（StepId/bitset）。
- Executor 在 JS 内 tight loop 执行 plan：
  - 若 step 有 bytecode：走 interpreter（后续换 WASM VM）；
  - 否则走原始闭包。
- 全程不引入 per-step 的 JS↔WASM 往返；L3 也必须把跨边界压到常数级，否则仍会负优化。

## 7) 仍待回答的问题（但不应阻塞最小闭环）

- reducer 的 C0 子集如何定义（更像“patch program”而不是“任意 JS”）：从哪些最小可证据化写法开始？
- list/rowId 的值域与 opcode 如何设计，才能既可编译又不引入对象/字符串税？
