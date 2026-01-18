---
title: 00 · Principles
status: living
---

# 平台原则（裁决入口）

> 本文件只收敛“会影响裁决口径”的原则入口，不替代详细阐述。
> 若调整原则，请先修改对应来源文档，再回写此索引。

## 结论（TL;DR）

平台裁决的是概念/模型/契约与闭环口径；实现细节留给 runtime 与实现备忘。

## 不变量（MUST）

- MUST 只在平台 SSoT 裁决“概念/模型/契约”，平台交互与视图体系留在 Workbench，实现备忘留在 impl/agents。  
  锚点：`foundation/00-overview.md`
- MUST 以「Spec → Contracts → Code → RunResult」闭环为裁决口径。  
  锚点：`foundation/00-overview.md`、`contracts/00-execution-model.md`
- MUST 贯彻 Intent First / Crystallization，而不是把平台当翻译器。  
  锚点：`governance/01-platform-manifesto.md`
- MUST 保障开发者主权（零锁定 / 随时逃逸 / 双向尊重）。  
  锚点：`governance/01-platform-manifesto.md`
- MUST 统一最小 IR 与证据链口径（Static IR + Dynamic Trace / 稳定锚点 / Slim 可序列化）。  
  锚点：`contracts/00-execution-model.md`、`contracts/01-runresult-trace-tape.md`
- MUST 区分 Static IR / Trace / Tape，不得混用；Tape 只在受控环境启用。  
  锚点：`contracts/02-time-travel.md`
- MUST 以 `tickSeq` 作为时间参考系，禁止影子时间线。  
  锚点：`contracts/02-time-travel.md`、`contracts/00-execution-model.md`
- MUST 明确 Live 仅支持只读回放；Replay/Fork 需以 Tape 驱动环境为 oracle。  
  锚点：`contracts/02-time-travel.md`、`foundation/00-overview.md`
- MUST 遵循 forward-only 演进策略；breaking 变更需同步 SSoT 与对外交付叙事。  
  锚点：`governance/00-evolution-policy.md`

## 指导性约束（SHOULD）

- SHOULD 以 UI / Logic / Module 三位一体模型组织概念与资产。  
  锚点：`foundation/03-trinity-and-layers.md`
- SHOULD 保持 Runtime Agnostic，意图模型不绑定具体技术栈。  
  锚点：`governance/01-platform-manifesto.md`
- SHOULD 以“架构即视图”约束可解析子集：Parser 只识别 Module + `$.use` + Fluent DSL，其余降级为 Gray/Black。  
  锚点：`ir/00-codegen-and-parser.md`

## 原则入口（裁决锚点）

- Intent 优先 / 结晶而非翻译：`governance/01-platform-manifesto.md`
- 三位一体模型（UI / Logic / Module）：`foundation/03-trinity-and-layers.md`
- Spec → Contracts → Code → RunResult 的闭环口径：`foundation/00-overview.md`、`contracts/00-execution-model.md`
- RunResult / Trace / Tape 与锚点：`contracts/01-runresult-trace-tape.md`
- 时间旅行与 Tape 口径：`contracts/02-time-travel.md`
- 全双工解析边界与锚点系统：`ir/00-codegen-and-parser.md`
- 运行时无关（平台不写实现细节）：`governance/01-platform-manifesto.md`
- forward-only 演进策略：`governance/00-evolution-policy.md`

## 背景与证据（非裁决来源）

- 设计哲学与价值判断：`docs/philosophy/**`（尤其 `04-developer-sovereignty.md`、`05-architecture-as-view.md`）
- 实现评审与差距清单：`docs/reviews/**`（尤其 `08-philosophy-alignment.md`）
