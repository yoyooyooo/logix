---
title: 平台跑道：Anchors / Parser / Rewriter / 最小补丁回写 教程 · 剧本集（Platform-Grade 子集）
status: draft
version: 1
---

# 平台跑道：Anchors / Parser / Rewriter / 最小补丁回写 教程 · 剧本集（Platform-Grade 子集）

> **定位**：这是 `docs/ssot/handbook/` 的“维护者教程/剧本集”（how-to），用于新成员上手、老成员回味：把平台侧“全双工前置”中的 **Platform-Grade 子集**如何落地讲清楚——Anchors 如何定义、Parser MVP（081）如何产出 `AnchorIndex@v1`、Autofill（079）如何在安全边界内生成补全候选、Rewriter MVP（082）如何用 `PatchPlan@v1` 做最小源码写回，以及这些工件如何与 `ControlSurfaceManifest`（Root IR）对齐，避免并行真相源。  
> **重要**：本文不是裁决来源；凡涉及 MUST/协议/边界的最终口径以 SSoT 为准（`docs/ssot/platform/**` 与 `docs/ssot/runtime/**`）。

---

## 0. 最短阅读路径（10–25 分钟先建立正确心智）

按“上游裁决 → Parser/Rewriter 契约 → Workflow 锚点 → CLI 总控”顺序读：

1. Platform-Grade 子集与锚点系统（SSoT）：`docs/ssot/platform/ir/00-codegen-and-parser.md`
2. Root IR 收口（SSoT）：`docs/ssot/platform/contracts/03-control-surface-manifest.md`
3. Parser MVP（081）契约：
   - `specs/081-platform-grade-parser-mvp/spec.md`
   - `specs/081-platform-grade-parser-mvp/contracts/schemas/anchor-index.schema.json`
4. Rewriter MVP（082）契约：
   - `specs/082-platform-grade-rewriter-mvp/spec.md`
   - `specs/082-platform-grade-rewriter-mvp/contracts/schemas/patch-plan.schema.json`
   - `specs/082-platform-grade-rewriter-mvp/contracts/schemas/writeback-result.schema.json`
5. 保守补全策略（079）contracts（reason codes + stepKey）：
   - `specs/079-platform-anchor-autofill/contracts/reason-codes.md`
   - `specs/079-platform-anchor-autofill/contracts/services-anchor-autofill.md`
   - `specs/079-platform-anchor-autofill/contracts/source-anchor-autofill.md`
   - `specs/079-platform-anchor-autofill/contracts/workflow-stepkey-autofill.md`
6. Workflow（Π）与 Canonical AST（075，stepKey 是核心锚点）：
   - `specs/075-flow-program-codegen-ir/contracts/public-api.md`
   - `specs/075-flow-program-codegen-ir/data-model.md`
7. CLI 总控（085，Node-only 工具链跑道）：`specs/085-logix-cli-node-only/spec.md`

---

## 1. 心智模型：平台跑道解决的是“单一真相源的闭环回写”，不是“更聪明的静态分析”

平台侧的终局目标是：**Code ↔ Graph ↔ Runtime** 能无损往返，并且差异可门禁、可解释、可回放。  
要做到这一点，平台必须有一条“可控、确定性、可审阅”的跑道，把缺口闭环回写到源码——否则一定会出现并行真相源：

- 平台缓存一份“推断出的依赖图”，源码里没写；
- Devtools 又缓存一份“从试跑得到的证据”，也没写；
- 最终谁也说不清“权威到底是什么”，diff 与迁移变成黑盒。

平台跑道用一句话概括：

> **只在 Platform-Grade 子集内做受限解析与受限重写；对子集外永远降级为 Raw Mode，只报告不回写。**

这不是保守，而是为了避免一种比“漏掉补全”更致命的失败：**silent corruption（悄悄写错）**。

### 1.1 Platform-Grade vs Runtime-Grade：要全双工的只是一小块“可回写子集”

权威裁决见：`docs/ssot/platform/ir/00-codegen-and-parser.md`。这里只复述结论：

