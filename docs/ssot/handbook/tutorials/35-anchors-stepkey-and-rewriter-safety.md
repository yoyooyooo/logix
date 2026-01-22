---
title: Anchors / stepKey 教程 · 稳定锚点协议与保守回写（从 0 到 1）
status: draft
version: 1
---

# Anchors / stepKey 教程 · 稳定锚点协议与保守回写（从 0 到 1）

> **定位**：本文聚焦一个“看起来很小但会决定全链路成败”的锚点：`stepKey`。  
> 它是 Workflow（Π）里最重要的稳定地址，直接决定：diff 是否可靠、诊断是否能回链、以及 Parser/Rewriter 是否能做“最小补丁回写”。  
> **裁决来源**：关于 stepKey/Canonical AST/Workflow Static IR 的 MUST 与术语，以 `docs/ssot/platform/**` 与 `specs/075-*` / `specs/079-*` 为准；本文负责把这些裁决串成“可执行剧本”。

## 0. 最短阅读路径（10 分钟上手）

1. 读 `docs/ssot/platform/foundation/glossary/04-platform-terms.md` 的 4.7（Canonical AST / Workflow Static IR / stepKey）。  
2. 读 `specs/075-workflow-codegen-ir/contracts/ir.md`：理解 “Canonical AST → Static IR” 映射里 stepKey 的地位。  
3. 读 `specs/079-platform-anchor-autofill/contracts/workflow-stepkey-autofill.md`：理解“缺失 stepKey 怎么保守补齐”。  
4. 最后读「3.1/3.2」两个剧本：缺失 vs 重复（补全 vs 拒绝写回）。

如果你还没建立平台 Parser/回写的整体心智模型：先读 `docs/ssot/handbook/tutorials/14-platform-parser-rewriter-anchors.md`。

## 1. 心智模型（stepKey 到底是什么，为什么它必须存在）

### 1.1 stepKey 是“语义敏感地址”，不是“数组下标”

Workflow（Π）的 steps 是一个“可重排、可重构”的序列。只要允许重排：

- **数组下标**必然漂移（重排就换地址）；  
- **随机/时间**必然漂移（每次生成都换地址）；  
- **按源码 span 派生**也会漂移（格式化/插入行导致 span 变化）。

所以，必须有一个 **显式且稳定** 的地址字段：`stepKey`。

它的语义是：

- 作为 Canonical AST 的必填字段：缺失即契约违规（fail-fast）。  
- 作为 Static IR 的 `source.stepKey`：用于 Devtools/回写/迁移“指向这一步”。  
- 作为 nodeId 的主要输入：`nodeId` 应由 `programId + stepKey (+ kind/extra)` 决定性派生（见 075/ControlSurfaceManifest）。

### 1.2 stepKey 与 nodeId 的分工：人可读 vs 机器稳定

强建议按 075 的分工理解：

- `stepKey`：**人写/人读**的稳定锚点（可读、可迁移、可门禁）。  
- `nodeId`：**机器用**的稳定 id（通常是 hash，保证去随机化与去语法噪音）。  

重构友好策略（平台 SSoT 指导）：

- 重排不改变 `stepKey`；  
- 语义变化通过 `digest` 体现；  
- `nodeId` 不承担“可读地址”的职责（避免重构导致锚点漂移）。

参考：`docs/ssot/platform/contracts/03-control-surface-manifest.md`（Identity 章节）。

### 1.3 为什么缺失 stepKey 必须 fail-fast（而不是默默降级）

因为 stepKey 不只是“UI 方便”：

- **diff 需要它**：没有 stepKey，任何变更指针只能靠下标或 span，都会漂移。  
- **诊断需要它**：事件流必须 Slim，只能携带锚点与 digest 引用；没有 stepKey 就无法回链到哪一步。  
- **回写需要它**：Rewriter 的安全边界是“只改缺失字段/最小 patch”；缺失地址就无法保守落笔。

因此，缺失 stepKey 只能有两种处置：

1. 平台子集内：走 **保守补全 + 回写**（一次性把缺失变成显式真相源）。  
2. 子集外：明确 Raw Mode/unsupported，并报告原因码（宁可不写回，也不能猜）。

## 2. 核心链路（从 0 到 1：Normalize → Validate → Autofill → WriteBack）

本节按平台流水线把 stepKey 放到正确的位置。

### 2.1 Normalize：Recipe/DSL → Canonical AST（stepKey 必须完整）

定义（术语）：

- `docs/ssot/platform/foundation/glossary/04-platform-terms.md`：Canonical AST 是唯一规范形  

关键约束：

- 同一语义必须只有一种表示；默认值落地；分支显式；**stepKey 完整**。  
- 一旦进入 Canonical AST，缺失 stepKey 就是合同违规：必须 fail-fast（不能“先跑起来再说”）。

### 2.2 Validate：fail-fast 校验（重复 stepKey 属于不可回写冲突）

校验口径（至少包含）：

- `version`（未知版本必须 fail-fast；forward-only）  
- `stepKey`：必填、同一 workflow 内唯一  
- `serviceId`：可解析（callById 字面量优先；Tag sugar 在子集外可降级）

上游裁决：`specs/075-workflow-codegen-ir/contracts/ir.md`、`docs/ssot/platform/contracts/03-control-surface-manifest.md`。

### 2.3 Autofill：只在 Platform-Grade 子集内“确定性补齐缺失 stepKey”

权威 contract：`specs/079-platform-anchor-autofill/contracts/workflow-stepkey-autofill.md`

核心原则（v1）：

