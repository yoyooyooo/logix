# Research: O-005 默认 Full Cutover + 显式 Trial

## 结论概览

- Decision: Runtime 装配阶段的 gate 默认模式改为 `fullCutover`（无配置即严格门禁）。
  - Rationale: 满足 FR-003/FR-004，消除“隐式 trial/fallback 常态化”。
  - Alternatives considered:
    - 保持默认 `trial`：拒绝，违背 spec 对默认策略的裁决。
    - 仅在文档声明默认严格，不改代码默认值：拒绝，无法形成行为保证。

- Decision: 保留显式 `trial` 能力，仅通过配置触发（`CoreKernel.fullCutoverGateModeLayer('trial')`）。
  - Rationale: 保留实验/对照能力，同时避免默认路径退化。
  - Alternatives considered:
    - 移除 `trial`：拒绝，会损失回归对照场景。
    - 隐式按环境切换（dev=trial/prod=full）：拒绝，语义不稳定且不透明。

- Decision: 为 gate 结果补充最小可解释字段 `reason` 与 `evidence`（可序列化）。
  - Rationale: 满足 FR-004、SC-006，对失败或降级给出可机器消费解释。
  - Alternatives considered:
    - 仅依赖 message 文本：拒绝，难以稳定回放/断言。
    - 引入复杂诊断对象：拒绝，超出最小交付目标并增加热路径风险。

- Decision: 本轮不改动 unified minimal IR 的其他结构逻辑，仅收敛 gate 默认行为与解释字段。
  - Rationale: 控制变更面，满足“最小可交付”。
  - Alternatives considered:
    - 同步重排 IR 导出/消费链路：拒绝，本任务非目标且风险过高。

## 约束与边界

- 仅触达 `ModuleRuntime.impl` / `RuntimeKernel` / `FullCutoverGate` 相关路径。
- 仅新增最小测试覆盖：
  - 无配置时不再隐式 fallback；
  - 显式 trial 仍可运行并能读取可解释 reason。
- 不引入兼容层，不保留弃用窗口。

## 风险与缓解

- 风险: 依赖旧默认行为（隐式 trial）的调用方会更早失败。
  - 缓解: 提供迁移 playbook，明确“必须显式配置 trial”。
- 风险: reason/evidence 字段变更影响序列化断言。
  - 缓解: 使用最小稳定结构，补充针对字段的测试断言。
