---
title: Parser / Rewriter 教程 · Platform-Grade 子集与正确性路线图（从 0 到 1）
status: draft
version: 1
---

# Parser / Rewriter 教程 · Platform-Grade 子集与正确性路线图（从 0 到 1）

> **定位**：本文回答一个“平台工程必问”的问题：我们如何从“可解析”走到“可保守重写（write-back）”，并且可解释、可门禁、可回滚？  
> 结论先说：**不追求解析任意 TS**，而是把平台能力限定在 Platform-Grade 子集内；子集外统一 Raw Mode（显式 reason codes），宁可漏不乱补。  
> **裁决来源**：平台侧边界与锚点系统以 `docs/ssot/platform/ir/00-codegen-and-parser.md` 为准；工程化路线以 `specs/081-*`（Parser/AnchorIndex）→ `specs/079-*`（Autofill contracts）→ `specs/082-*`（WriteBack）为主线。

## 0. 最短阅读路径（10 分钟上手）

1. 读 `docs/ssot/platform/ir/00-codegen-and-parser.md` 的 0/2/3：理解 Platform-Grade vs Runtime-Grade 与降级策略。  
2. 读 `specs/081-platform-grade-parser-mvp/spec.md`：理解 Parser MVP 的“受限语法形态清单”。  
3. 读 `specs/079-platform-anchor-autofill/contracts/reason-codes.md`：理解“显式不确定性”的 reason codes 体系。  
4. 读 `docs/ssot/handbook/tutorials/35-anchors-stepkey-and-rewriter-safety.md`：理解 stepKey 为何决定回写安全性。

## 1. 心智模型（正确性到底指什么）

### 1.1 三种正确性：识别正确 / 改写正确 / 解释正确

平台 Parser/Rewriter 的正确性不是“编译能过”，而是三类正确性同时成立：

1. **识别正确（Parser）**：子集内要高置信度识别锚点；子集外必须显式 Raw Mode。  
2. **改写正确（Rewriter）**：只做最小补丁、保持结构、禁止语义猜测；失败必须拒绝写回。  
3. **解释正确（Diagnostics）**：任何降级/跳过/拒绝都必须给出可枚举原因码与可定位证据（file/span）。

### 1.2 为什么我们拒绝“全量 TS AST 解析 + 任意重写”

因为平台能力一旦进入“猜测式重写”，代价是系统性漂移：

- 你会得到一份“看起来对但不可证明”的 IR；  
- 你会把不确定性隐蔽地写回源码（silent corruption）；  
- 你会在 diff/回放/证据链里出现不可解释的漂移点。

所以主线裁决是：**Parsability as a Feature** —— 只有进入平台子集的写法才享受全双工能力。

## 2. 核心链路（从 0 到 1：AnchorIndex → PatchPlan → WriteBack）

### 2.1 Parser（081）：输出 AnchorIndex，而不是输出“语义求值结果”

081 的目标非常克制：只产出可序列化、确定性的 `AnchorIndex@v1`：

- `entries[]`：子集内的高置信度定义点/使用点/缺口点（ModuleDef/LogicDef/ServiceUse/WorkflowDef/AutofillTarget…）  
- `rawMode[]`：子集外/不确定项的显式记录（reason codes）  
- `summary`：规模摘要（默认不含耗时，以保持字节级确定性）

权威数据模型：`specs/081-platform-grade-parser-mvp/data-model.md`

关键裁决：

- 不执行用户代码（解析期无副作用）。  
- 宁可漏不乱补：动态/中转/spread/条件拼装统一 Raw Mode。  
- 依赖使用点只识别 `$.use(Tag)`（不把 `yield* Tag` 当作依赖使用点）。

### 2.2 Contracts（079）：把“可补全字段”做成可审阅的合同

Autofill 不应隐藏在实现里，而应先固化为 contract（inputs/outputs/reason-codes）。

以 stepKey 为例：

- `specs/079-platform-anchor-autofill/contracts/workflow-stepkey-autofill.md` 定义：
  - 适用范围（Platform-Grade WorkflowDef）  
  - 候选 key 生成规则（确定性）  
  - 冲突消解规则（幂等）  
  - 必须拒绝写回的冲突态（duplicate_step_key）

reason codes（关键治理面）：

- `specs/079-platform-anchor-autofill/contracts/reason-codes.md`

> 原则：不确定性必须显式化；codes 的新增/改名属于 breaking（forward-only，写迁移说明）。

### 2.3 Rewriter（082）：生成 PatchPlan 并只写回缺失字段

在正确性路线里，Rewriter 的职责不应该是“把代码改成我想要的样子”，而是：