- **Platform-Grade**：必须可解析、可定位、可最小改写；典型是：
  - `Logix.Module.make(...)` 的定义点（对象字面量）
  - `ModuleDef.logic(($) => ...)` 的入口（用于归属与索引）
  - `$.use(Tag)` 的依赖使用点（用于依赖锚点）
  - WorkflowDef（`FlowProgram.make/fromJSON({ ... })`）的 identity/steps（用于 Π slice）
- **Runtime-Grade**：不要求可逆；平台只做 best-effort 展示/灰盒观测；典型是任意 Effect/Stream 组合、动态拼装、复杂闭包等。

### 1.2 Anchors 的定义：不是“注释”，而是“可枚举 + 可定位 + 可回写”的结构事实

在本仓库当前裁决下，Anchors 的主形态不是魔法注释，而是**代码结构本身**：

1. **上下文锚点**：`Module.make(...)` + `.logic(($) => ...)`（把“这段逻辑属于哪个模块”变成结构事实）
2. **依赖锚点**：`$.use(Tag)` 与 `ModuleDef.services`（把“我依赖谁”变成结构事实）
3. **Workflow 锚点**：WorkflowDef 的 `localId`、`trigger`、`steps[*].key`、`call.serviceId` 等（把 Π 的“可解释地址”变成结构事实）
4. **定位锚点**：`dev.source`（把“这条规则/这次依赖来自哪里”变成可跳转事实；但它是 dev-only，不进入结构 digest）

> 直觉：平台不是要“理解一切 TS”，而是要让“可治理的那部分结构”变得显式、可索引、可回写。

---

## 2. 核心链路（从 0 到 1：AnchorIndex → Policy → PatchPlan → WriteBackResult）

这条链路的关键点是：**Parser 与 Rewriter 不直接对话**，中间通过版本化工件（JSON schemas）握手：

- Parser：输出 `AnchorIndex@v1`（081）
- Autofill（policy）：读取 AnchorIndex，产出补全候选 + reason codes（079）
- Rewriter：输出 `PatchPlan@v1`，并（可选）执行写回得到 `WriteBackResult@v1`（082）
- CLI：把它们串起来，并提供统一的命令/落盘/exit code 规范（085）

### 2.1 Parser（081）：产出 `AnchorIndex@v1`（定义点/使用点/缺口点/Raw Mode）

权威 schema：`specs/081-platform-grade-parser-mvp/contracts/schemas/anchor-index.schema.json`

`AnchorIndex@v1` 的三类信息是后续能力的“单一输入”：

1. `entries[]`：子集内识别到的锚点条目（例如 `ModuleDef/LogicDef/ServiceUse/WorkflowDef/WorkflowCallUse`）
2. `rawMode[]`：子集外显式降级清单（每条必须带 `reasonCodes`）
3. `AutofillTarget`：缺口点（Missing）+ 可插入点（`missing.*.insertSpan`）——这是“只改缺失字段”的关键

#### 2.1.1 为什么 AnchorIndex 要包含 `insertSpan`

因为 Rewriter 只做最小补丁写回，而不是“重排/重打印整个对象”。

对于 `services/dev.source/workflowStepKey` 这类字段，Parser 需要告诉 Rewriter：

- 缺的是哪个字段（`missing.services` / `missing.devSource` / `missing.workflowStepKey`）
- 可以往哪里插入（`insertSpan`，包含 line/column/offset）

这样 Rewriter 才能用 `AddObjectProperty` 这种“点状写入”完成闭环。

#### 2.1.2 依赖使用点的硬裁决：只认 `$.use(Tag)`，不认 `yield* Tag`

来自 081 的 Clarifications：`specs/081-platform-grade-parser-mvp/spec.md`

- `$.use(Tag)`：被视为 Platform-Grade 的“可枚举依赖使用点”
- `yield* Tag`（Effect Env 读取）：不被当作服务依赖使用点；默认进入 Raw Mode

