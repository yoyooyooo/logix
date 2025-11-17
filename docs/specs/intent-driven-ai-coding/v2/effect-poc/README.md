---
title: Effect Runtime PoC · 场景目录
status: draft
version: 0
---

> 本目录用于基于 `effect-ts`（或等价简化版 Effect）进行**业务场景级 PoC**，在正式沉淀 best-practice 之前，先用若干独立文件尝试不同 Flow 写法与 Layer 组合方式，特别是 ToB 场景中的复杂异步与表单逻辑。

- `shared/`：公共类型、简化版 Effect/Env/Layer 抽象（如未直接引入 effect-ts 时使用）。  
- `scenarios/`：按业务场景拆分的 Flow/Env/Layer 示例（列表/导出、审批流、复杂表单、轮询任务等）。

约定：

- 每个场景独立在 `scenarios/*` 中建子目录，包含：
  - `env.ts`：该场景需要的服务接口定义；
  - `flow.ts`：Flow 实现（Effect 程序），对应 v2 模型中的某个 FlowIntent/FlowDslV2；
  - `index.ts`（可选）：简单的 run 示例或测试入口。  
- PoC 代码可以偏工程化，不要求完全贴合最终 API；但在语义上应贴近 `97-effect-runtime-and-flow-execution.md` 中描述的角色与边界。

目前建议覆盖的典型 ToB 场景包括（可逐步补充）：

- 列表 + 筛选 + 导出：`scenarios/order-export`（已有）；
- 通用 CRUD 表单（创建/编辑 + 服务端校验）：`scenarios/crud-form`（已有）；
- 审批/多步骤工作流（含分支）：`scenarios/approval-flow`（已有）；
- 批量操作（多选 + 后端批处理）：`scenarios/bulk-operations`（已有）；
- 长耗时任务与轮询（导入、大规模计算）：`scenarios/long-task-polling`（已有）；
- 异步联动（级联下拉、依赖字段）：`scenarios/dependent-selects`（省市区级联，已有）；
- 搜索与防抖（输入联动、结果更新）：`scenarios/search-with-debounce`；
- 乐观更新与回滚（切换状态开关）：`scenarios/optimistic-toggle`；
- 文件上传与导入（上传 + 校验 + 导入任务）：`scenarios/file-import`.