1. **不覆盖原则**：已显式声明 `key` 的 step 绝不改写（reason: `already_declared`）。  
2. **重复必须拒绝**：workflow 内已有重复 stepKey → 拒绝写回（reason: `duplicate_step_key`）。  
3. **候选 key 生成必须确定性**：
   - dispatch：`dispatch.<actionTag>`
   - call：`call.<serviceId>`
   - delay：`delay.<ms>ms`
4. **冲突消解必须确定性、幂等**：
   - `baseKey.<n>`（按稳定遍历顺序决定 n）

> 重要：补全只能作为“迁移缺口工具”。一旦写回，后续重排不得依赖“重新补全”来维持稳定性。

### 2.4 WriteBack：只改缺失字段（最小 diff），不做语义猜测

在 stepKey 场景下，“安全回写”意味着：

- 只在 `steps[*]` 的对象字面量里插入 `key: '<computed>'`；  
- 不调整其它字段，不重排数组，不做格式化大改；  
- 任何不确定性都要拒绝并报告 reason codes，而不是“尽力改一下”。

写回前置：Parser 必须能提供稳定插入点（file/span/range），因此 081/082 采用 “AnchorIndex → PatchPlan → WriteBack” 的路线（见下一篇教程）。

## 3. 剧本集（用例驱动）

### 3.1 剧本 A：WorkflowDef 缺少 stepKey（子集内）——如何补齐并让它成为单一真相源

前提：

- WorkflowDef 是 Platform-Grade 子集形态（对象字面量/steps 数组字面量/关键字段字面量）。  
- steps 的 kind 属于 `dispatch|call|delay`（MVP 子集）。

做法（按 contract）：

1. 生成候选 baseKey：`dispatch.<actionTag>` / `call.<serviceId>` / `delay.<ms>ms`。  
2. 若 baseKey 冲突：按出现顺序加后缀 `.2/.3/...`。  
3. 生成最小补丁：对每个缺失 step 插入 `key` 字段。  
4. 回写源码后，后续任何 diff/诊断/迁移都以显式 key 为准（不再依赖推断）。

### 3.2 剧本 B：Workflow 内已有重复 stepKey ——为什么必须拒绝写回

重复 stepKey 属于“冲突态”，原因是：

- 工具无法判定“哪个才是正确地址”；  
- 任何自动改写都会改变作者意图（属于语义猜测）；  
- 一旦写回错误，会造成更隐蔽、更难回滚的漂移。

因此 contract 明确：`duplicate_step_key` → **只报告定位与修复建议，不写回**。

### 3.3 剧本 C：我想把 stepKey 改名（重构友好），但又不想把 diff/诊断全断掉

关键认知：stepKey 是“地址”，改名等价于“移动地址”，通常属于 breaking（至少对平台/回放/迁移而言）。

推荐做法：

- 把改名写进迁移说明（forward-only，无兼容层），并在 diff 报告中用 pointer 指向旧/新 stepKey。  
- 保证 `nodeId` 仍由新 stepKey 派生（可通过 digest/diff 让工具知道“这是重构还是语义变化”）。

### 3.4 剧本 D：我重排了 steps ——哪些锚点必须保持不变，哪些可以变化

原则：

- `stepKey` 不变（地址不变）。  
- `nodeId` 不变（如果它由 stepKey 派生）。  
- `digest` 可能变化（如果 IR 把顺序视为语义的一部分；具体以 075 的规范化规则为准）。  

工具侧：

- diff 应聚焦在 edges/next 顺序变化；  
- 诊断事件仍能回链到同一 stepKey；  
- Rewriter 不需要修改 stepKey，只需要改 edges 或源码顺序（视写回策略而定）。

## 4. 代码锚点（Code Anchors / Spec Anchors）

> 本主题当前以“协议/契约”为主；Parser/Rewriter 的实现仍在 081/082 路线推进中。

1. `docs/ssot/platform/foundation/glossary/04-platform-terms.md`：Canonical AST / Workflow Static IR / stepKey 的术语与边界。  
2. `docs/ssot/platform/contracts/03-control-surface-manifest.md`：Root IR 的 identity 口径（programId/nodeId/stepKey 去随机化）。  
3. `specs/075-workflow-codegen-ir/contracts/ir.md`：Canonical AST → WorkflowStaticIr 的映射规则（stepKey/source/nodeId/digest）。  
4. `specs/079-platform-anchor-autofill/contracts/workflow-stepkey-autofill.md`：缺失 stepKey 的保守补全与幂等规则。  
5. `specs/079-platform-anchor-autofill/contracts/reason-codes.md`：`duplicate_step_key/unresolvable_step_key/unsafe_to_patch/...`。  
6. `specs/081-platform-grade-parser-mvp/spec.md`：Platform-Grade WorkflowDef 的可解析边界（对象字面量/字面量 identity）。  

## 5. 验证方式（Evidence）

当 081/082 工具链落地后，最小验收建议：

1. **幂等**：对同一份源码重复运行 stepKey autofill，输出 patch 必须为空（already_declared）。  
2. **确定性**：缺失 stepKey 的同一输入，多次运行产生完全一致的 key（含后缀序号）。  
3. **拒绝写回**：duplicate_step_key 必须永远拒绝写回（只报告定位）。  
4. **最小 diff**：补丁只包含插入 `key` 字段，不改变其它结构与顺序。  

## 6. 常见坑（Anti-patterns）

- 用数组下标/随机数生成 stepKey：重排即漂移，diff/诊断/回写全断。  
- 试图在子集外“尽力补全”：会把不确定性变成 silent corruption。  
- 让 stepKey 隐含在注释或字符串拼装里：平台无法门禁与回写。  
- 把 stepKey 当“可选 DX”：它是平台/回放/对齐的硬合同字段。  
