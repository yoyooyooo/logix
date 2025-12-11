---
title: Runtime Middleware & EffectOp · 概览
status: draft
version: 0.1.0
value: core
priority: now
related:
  - ../runtime-observability/README.md
  - ../runtime-readiness/README.md
  - ../../runtime-logix/core/03-logic-and-flow.md
  - ../../runtime-logix/core/04-logic-middleware.md
  - ../../runtime-logix/core/09-debugging.md
---

# Runtime Middleware & EffectOp · 概览

> 主题定位：本 Topic 聚焦 **Logix Runtime 的中间件总线与边界模型**，以 `EffectOp` 为核心抽象，统一 Action / Flow / State / Lifecycle / CrossModule / Service 六类边界上的拦截与观测能力。
> 目标：在不依赖历史实现的前提下，抽象出一套 **Effect‑Native、角色清晰、可长期演进** 的 Runtime 中间件设计，为后续 v3/v4 规范与实现提供骨架。

## 1. 范围（Scope）

本主题收敛以下方向的草案与规范：

- Runtime 层的统一中间件模型  
  - `EffectOp` / `EffectOpMeta` 抽象：将各种边界上的一次逻辑执行统一视为“Effect 操作”；  
  - 单一 `Middleware` 接口：一套签名走天下，支持组合与分层封装；  
  - Observer / Runner / Guard 三种“角色”的语义约束与行为边界。
- 边界模型与用户价值  
  - 六类 Runtime 边界：Action / Flow / State / Lifecycle / CrossModule / Service；  
  - 每个边界上 Observer / Runner / Guard 可以做什么、不该做什么；  
  - 从业务开发者视角，“包一层”之后能获得的观测、策略与安全价值。
- 注册与配置体系  
  - Runtime 级（应用级）默认配置：全局 Observer / Runner / Guard registry；  
  - Module 级元数据：声明模块希望使用的策略/观测/守卫组；  
  - Flow / Intent / Service 级精细 override：局部关闭/增强某些中间件。
- 与其他能力的关系  
  - 与 Runtime Observability Topic 的边界：DebugSink / TraceBus 作为 Observer 的具体实现；  
  - 与 Runtime Readiness Topic 的协同：Runner / Guard 在可靠性与合规要求中的角色；  
  - 与 `runtime-logix/core/*` 规范的映射路径：如何从本 Topic 的草案反推 v3/v4 的正式 API。

不在本 Topic 的范围内：

- 具体的 DevTools / Studio UI 形态（时间线、Galaxy 图、Console 等），这些放在 `devtools-and-studio`；  
- 具体某个业务域的 Policy 规则内容（例如订单风控策略），这里只定义 Guard 的挂载方式与接口；  
- 旧有 `Logic.secure` 等 API 的迁移细节——它们会在后续整理中被“收口”到本 Topic 提供的统一骨架之下。

## 2. 核心思路概览

围绕本主题的核心判断：

1. **一根总线：EffectOp + Middleware**  
   - 所有 Runtime 边界上的“一次逻辑执行”（包含上下文）统一建模为 `EffectOp<A, E, R>`；  
   - 所有拦截与包装通过单一 `Middleware<A, E, R>` 接口实现，再由 `composeMiddleware` 组合；  
   - Observer / Runner / Guard 仅是三类“语义角色”，在实现层都降级为 `Middleware`。

2. **三类角色：只观测 / 改怎么跑 / 改能不能跑**  
   - Observer：只读 `EffectOp`，不可改变业务语义，只负责日志、埋点、trace、Debug 事件等；  
   - Runner：可以改变“何时/跑几次/按什么节奏执行”，但单次执行语义等价（节流、防抖、重试、并发策略）；  
   - Guard：可以决定允许/拒绝/改写，属于 Domain/Policy 的一部分，只挂在约定的策略边界。

3. **多层注册：Runtime → Module → Flow/Intent/Service**  
   - RuntimeConfig：按边界类型声明全局默认的 Observer / Runner / Guard 集合与 registry；  
   - ModuleMeta：模块只声明“策略/观测/守卫组”的名字，不直接绑定函数，便于平台和 Codegen 使用；  
   - FlowOptions / Intent / Service 定义：精细声明某一条逻辑的特殊策略或例外，覆盖上层默认。

4. **Effect‑Native：依托 Effect/Core 能力而不是绕行**  
   - 中间件本质是 `(EffectOp, next) => Effect` 的 Effect 变换，而不是外部调用约定；  
   - 观测类能力优先用 Tracer / Supervisor / FiberRef / Debug 事件流集成；  
   - 运行策略与 Guard 多通过 Tag+Layer 的 Service 组合，而非魔法全局变量。

## 3. 与其他 Topic / 规范的关系

- `topics/runtime-observability`  
  - 该 Topic 关注“TraceBus / DebugSink / Observability 插件”；  
  - 本 Topic 提供统一的 `EffectOp` 事件模型和中间件总线，供 Observability 能力作为 Observer 附着；  
  - DebugSink 被重新定位为“订阅 EffectOp 事件流的 Observer 族群”，而不是零散的 ad‑hoc 日志。

- `topics/runtime-readiness`  
  - Runner / Guard 在可靠性（重试/超时/熔断/并发池）与合规（环境隔离、配额、风控）中扮演核心角色；  
  - 本 Topic 只定义 Runner/Guard 的边界与挂载点，具体策略可在 Runtime Readiness 中展开。

- `docs/specs/runtime-logix/core/*`  
  - 本 Topic 中的 `EffectOp` / `Middleware` / 边界枚举应成为后续 `runtime-logix/core/04-logic-middleware.md` 等规范的设计输入；  
  - v3/v4 的 `BoundApi` / Flow / Lifecycle / Service API 都应在“边界包装层”上统一调用本 Topic 定义的总线，而不是各自造轮子。

## 4. 计划文档

本 Topic 预期包含以下草案（当前仅部分存在，后续按需拆分）：

- `01-effectop-middleware-blueprint.md`（本次新增）：  
  - 定义 `EffectOp` / `EffectOpMeta` / `Middleware` 内核接口；  
  - 梳理 Observer / Runner / Guard 三类角色及其行为约束；  
  - 枚举六类边界（Action / Flow / State / Lifecycle / CrossModule / Service）上的使用方式与用户价值；  
  - 描述 Runtime / Module / Flow 三级注册与拼装流程；  
  - 记录与 DebugSink / Observability Topic 的衔接点与迁移思路。

- `02-devtools-and-persist-example.md`：  
  - 对标 zustand 的 `devtools(persist(f))` 组合中间件，给出在 EffectOp 总线下的组合方案；  
  - 演示如何用 Observer/Runner 拆分 devtools 与 persist 能力，并在 RuntimeConfig / ModuleMeta 中挂载；  
  - 验证“同一中间件在多个 Module 上注册”时的行为语义与 DX 形态。

后续可能补充：

- `02-middleware-config-and-registry.md`：RuntimeConfig / ModuleMeta / FlowOptions 的配置模型与示例；  
- `03-migration-from-legacy-secure-and-debugsink.md`：如何将旧有 `Logic.secure` / DebugSink 实现迁移到 `EffectOp` 总线；  
- `04-advanced-boundaries-and-performance.md`：复杂边界组合（如多 Runtime / 多租户）与性能考量。

本 Topic 当前状态仍为 **draft / active**，未来可将稳定结论前移至：

- `docs/specs/runtime-logix/core/04-logic-middleware.md`（核心规范）；  
- `docs/specs/runtime-logix/impl/README.md`（实现约束备忘）；  
- `apps/docs` 中面向使用者的“中间件与观测”章节。
