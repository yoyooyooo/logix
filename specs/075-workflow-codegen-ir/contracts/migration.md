# Migration Notes（forward-only）

本特性新增 WorkflowDef/Workflow API，用于把“手写 watcher 工作流”升级为“可编译控制律（Π）”。

## 定位更新（v1）

Workflow v1 已明确为 AI/平台专属的出码层（IR DSL；权威输入为 `WorkflowDef`）。因此迁移的核心不是“把业务手写 DSL 改得更顺手”，而是：

- 把高频 workflow 收敛到可出码/可校验/可导出的结构形态（Recipe/AI/Studio → Canonical AST → Static IR）
- 把时间/并发/取消语义纳入 tick 参考系，并保证解释链与回放对齐

## 建议迁移

- 把关键工作流（submit/跳转/刷新/重试）逐步迁到 WorkflowDef/Workflow：
  - 使时间算子进入 tick 参考系（避免影子 setTimeout/Promise 链导致 replay/解释断链）
  - 使结构 IR 可导出（便于 Devtools/审查/diff）

## 推荐迁移路径（v1）

1) 先把手写 watcher 归类到 Recipe 族（submit/typeahead/refresh 等），用 Recipe 生成 Canonical AST  
2) 导出 Static IR 并接入 Devtools diff（确认锚点稳定、分支显式）  
3) 再替换运行期执行：用 WorkflowRuntime 编译+mount，观察 diagnostics=off 的成本与 light/sampled/full 的解释链  

> 若 workflow 依赖 service 返回值计算后续 payload/分支：v1 必须下沉到 service（service 自己 dispatch/写 state），或拆成多个 Program 通过 action 串联（这是硬裁决，不提供兼容层）。

## 不提供兼容层

- forward-only：不会保留“旧 API 的 shim”或弃用期；迁移以类型检查与新文档为准。