理由：`yield* Tag` 在语义上可能是临时读取/调试/条件路径，平台无法保证它是“稳定依赖关系”。

#### 2.1.3 Workflow 的 Platform-Grade 形态：只认 `callById('<serviceId>')` 的字面量

来自 081/075 的共同裁决：

- WorkflowDef 内的 `serviceId` 必须是字符串字面量（等价于 `callById('<serviceId>')`）
- `call(Tag)` 只作为 TS sugar；Parser/Autofill 不要求解析 Tag（避免跨文件求值与漂移）

这条规则直接服务 079：让服务依赖补全可以把 Workflow 内 `call.serviceId` 当成“高置信度使用点”。

### 2.2 Autofill（079）：只做“未声明且高置信度”的保守补全（宁可漏不乱补）

079 的核心不是“如何更聪明”，而是“何时必须拒绝”。权威 contracts：

- reason codes：`specs/079-platform-anchor-autofill/contracts/reason-codes.md`
- services：`specs/079-platform-anchor-autofill/contracts/services-anchor-autofill.md`
- dev.source：`specs/079-platform-anchor-autofill/contracts/source-anchor-autofill.md`
- stepKey：`specs/079-platform-anchor-autofill/contracts/workflow-stepkey-autofill.md`

#### 2.2.1 不覆盖原则：显式声明永远胜出（包括 `services: {}`)

典型坑：把 `services: {}` 当成“缺失”。  
079 的裁决非常明确：**只要 `services` 字段存在（哪怕空对象），就视为作者已显式声明，必须跳过**（reason: `already_declared`）。

这条规则是为了守住“单一真相源”：平台不能偷偷覆盖作者已经写下的声明。

#### 2.2.2 services 补全：端口名默认等于 `serviceId`，不推断业务别名

079 裁决：端口命名默认 `port = serviceId`，并按 `serviceId` 稳定排序、去重。

平台不应推断 `archiver/backupSvc` 这类业务别名，否则会把“风格偏好”变成漂移源。

#### 2.2.3 dev.source：是可跳转锚点，但必须排除在结构 digest 之外

`dev.source` 的价值是 traceability（跳转/定位），不是“语义变化”。  
因此它属于 dev-only 元数据：允许随代码移动变化，但不应进入结构 digest（避免 CI diff 噪声）。

#### 2.2.4 Workflow stepKey：缺失必须补齐/或 fail-fast；冲突必须拒绝写回

这条是平台跑道最关键的“可门禁化锚点”之一，因为它直接对齐 Root IR 的 Π slice（workflowSurface）：

- 075 的硬裁决：stepKey 必填、唯一；缺失/冲突 fail-fast（见 `specs/075-flow-program-codegen-ir/data-model.md`）
- 079 允许在 Platform-Grade 子集内对缺失 stepKey 做确定性补齐（`dispatch.<actionTag>` / `call.<serviceId>` / `delay.<ms>ms`），并且冲突消解规则必须确定性（`.<n>` 后缀）
- 但：**如果 workflow 内已经存在重复 stepKey，必须拒绝写回并报告**（reason: `duplicate_step_key`）

> 直觉：stepKey 是“可解释地址”。自动补全只能用于迁移缺口；一旦写回，后续重排不得依赖“再次补全”来维持稳定性。

### 2.3 Rewriter（082）：用 `PatchPlan@v1` 做最小补丁，必要时显式失败

082 的输出不是“补丁文本”，而是可审阅、可门禁、可执行的结构化计划：

- `PatchPlan@v1`：`specs/082-platform-grade-rewriter-mvp/contracts/schemas/patch-plan.schema.json`
- `WriteBackResult@v1`：`specs/082-platform-grade-rewriter-mvp/contracts/schemas/writeback-result.schema.json`

#### 2.3.1 PatchPlan 的基本单位：`AddObjectProperty`

当前 MVP 只支持一种写入操作：**在对象字面量中新增缺失字段**。

计划项包含：

