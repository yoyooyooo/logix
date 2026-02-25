---
title: Builder SDK 手册（白盒子集与降级边界）
---

# Builder SDK 手册（白盒子集与降级边界）

## 0) 适用场景

- 你在做 Parser / Codegen / 静态分析。
- 你要判断某段 Logic/Flow 是否可被平台稳定解析。
- 你要避免把 Builder 做成第二套 runtime。

## 1) 一句话裁决

Builder 只做“静态读取 + 结构化产物”，不执行业务语义；运行语义始终由 Logix Runtime 负责。

## 2) Parser 的白盒子集（必须遵守）

1. 触发 API 分拆：`$.onState` / `$.onAction` / `$.on(stream)`。
2. 跨模块句柄边界：`$.use(...)` 句柄仅 `read/changes/dispatch`，不允许跨模块直接写 state。
3. Fluent 白盒链必须是单语句直接调用；拆成中间变量后视为 Raw/黑盒。

> 若目标项目有 parser 约束文档，请在 `references/llms/99-project-anchor-template.md` 中登记。

## 3) Builder 工作流（最小闭环）

1. 解析导入与符号别名。
2. 识别模块边界与触发源。
3. 将白盒规则映射到静态结构（节点/边/锚点）。
4. 对不可解析片段显式降级并保留 sourceKey。
5. 交给 codegen 生成可维护产物。

## 4) 降级策略（Raw/黑盒）

- 不可解析 != 失败；但必须显式标记。
- 每个降级片段必须有稳定标识与原因码（便于 Devtools/审计/回放解释）。
- 禁止“默默吞掉”不可解析规则。

## 5) Codegen 约束

- 对外构造语义沿用 `*.make`，不回退到 `*.define`。
- 生成产物必须能对齐统一最小 IR（Static IR + Dynamic Trace）。
- 禁止引入“builder 专用运行时语义”作为并行真相源。

## 6) 验收清单

- 同输入在同版本下生成结果稳定（digest 可比）。
- 失败路径可定位到输入与规则位置。
- 黑盒降级可解释（有锚点、有原因）。
- 生成代码不破坏 runtime 现有语义与诊断链路。

## 7) 延伸阅读（Skill 内）

- `references/llms/01-core-glossary.md`
- `references/llms/08-builder-ir-basics.md`
- `references/llms/06-diagnostics-perf-basics.md`
- `references/llms/99-project-anchor-template.md`（可选）
