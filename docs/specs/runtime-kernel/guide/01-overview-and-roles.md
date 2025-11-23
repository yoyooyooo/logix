# 01 · 我在用 Kernel 做什么？

## 1. 面向谁

本手册主要面向两类读者：

- 负责在业务项目中接入 Kernel 的前端工程师；  
- 负责把 Intent/Flow 工具链落到实际代码仓库中的平台/基础设施开发者。

你可以假设：

- 已经了解项目整体在推进「Intent → Flow/Effect → 代码」的方向；  
- 不需要深入理解 Kernel 内部 Scope/Hub/Stream 的实现，只需要知道如何在业务场景中使用 Store/Logic/API。

## 2. Kernel 在架构里的位置（使用者视角）

从使用者视角，简单记两点即可：

- Kernel 是**前端应用里的唯一状态与本地行为运行时**：字段联动、表单校验、列表加载策略、UI 级状态（loading/error/dialog 等）都统一交给 Store + Logic 来管理；  
- 对「跨系统 / 强审计 / 长流程」的行为（如导出任务、审批流），Kernel 只负责：  
  - 触发服务侧 Flow（Effect Flow Runtime）；  
  - 接收结果、更新本地状态、驱动 UI。

可以把 Kernel 理解为「更强版的表单/Store」，但：

- 不再允许在 React 组件里散落 `useEffect` 编排业务级联动；  
- 所有业务副作用（调用 API、刷新列表、发埋点等）都通过 Kernel 的 Logic 来声明。

## 3. 什么时候应该用 Kernel？

一个简单的判断表（从高到低优先级）：

- **肯定用 Kernel 的场景**：  
  - 一个页面内存在多处联动（筛选改变 → 重置页码 → 重新加载列表）；  
  - 表单里有异步校验、跨字段约束（用户名检查、密码二次确认等）；  
  - 同一份状态要在多个组件间共享（列表 + 汇总条 +工具栏状态）；  
  - 需要清晰的「谁改了这个字段」的因果链（调试/回放）。

- **更适合交给 Effect Flow Runtime 的场景**：  
  - 订单导出、批量任务、审批流等，需要在服务端/后台系统跑完整流程；  
  - 与多个后端系统协同（HTTP + MQ + 定时任务），需要强审计/重试/回放；  
  - 行为本身和具体某个页面的 UI 关系不大，只需要在前端展现结果。

- **可以暂时不用 Kernel 的场景**：  
  - 非常简单的静态 UI 或一次性 PoC，只有少量本地状态、没有跨组件联动；  
  - 纯展示页，几乎没有业务逻辑（这类场景 Kernel 不会带来明显收益）。

> 经验法则：只要你开始考虑“这个逻辑是写在组件 A 里，还是放到 store 里？”——优先考虑 Kernel，把「业务行为」写成 Logic 规则，而不是继续扩散 useEffect。

## 4. 与 core/scenarios & examples 的对应关系

在 `core/` 下已经有两类「开发视角」文档：

- `core/scenarios/*.md`：按能力域拆分的场景压测（联动、异步、副作用、集合、生命周期、外部源等）；  
- `core/examples/*.md`：基于真实 UI 场景的例子（基础表单、复杂列表、外部集成、动态逻辑等）。

本手册里：

- `02-getting-started-basic-form.md` 对应 **01-basic-form** 示例；  
- `03-getting-started-list-and-query.md` 对应 **02-complex-list** + 部分 `integration-guide.md`；  
- `04-common-patterns-and-scenarios.md` 汇总并翻译 `core/scenarios/*.md` 为「可以直接抄的配方」；  
- `05-working-with-effect-flow-runtime.md` 则站在用户视角说明如何在 Kernel 中触发 Flow Runtime。

如果你在看某个 example/scenario 时觉得「太像库作者在自言自语」，可以回到本手册里找对应的「配方版」解释。