- `file`：目标文件
- `targetSpan`：插入位置（来自 AnchorIndex 的 insertSpan）
- `property`：要写入的 `{ name, valueCode }`
- `decision`：`write|skip|fail`
- `reasonCodes[]`：每个决定必须可解释（宁可 fail 也不 silent）

#### 2.3.2 plan→write 竞态防护：write 模式必须校验 `expectedFileDigest`

这是“可交接”的安全边界之一：

- Plan 阶段读到的文件内容必须做 digest（可复现）
- Write 阶段写回前必须校验当前文件 digest 与 plan 一致
- 不一致必须失败（禁止强行覆盖），并输出可解释 reason codes

> 这条规则防的是“你刚生成补丁，文件同时被格式化/手改了”的竞态；不处理会造成 silent corruption。

#### 2.3.3 最小 diff 的含义：不做全文件 reprint/format，做不到就拒绝写回

082 的裁决是“保守”：能做到点状插入就写，做不到就 fail，并给出 reason codes。  
原因很直接：全文件重排会把“锚点补全”变成“风格重写”，严重增加 review 成本，并破坏可控性。

### 2.4 CLI（085）：Node-only 的统一入口与集成测试跑道

CLI 的定位是：把 Parser/Rewriter/TrialRun/IR 导出串起来，作为开发者与 CI 的统一入口（平台 UI 之前的跑道）。

权威 quickstart：`specs/085-logix-cli-node-only/quickstart.md`

预期命令（注意：这是 spec 固化的语义，当前仓库可能尚未落地对应包实现）：

- `logix anchor index`：输出 `AnchorIndex@v1`（081）
- `logix anchor autofill --report|--write`：输出 `PatchPlan@v1`/`WriteBackResult@v1`（082）与 AutofillReport（079）

Exit code 规范（门禁化）：

- `0=PASS`
- `2=VIOLATION`（差异/规则违反）
- `1=ERROR`（运行失败/异常）

---

## 3. 与 Workflow/Canonical AST/Static IR 的对齐：为什么 anchors 不只是“补字段”

平台跑道的写回，不是为了“代码更漂亮”，而是为了让 Root IR（`ControlSurfaceManifest`）可构建、可 diff、可门禁：

- Root IR 必须收口：`docs/ssot/platform/contracts/03-control-surface-manifest.md`
- Π slice 的权威来源是 FlowProgram Static IR（`workflowSurface`）
- FlowProgram 的语义规范形是 Canonical AST（stepKey 必须完整）：`specs/075-flow-program-codegen-ir/data-model.md`

因此：

1. **Workflow stepKey 是 Root IR 的稳定地址**
   - 没有 stepKey，就无法在 diff/诊断/迁移里稳定指向某个步骤（重排会让“按数组下标定位”彻底失效）。
2. **Parser/Rewriter 的补全只是“把缺口从运行期/平台缓存挪回源码”**
   - 权威真相源仍然是源码锚点声明（单一真相源）
   - TrialRun/Spy 等只作为证据输入（帮助报告/校验），不能反向成为写回依据
3. **命名对齐：平台消费的是 workflowSurface，而不是随意的新 IR 名称**
   - 对外 authoring 概念当前用 `FlowProgram`
   - 对外交换工件在 Root IR 中叫 `workflowSurface`（Π slice）
   - 这是一条“避免并行真相源”的命名纪律：同一件事只有一个长期工件名字

---

## 4. 剧本集（高频场景：从“能跑”变成“可门禁/可回写”）

### A) 新仓库/新模块第一次接入：缺 anchors 很正常，但必须“可解释”

你会看到两类输出（概念上）：

- 子集内：会产生 `AutofillTarget.missing.*`（可回写缺口点）
- 子集外：会落入 `rawMode[]`，带 reason codes（例如 dynamic 组合、变量中转、spread）

行动准则：先把关键对象迁移进 Platform-Grade 子集（对象字面量 + 字面量 identity），再谈回写。

### B) 先 report-only，再 write：让写回可审阅、可门禁、可渐进推进

