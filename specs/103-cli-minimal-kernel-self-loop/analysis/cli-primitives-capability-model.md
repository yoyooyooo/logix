# CLI Primitives Capability Model (Baseline: Primitive Commands Only)

## 1. Baseline

本模型只评估基础命令（primitives），不把 `verify-loop` 作为必须覆盖条件。

增强层说明：

- `verify-loop`: 用于统一 verdict/retry orchestration
- `next-actions exec`: 用于执行结构化动作 DSL

## 2. Primitive Capability Groups

| 能力组 | 目标 | 命令 |
| --- | --- | --- |
| C1 能力发现 | 当前 CLI 能做什么、参数与输出契约是什么 | `describe` |
| C2 静态结构 | 导出与校验 static IR / control-surface | `ir export`, `ir validate`, `ir diff` |
| C3 动态试跑 | 对入口进行 trial run 并产出结构化 evidence | `trialrun` |
| C4 代码变更原语 | 生成（或执行）结构化变更计划 | `transform.module`, `anchor.autofill` |
| C5 动作执行原语 | 执行已有 next-actions DSL | `next-actions exec` |

## 3. Command Cards (Current)

### 3.1 `describe`

- 输入：命令级参数
- 输出：`describeReport`
- 价值：给 Agent 提供“可执行真相快照”
- 边界：不回答“当前场景应该执行哪条链路”

### 3.2 `ir export` / `ir validate` / `ir diff`

- 输入：entry / artifact dirs / profile
- 输出：manifest/workflow/validate/diff report
- 价值：稳定静态结构证据
- 边界：只验证结构与契约，不验证业务语义正确性

### 3.3 `trialrun`

- 输入：entry + diagnostics + emit/evidence
- 输出：`trialrun.report.json`, `trace.slim.json`, `evidence.json`
- 价值：统一动态试跑证据 + missing services/config 诊断
- 边界：
  - 不支持动作脚本驱动（无法描述“先 A 再 B 再断言 C”）
  - 不支持场景级 assertion 输入

### 3.4 `transform.module` / `anchor.autofill`

- 输入：ops / repoRoot / mode
- 输出：patchPlan / transform/autofill report
- 价值：提供 report-first 改写原语
- 边界：不自带“业务验收语义”，需外部链路验证

### 3.5 `next-actions exec`

- 输入：report 或 DSL 文件
- 输出：`nextActionsExecution`
- 价值：执行既有动作 DSL
- 边界：不负责生成 DSL，不负责策略决策

## 4. Evaluation Dimensions

每个场景按以下维度评估 primitives 是否足够：

- D1 `discoverability`: Agent 能否找到正确命令组合
- D2 `observability`: 是否有足够机读证据
- D3 `determinism`: 重跑结果是否可比
- D4 `diagnosability`: 错误是否可直接定位到可修复项
- D5 `actionability`: 是否能直接形成下一步可执行动作

## 5. Initial Conclusion

当前 primitives 在 D2/D3 基础面较强，在 D4 中等，在 D1/D5 偏弱。  
核心问题不是“命令不足”，而是“场景语义与命令组合之间缺少中间层契约”。

