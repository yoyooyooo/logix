---
title: best-practice 仓库与 Effect/Flow 行为层的整合建议
status: draft
version: v1
---

> 本文不是对 IMD 仓库的直接实现要求，而是一份面向 `/Users/yoyo/projj/git.imile.com/ux/best-practice` 的后续优化建议。  
> 目标是：在不干扰现有 CRUD 最佳实践的前提下，为“意图驱动 + Flow/Effect 行为层”铺好必要的路。

## 1. 前提与目标

- 当前 best-practice 仓库已经定义了：
  - 文件类型与命名规范（`05-file-conventions.md`）；
  - 状态管理与 Query 规范（Zustand + TanStack Query）；
  - 服务层 / 适配器 / Query Hook 的分层与模板；
  - 规则注册表与 LLM 模板索引（`llms/01-rules-registry.yaml`、`03-templates.yaml`）。
- Intent-driven 规划希望：
  - 将复杂行为（导出、审批、批量任务等）提升为 Intent.runtimeFlows；
  - 用 Flow DSL → Flow AST → Effect 程序 承载“行为层”的 SSoT；
  - 让平台和 LLM 能在行为层安全地生成、解释和重构逻辑。

目标：让 best-practice 在**行为层**对 Effect/Flow 友好，而不会要求所有日常 CRUD 都改成 Effect 风格。

## 2. 建议一：新增“行为层（Effect/Flow）”规范文档

在 best-practice 仓库中新增一篇规范，例如：

- 路径建议：
  - `/Users/yoyo/projj/git.imile.com/ux/best-practice/docs/02-principles-and-architecture/XX-effect-behavior-layer.md`
- 内容要点：
  - 定义“行为层”的范围：
    - 跨 Service / 跨 Store / 跨页面的流程；
    - 需要统一审计/监控/回放的复杂行为；
    - 需要由平台/LLM 长期维护的流程（出现在 Intent.runtimeFlows 中）。
  - 约定：
    - 对这类行为，推荐用 Effect 程序表达，而不是在组件或单一 Store 中散落 async 逻辑；
    - Flow DSL（在 IMD 仓库中定义）可作为声明层，Effect 程序作为实现层；
    - Effect 可以是 effect-ts，也可以是精简版 `Effect<R, E, A>`，但接口形状应与 Intent 规划对齐。
  - 文件/命名建议：
    - 为行为层引入统一的文件后缀，例如 `*.flow.ts`；
    - 这些文件只定义 Effect 工作流（不直接依赖 React），作为 Intent.runtimeFlows 对应的运行时实现载体。
  - 明确“不强制”：
    - 对普通 CRUD 行为，不强制使用 Flow/Effect；
    - 行为只有在“进入 Intent.runtimeFlows”时才需要考虑 Effect 化。

## 3. 建议二：为服务层补充 Effect 版签名（契约层）

在现有 API 集成与服务层指南的基础上，增加 Effect 视角的接口示例：

- 参考现有文档：
  - `/Users/yoyo/projj/git.imile.com/ux/best-practice/docs/03-development-guides/03-api-integration-guide.md`
  - `/Users/yoyo/projj/git.imile.com/ux/best-practice/docs/03-development-guides/11-adapter-pattern-guide.md`
- 补充内容：
  - 在服务层章节中，增加一节“Effect 版本接口示例”：
    - 例如：
      ```ts
      // 逻辑层行为
      type CreateOrderEffect = Effect<OrderEnv, CreateOrderError, OrderId>

      interface OrderWorkflowService {
        createOrder: (input: CreateOrderInput) => CreateOrderEffect
      }
      ```
  - 指明：
    - 这种 Effect 形式主要用于平台 pipeline、Flow 解释器和测试；
    - 业务组件可以通过简单 Hook 封装使用，不需要直接接触 Effect 类型。

这样可以在不破坏现有调用方式的前提下，为 Intent/Flow 层提供稳定的行为契约。

## 4. 建议三：在 rules-registry 中引入“行为层”标签

当前规则注册表位于：

- `/Users/yoyo/projj/git.imile.com/ux/best-practice/llms/01-rules-registry.yaml`

可以在 `catalog.tagDescription` 中新增一类标签，例如：

- `behavior-flow`：行为编排与 Flow/Effect 层规则；

并逐步为以下类型的规则补充或新增条目：

- 规则示例（构想）：
  - “复杂导出逻辑必须通过统一 Flow/Effect 层表达（禁止在多个组件中散落导出请求）”；
  - “跨多 Store 的状态变更（例如提交后清理多个 Slice）应通过行为层完成，而不是在组件中逐个调用 setXXX”；
  - “审批类流程的状态流转（同意/拒绝/转交）应抽象为 Effect 工作流，以便统一审计和回放”。

这样 LLM 在加载 rules-registry 时，就能识别哪些规则专门约束“行为层”。

## 5. 建议四：为 Flow/Effect 补充 snippet 与模板

在 best-practice 的 snippet/template 体系中，为行为层预留一些基础模板：

- 参考现有模板索引：
  - `/Users/yoyo/projj/git.imile.com/ux/best-practice/llms/03-templates.yaml`
- 新增模板方向：
  - Flow/Effect 工作流骨架：
    - 如“导出 Flow”的 Effect 模板；
    - “审批 Flow”的 Effect 模板；
  - Flow DSL → Hook 代码生成模板：
    - 将 FlowAst 生成 `useExportXxx` / `useApprovalAction` 等 Hook 的字符串片段；
  - 测试模板：
    - 为 Effect 工作流提供标准测试片段（注入 fake Env、断言调用顺序）。

这些模板可用于：

- 平台内在出码时复用；
- LLM 在生成/重构 Flow 相关代码时引用，避免“凭空+自由发挥”。

## 6. 建议五：落一个小范围试点场景

在 best-practice 中选择一个有代表性的场景做行为层 PoC，例如：

- “订单导出” 或 “费用审批操作”：
  - 现状：散落在多个组件/Store 的导出/审批逻辑；
  - 目标：
    1. 用 Flow DSL（在 IMD 仓库定义）描述行为；
    2. 在 best-practice 中为该 Flow 写一个 Effect 实现（工作流服务）；
    3. 更新规则/模板/snippets，让 LLM 可以：
       - 从 Flow DSL 生成 Effect 工作流草稿；
       - 从现有代码反向提取 Flow/Effect 草稿。

通过这一小范围试点，可以验证：

- Effect/Flow 行为层是否真的让行为更容易重构与解释；
- LLM 是否因为有了 Flow/Effect 契约，能在行为层做更可信的修改；
- 把这类行为纳入 Intent.runtimeFlows 是否值得在更多场景推广。

## 7. 渐进迁移策略（避免一次性重写）

为了避免对现有 best-practice 和业务项目造成过大冲击，建议：

1. **先文档，后代码**
   - 先在 docs/ 和 llms/ 中增加行为层规范、规则和模板索引；
   - 不立刻改动现有服务层实现。
2. **先 Flow/Effect PoC，后规范升级**
   - 在一两个场景（导出/审批）中实现 Flow + Effect 示范；
   - 根据实践结果调整行为层规范和规则。
3. **最后再考虑将更多服务/动作提升为 Effect-first**
   - 当行为层的价值在多个场景得到验证时，再逐步将更多服务/动作的“推荐形态”升级为 Effect-first；
   - CRUD 与轻量逻辑仍可保留 async/Hook 形式，不必强行统一。

通过这种渐进方式，best-practice 可以在不打断现有开发体验的前提下，  
为未来的 Intent/Flow/Effect 平台打好行为层的基础。