079/082/085 的组合默认鼓励：

1. report-only：输出“将修改什么/为什么/在哪里”（PatchPlan）
2. 人审阅：确认只改缺失字段、reason codes 可接受
3. write-back：执行写回，并在第二次执行验证幂等（0 diff）

### C) `services` 已显式声明但不完整：工具必须跳过（单一真相源优先）

这是最容易被误判的场景。只要 `services` 字段存在，就当作作者权威声明：

- 工具只能报告 deviation 线索（例如发现使用点但声明缺失）
- 不能自动补齐（否则就是覆盖作者意图）

### D) plan→write 竞态：文件变了必须 fail-fast

如果 plan 与 write 之间文件被改（format/save/merge），写回必须失败并给出 reason codes。  
这比“强行写进去然后祈祷没坏”要安全得多。

### E) Workflow stepKey 缺失/冲突：补全只用于迁移缺口，冲突必须拒绝写回

缺失：允许在 Platform-Grade 子集内确定性补齐。  
冲突：必须拒绝写回并报告（让作者修复），否则会把“冲突”变成“漂移”。

---

## 5. 代码锚点（Code Anchors）

SSoT（平台裁决）：

- `docs/ssot/platform/ir/00-codegen-and-parser.md`
- `docs/ssot/platform/contracts/03-control-surface-manifest.md`

Parser / Rewriter / Autofill / CLI（spec contracts）：

- `specs/081-platform-grade-parser-mvp/contracts/schemas/anchor-index.schema.json`
- `specs/082-platform-grade-rewriter-mvp/contracts/schemas/patch-plan.schema.json`
- `specs/082-platform-grade-rewriter-mvp/contracts/schemas/writeback-result.schema.json`
- `specs/079-platform-anchor-autofill/contracts/reason-codes.md`
- `specs/079-platform-anchor-autofill/contracts/workflow-stepkey-autofill.md`
- `specs/085-logix-cli-node-only/spec.md`

Workflow（Π slice）：

- `specs/075-flow-program-codegen-ir/contracts/public-api.md`
- `specs/075-flow-program-codegen-ir/data-model.md`

现有脚本（迁移来源，非长期权威入口）：

- `scripts/ir/inspect-module.ts`

---

## 6. 验证方式（Evidence）

这一跑道的“验收证据”不依赖平台 UI，关键看三件事：

1. **schema 校验**：AnchorIndex/PatchPlan/WriteBackResult/AutofillReport 必须能被 JSON schema 验证通过（版本化、可序列化）。
2. **确定性**：同一输入重复运行，输出字节级一致（不引入时间戳/随机/机器差异）。
3. **幂等与最小 diff**：
   - write-back 后再次运行应为 0 diff
   - 写回只新增缺失字段，不重排、不全文件 reprint
   - plan→write 竞态必须 fail-fast（不能 silent overwrite）

---

## 7. 常见坑（Anti-patterns）

1. **把 parser 做成“尽力理解一切 TS”**：会逼迫你在不确定处猜测，最终引入 silent corruption；必须守 Platform-Grade 子集边界。
2. **把 `yield* Tag` 当作依赖使用点**：会把 env 读取误当成稳定依赖，导致依赖图漂移；依赖锚点只认 `$.use(Tag)` 或显式 `services` 声明。
3. **看到 `services: {}` 还去补全**：等价于覆盖作者声明；必须跳过并解释。
4. **用 TrialRun/Spy 结果反向决定写回**：它们只能做证据/校验输入，不能成为权威写回依据（单一真相源）。
5. **写回时全文件 reprint/format**：会把“锚点补全”变成“格式化 PR”，破坏可控性；做不到最小 diff 就 fail 并给 reason codes。
6. **stepKey 用数组下标或随机数生成**：会导致重排漂移、无法 diff；stepKey 必须稳定、可解释、可门禁化。
7. **在 runtime 包里引入 ts-morph/swc**：违反 Node-only 边界，会把工具链成本带入运行时（080/085 明确禁止）。

