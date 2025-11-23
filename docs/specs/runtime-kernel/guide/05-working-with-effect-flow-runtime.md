# 05 · 与 Effect Flow Runtime 协同工作

> 目标：说明在前端 Logix Engine 中，如何以一致的方式触发服务侧 Flow（Effect Flow Runtime），并回填结果、呈现执行过程。  
> 上游规范：`docs/specs/intent-driven-ai-coding/v2/97-effect-runtime-and-flow-execution.md`。

## 1. 角色分工回顾

- **Logix Engine**：承载前端本地状态与交互逻辑，负责页面内的联动、副作用与可观测性；  
- **Effect Flow Runtime**：承载跨页面/跨服务的业务流程（如创建订单、审批流），负责编排后端服务与长事务；  
- **Platform**：根据 Intent/Flow 定义生成两套运行时代码与调用契约。

从使用者视角看，Logix Engine 只是把 Flow Runtime 当成一个「服务」，通过标准化的 Service 接口触发并消费其结果。

## 2. 在 Logix 中触发 Flow

典型触发路径：

- UI 层产生 Interaction（点击按钮、提交表单），被映射为 Logix 的 `set` / `emit` / `onInput`；  
- Logic 规则在合适时机调用注入的 `services.FlowRunner.run(flowId, input)` 或类似接口；  
- Flow Runtime 按其 DSL/契约执行具体业务流程，并返回结果或错误。

实践建议：

- 把 Flow 调用封装成单独的 Service 方法，而不是在 Logic 中直接拼装复杂 Effect；  
- 利用 Logix 的 `debug$` / `error$` 记录每次 Flow 调用的输入、输出与错误，方便 Trace。

## 3. 回填状态与 UI 反馈

当 Flow 完成或失败时，应通过 Logix 状态机统一向 UI 反馈：

- 在成功场景下：更新业务实体（如订单详情）、刷新列表、关闭弹窗等；  
- 在失败场景下：写入可展示的错误消息、重置加载状态、保留用户输入。  

推荐模式：

- 使用 Logix State 记录 Flow 的「运行中/完成/失败」状态，避免在组件内部维护额外的 `isSubmitting`；  
- 如需要展示进度条/步骤状态，可将 Flow 的中间状态映射为前端可观察字段。

## 4. 常见模式与 Anti-Pattern

推荐模式：

- 「表单提交 -> 触发 Flow -> 等待结果 -> 更新状态」完整链路都在 Logix Logic + Services 中实现；  
- 多个页面共享同一 Flow 结果时，通过共享 Store 或服务层缓存，而不是在各自组件中重复请求。

避免模式：

- 在 React 组件中直接调用 Flow Runtime，再把结果「塞回」 Logix（会破坏因果链与调试体验）；  
- 将 Flow 的中间状态只保存在组件本地 State，而不写入 Logix（难以追踪与回放）。

## 5. 参考资料

- `docs/specs/intent-driven-ai-coding/v2/97-effect-runtime-and-flow-execution.md`：Runtime 家族与 Flow 执行链路的统一说明；  
- `docs/specs/intent-driven-ai-coding/v2/04-intent-to-code-example.md`：从 Intent 到 Flow/Kernal 代码的端到端示例；  
- `../core/04-platform-integration.md`：从 Logix 视角描述与平台/Flow Runtime 的集成与治理。
