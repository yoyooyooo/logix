---
title: 00 · Principles
status: living
---

# 运行时原则（裁决入口）

> 本文件聚合运行时层面的“原则裁决入口”，不替代详细说明。
> 若修改原则，请先更新来源文档，再回写此索引。

## 结论（TL;DR）

运行时只裁决执行语义、诊断口径与证据链；平台概念与术语以 `docs/ssot/platform/**` 为准。

## 不变量（MUST）

- MUST 以 Effect-TS 作为执行内核，业务逻辑以 Effect 表达。  
  锚点：`logix-core/concepts/00-manifesto.md`
- MUST 以声明式编排替代过程式散落逻辑。  
  锚点：`logix-core/concepts/00-manifesto.md`
- MUST 与 UI 框架解耦，UI 不编排业务副作用。  
  锚点：`logix-core/concepts/00-manifesto.md`
- MUST 保持 Module / Logic / Live 的三位一体分工，`$` 是业务逻辑与运行时之间的唯一入口。  
  锚点：`logix-core/api/02-module-and-logic-api.00-quick-overview.md`
- MUST 以 Logix 作为唯一状态与逻辑运行时，禁止引入第二套核心状态机。  
  锚点：`logix-core/concepts/00-manifesto.md`
- MUST 通过 EffectOp 总线与中间件栈收口边界执行，守卫不可被绕过。  
  锚点：`logix-core/api/04-logic-middleware.md`
- MUST 遵循事务窗禁止 IO/等待的执行口径，副作用只能在事务外发生。  
  锚点：`docs/ssot/platform/contracts/00-execution-model.md`
- MUST 保证 Program 可导出 IR，并与 Static IR + Dynamic Trace 对齐。  
  锚点：`docs/ssot/platform/contracts/00-execution-model.md`、`docs/ssot/platform/ir/00-codegen-and-parser.md`
- MUST 采用稳定锚点与 Slim 可序列化证据链，避免随机标识与不可回放事件。  
  锚点：`docs/ssot/platform/contracts/01-runresult-trace-tape.md`
- MUST 将业务必达与诊断可降级通道物理隔离。  
  锚点：`docs/ssot/platform/contracts/00-execution-model.md`

## 指导性约束（SHOULD）

- SHOULD 将逻辑拆分为多个 Logic 单元并组合挂载。  
  锚点：`logix-core/guides/08-usage-guidelines.md`
- SHOULD 把业务逻辑视为事件流的变换。  
  锚点：`logix-core/guides/08-usage-guidelines.md`
- SHOULD 采用信号驱动：UI 只 emit signal，Logic 只 listen signal。  
  锚点：`docs/ssot/platform/foundation/03-trinity-and-layers.md`
- SHOULD 为时间旅行交互提供最小证据与锚点（多轨时间轴/状态透视/回滚-重放-分叉）。  
  锚点：`docs/ssot/platform/contracts/02-time-travel.md`、`docs/ssot/platform/contracts/01-runresult-trace-tape.md`

## 原则入口（裁决锚点）

- Logix Engine 宣言与核心原则：`logix-core/concepts/00-manifesto.md`
- Trinity + `$` 总览：`logix-core/api/02-module-and-logic-api.00-quick-overview.md`
- Explicit Composition（显式组合）：`logix-core/api/04-logic-middleware.md`
- 业务逻辑组织与使用原则：`logix-core/guides/08-usage-guidelines.md`
- 运行时执行模型与不变量：`logix-core/runtime/README.md`
- 执行模型 / RunResult 锚点：`docs/ssot/platform/contracts/00-execution-model.md`、`docs/ssot/platform/contracts/01-runresult-trace-tape.md`
- 时间旅行交互口径：`docs/ssot/platform/contracts/02-time-travel.md`

## 背景与证据（非裁决来源）

- 设计哲学与价值判断：`docs/philosophy/**`（尤其 `01-safeguarding-ai-maintainability.md`、`03-logic-first-ui-agnostic.md`、`07-runtime-trinity-and-effect-native.md`）
- 实现评审与差距清单：`docs/reviews/**`（尤其 `08-philosophy-alignment.md`）
