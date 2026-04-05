# IR vs AST：表达能力、可逆性与 Agent 出码闭环（上帝视角）

> **定位**：回答三个常见误区：
>
> 1. “trial-run 拿 IR 是不是比 AST 高级？”
> 2. IR 能不能完全覆盖 AST？
> 3. 如果目标是把东西“变成源码”，IR 能做到吗？哪些地方是黑盒？
>
> 本文只讲原则与边界；IR 的具体字段与链路实现外链到：`docs/ssot/runtime/logix-core/api/07-ir-pipeline-from-irpage.md`。

## 1) 先把概念放回正确坐标

- **AST（Abstract Syntax Tree）**：源码的语法结构（token/节点/位置/注释/格式等）。擅长“编辑与变换源码”。
- **IR（Intermediate Representation）**：为某个目标域抽取的中间表示。Logix 语境里，IR 更接近“平台可验收/可回放/可解释的事实工件集合”（Manifest / StaticIR / Diff / TrialRunReport / EvidencePackage）。

因此它们并不是同一维度的“高/低级”，而是不同目标的工具。

## 2) 表达能力：谁更“强”取决于你问的是哪种能力

### 2.1 AST 强在哪

- **语法保真**：能精确保留注释、格式、局部结构与源码位置（适合重构、lint autofix、格式化、codemod）。
- **可逆编辑**：对“把代码改成另一段代码”这件事，AST 是天然载体（能做到最小 diff、最大可审阅）。

### 2.2 Logix IR 强在哪

- **语义可验收**：IR 面向平台/CI/Studio 的核心诉求是“可判定/可对比/可解释”，而不是“源码长什么样”。
- **运行时事实**：通过 trial-run + evidence，IR 可以携带 AST 很难可靠推断的事实：
  - 依赖装配是否缺失（missing services/config keys）
  - 控制面覆写最终选了哪个 impl（RuntimeServicesEvidence）
  - 受控窗口内发生了哪些可序列化事件（debug:event timeline）
  - 输出是否超预算/被裁剪（truncated/oversized 的显式原因）

结论：在“平台验收与诊断闭环”这条轴上，IR 往往比 AST 更直接、更可复现。

## 3) IR 能否覆盖 AST？答案是：不能，也不应该

- AST 覆盖的是“源码语法信息”（包括大量 IR 不关心的信息：注释/排版/局部命名/代码风格）。
- IR 覆盖的是“目标域事实”（包括大量 AST 不直接给的事实：运行时证据、装配结果、预算裁剪、控制面覆写等）。

它们的交集存在，但谁也不可能、也没必要“完全覆盖”对方。最佳策略是 **互补**：

- **IR 做裁判**：判定/验收/对比/解释/回放只认 IR（工件与证据链）。
- **AST（或文本 patch）做编辑载体**：把 Agent 的修改输出变成可审阅的 patch，并保持代码可维护性。

036 的治理方向已经把这条线写进 spec：`specs/036-workbench-contract-suite/spec.md`（Out of Scope：AST 不作为事实源）。

## 4) “纯转化为源码”这个目标，IR 能做到吗？

分两类情况：

### 4.1 受限 DSL / 规范化输入（可以做到）

如果输入本身就是 **可完全降解到统一最小 IR** 的声明式 DSL（例如未来平台的 Intent/Scenario/Rule/Blueprint 等），并且我们愿意牺牲“自由手写 TS”，那么：

- IR 可以作为 **可出码的规范化表示**；
- 代码生成可以做到确定性（同 IR → 同代码结构/同文件布局），便于 diff 与回滚；
- 这类 codegen 的“黑盒”主要是模板/格式策略（可版本化、可测试）。

### 4.2 任意手写 TypeScript（无法完全做到）

当输入包含任意用户代码（闭包、动态条件、第三方库调用、宏式写法、元编程等）时：

- IR 必然会丢失大量语法层信息（注释、格式、局部命名、表达式细节）。
- 更关键的是：很多“语义”来自 **黑盒执行**（用户写的函数如何计算、Effect 如何组合、第三方库如何工作），IR 最多能通过 trial-run 拿到“行为证据”，但不能反推出“原始源码长什么样”。

此时 IR 仍然很有价值——它可以告诉你“行为是否满足约束/是否通过验收”，但它不应承诺“能还原源码”。

## 5) 对 Agent 出码的启示（平台应该提供什么）

平台要让 LLM 最大化参与，同时保持工程可控，推荐组合拳：

- **IR/Artifacts/TrialRun/Diff/Evidence**：作为客观反馈回路（判定与诊断）
- **Context Pack（最小特权）**：把“事实 + 缺口 + 约束 + target”打包给 Agent，避免全仓喂上下文（参考 `specs/036-workbench-contract-suite/research.md`）
- **Patch 载体**：AST patch 或文本 diff（可审阅、可落盘）
- **再运行与再判定**：每轮 patch 必须重跑并产出新 IR，禁止只靠模型自检

这会让“LLM 参与”从一次性生成变成可迭代的、可验收的工程流水线。

## References

- IrPage→IR 全链路：`docs/ssot/runtime/logix-core/api/07-ir-pipeline-from-irpage.md`
- 036 规划（Agent 工具面与 verdict）：`specs/036-workbench-contract-suite/plan.md`、`specs/036-workbench-contract-suite/research.md`
- 025 IR schemas（Manifest/StaticIR/TrialRunReport/Diff）：`specs/025-ir-reflection-loader/contracts/schemas/*`
