# Scenario Orthogonal Decomposition (Business-Capability Level)

## 1. Purpose

将 `examples/logix/src/scenarios` 中的可运行样例，正交分解为业务能力级场景集合（L1），再映射到虚拟 ToB 语义（L2），作为 CLI 能力覆盖评估的输入基线。

本分解只回答一个问题：
“真实业务开发过程中，Agent 需要完成哪些类型的任务，CLI 是否能提供足够可验证武器？”

## 2. Decomposition Method

按下列正交维度分组，避免“按文件名罗列”：

- 业务目标：用户要完成什么业务结果
- 状态形态：单模块局部状态 / 跨模块协同状态
- 外部依赖：纯内存 / Service / 外部源
- 时间语义：同步 / 异步 / 长任务 / 重试
- 风险类型：一致性风险 / 回滚风险 / 可观测性风险

## 3. L1 Scenario Set (10)

| L1 场景 | 业务能力定义 | L2 虚拟 ToB 映射 | 代码锚点（examples） |
| --- | --- | --- | --- |
| S01 表单编辑与脏态 | 输入/重置驱动状态收敛，确保 dirty 语义正确 | 主数据编辑页、配置页 | `and-update-on-action.ts`, `fluent-intent-basic.ts` |
| S02 搜索-详情联动 | 搜索结果与详情模块协同，避免错配与抖动 | 客户检索、商品检索 | `search-with-debounce-latest.ts`, `ir/coordinated-search-detail.ts` |
| S03 审批与流程编排 | 多步骤业务流，含校验、提交、失败分支 | 工单审批、风控复核 | `approval-flow.ts`, `workflow-codegen-ir.ts` |
| S04 批量操作 | 多目标选择与批处理执行 | 批量归档、批量变更状态 | `bulk-operations.ts`, `batch-archive-flow.ts` |
| S05 文件导入 | 外部输入到内部状态/流程的桥接 | 批量导入主数据 | `file-import-flow.ts` |
| S06 长任务与进度 | 长时流程启动、中断、收敛 | 数据回填、离线任务 | `long-task-pattern.ts`, `long-task-from-pattern.ts` |
| S07 跨模块协作 | 模块间事件/状态编排，保证边界清晰 | 购物车联动、区域级联 | `cross-module-link.ts`, `link-multi-modules-by-id.ts`, `region-cascade.ts` |
| S08 外部源同步 | 外部 store 或 host 信号进入 runtime | 路由状态同步、外部数据回流 | `external-store-tick.ts`, `custom-runtime-platform.ts` |
| S09 乐观更新与回滚 | 先写后校验，失败后回滚 | 任务开关、状态变更确认 | `optimistic-toggle.ts`, `optimistic-toggle-from-pattern.ts` |
| S10 Agent 协同控制 | Agent 驱动的流程控制与可解释动作链 | 智能助手编排业务动作 | `agent-fluent-with-control.ts`, `trialRunEvidence.ts` |

## 4. Coverage Boundary

本轮仅以业务能力级（L1）作为覆盖单位，不下钻到“每个 action 粒度”。

判定规则：

- `covered`: 该场景可由 primitives 直接形成“可执行 + 可验证 + 可决策”闭环
- `partial`: 可执行，但验证或决策证据不足
- `missing`: 无法形成机器可消费闭环

## 5. Key Observation

`examples` 的场景多样性已足够覆盖核心业务形态，但 CLI 当前证据形态仍偏“结构与试跑”，缺少“业务语义级断言输入”，导致多数场景只能到 `partial`。