- 消费 AnchorIndex 的“插入点定位”；  
- 消费 Autofill contract 的“确定性候选”；  
- 生成最小补丁（PatchPlan）；  
- 写回源码，并保证：
  - 不触碰子集外逻辑  
  - 不引入格式化大改  
  - 不改变作者显式声明的字段（already_declared 必须跳过）

081 的 plan 已给出结构落点（未来包）：`packages/logix-anchor-engine/*`（Node-only）。

## 3. 剧本集（用例驱动：为什么会失败、失败时该输出什么）

### 3.1 剧本 A：子集外形态（spread / 变量中转 / 条件拼装）——为什么必须 Raw Mode

例子（抽象）：

- `const def = {...}; Module.make(id, def)`  
- `Module.make('X', { ...base, services: {...} })`  
- `steps: cond ? a : b`

这些形态的问题不是“技术上 parse 不出来”，而是：

- **无法证明插入点稳定**（回写会误伤）  
- **无法证明语义不变**（改写变成猜测）  

正确行为：

- Parser 产出 Raw Mode entry，并给 reason codes：`unsupported_shape` / `unsafe_to_patch`。  
- Rewriter 看到 Raw Mode：直接拒绝写回并输出“迁移建议”（迁移到对象字面量子集）。

### 3.2 剧本 B：缺失 stepKey（子集内）——为什么补全必须是确定性、幂等、最小 diff

正确行为（079）：

- 候选 key 只依赖可解析字段（actionTag/serviceId/ms），不依赖文件行号/时间。  
- 冲突消解只用稳定序号（按稳定遍历顺序）。  
- 补丁只插入 `key` 字段，不动其它结构。

你要输出的证据：

- file/span 定位（插入点）  
- 生成的 key（含冲突后缀）  
- 若跳过/拒绝：reason codes（例如 `unresolvable_step_key`）

### 3.3 剧本 C：重复 stepKey（冲突态）——为什么必须拒绝写回而不是“帮你改掉一个”

重复 stepKey 是不可安全自动修复的冲突态：

- 工具无法知道哪一个应该保留原 key；  
- 自动改名会改变作者意图（语义猜测）；  
- 写回错误会造成更隐蔽的漂移（比“不回写”更危险）。

所以 contract 明确：`duplicate_step_key` → **拒绝写回，只报告定位与修复建议**。

### 3.4 剧本 D：三方对齐（source / canonical / generated）——如何避免“第二份真相源”

当平台引入 Canonical AST 与 codegen 时，最危险的是出现“并行真相源”：

- 源码里一份；  
- Canonical AST 里一份；  
- 生成代码里一份。

正确路线（SSoT 裁决）：

- Canonical AST 是唯一规范形；  
- 写回只改“源码中的权威字段”（例如 stepKey），让源码与 Canonical 对齐；  
- 生成代码只消费规范形（不反向成为权威）。

换句话说：Rewriter 的目标不是“让生成代码可运行”，而是“让权威输入字段稳定并可回写”。

## 4. 代码锚点（Code / Spec Anchors）

1. `docs/ssot/platform/ir/00-codegen-and-parser.md`：Platform-Grade 子集、白盒/黑盒降级策略、锚点系统。  
2. `specs/081-platform-grade-parser-mvp/spec.md`：Parser MVP 的受限形态枚举与 Raw Mode 策略。  
3. `specs/081-platform-grade-parser-mvp/data-model.md`：AnchorIndex@v1 的概念数据模型。  
4. `specs/079-platform-anchor-autofill/contracts/reason-codes.md`：reason codes 的可解释枚举。  
5. `specs/079-platform-anchor-autofill/contracts/workflow-stepkey-autofill.md`：stepKey autofill contract。  
6. `docs/ssot/platform/contracts/03-control-surface-manifest.md`：Root IR 的治理边界（governed vs opaque、身份去随机化）。  

## 5. 验证方式（Evidence）

当 081/082 工具链落地后，建议把正确性验收固化为三类测试：

1. **确定性测试**：同输入 → AnchorIndex/PatchPlan 字节级一致（无时间/随机）。  
2. **降级覆盖**：对子集外形态必须进入 Raw Mode，并输出稳定 reason codes（宁可漏）。  
3. **最小补丁**：写回补丁只包含 contract 指定的字段插入（例如 stepKey），不产生大范围格式变化。  

## 6. 常见坑（Anti-patterns）

- 把 Parser 当“语义执行器”：尝试做跨文件求值/执行 import 初始化。  
- 把 Rewriter 当“代码格式化器”：为了“好看”大改结构，导致 diff 爆炸与锚点漂移。  
- 在不确定场景“尽力写回”：把不确定性变成 silent corruption。  
- reason codes 不稳定/不可枚举：平台无法做门禁与迁移，最终只能靠人工猜。  
