---
title: PoC · Intent → Pattern → Plan → Code 管线骨架
status: draft
---

> 本目录下的 TypeScript 文件是一个“概念验证级”的代码骨架，演示如何在 Node 环境下实现：
>
> Intent (意图资产) → Pattern (模式定义) → Template Meta (模板元数据) → Generation Plan (出码计划) → 执行修改代码
>
> 这些文件不依赖具体框架，只用伪 `Effect<R, E, A>` 类型表达“可组合的工作流”，方便后续替换为任意 Effect 实现或普通 async 函数。

文件一览：

- `effect.ts`：简化版 Effect 类型与运行器占位符。
- `model/intent.ts`：Intent 类型与读写骨架。
- `model/pattern.ts`：Pattern 类型与匹配函数骨架。
- `model/template.ts`：Template Meta 类型。
- `services.ts`：文件系统、模板仓库、代码生成、日志等“能力服务”的接口。
- `planning.ts`：`buildPlan(intentId)` 的骨架，实现从 Intent+Pattern+Template 到 Plan。
- `execution.ts`：`executePlan(plan)` 的骨架，实现根据 Plan 实际生成/修改代码。
- `cli.ts`：一个极简 CLI/脚本入口，串起 `buildPlan` 和 `executePlan`。

## 快速体验（PoC）

当前 PoC 的行为非常刻意简化，仅用于验证“Intent → Plan → 执行”链路是否贯通：

- `planning.ts` 中的 `buildPlan`：
  - 从 `intents/<id>.intent.yaml` 加载 Intent；
  - 遍历 `intent.patterns` 列表；
  - 为每个模式生成一个占位 `PlanAction`，目标路径形如：
    - `src/features/<intent-id>/<pattern-id>.generated.txt`
  - `params` 来自该模式在 Intent 中的 `config` 字段。
- `execution.ts` 中的 `executePlan`：
  - 对每个 `PlanAction` 调用 `CodeGen.generate(templateId, params)`；
  - 将生成内容写入文件系统（当前 dummy 实现写到 `.generated/` 下）。
- `cli.ts`：
  - 读取命令行参数中的 `intentId`（例如 `order-management`）；
  - 依次调用 `buildPlan` 和 `executePlan`。

示例（伪命令）：

```bash
cd docs/specs/intent-driven-ai-coding/v1/poc
# 使用 ts-node / tsx 等运行 cli.ts，例如：
# ts-node cli.ts order-management
#
# 运行后会在 .generated/ 或 src/features/<intent-id>/ 下看到若干 *.generated.txt 占位文件，
# 用于验证 Intent.patterns 是否已被成功转化为 Plan 并应用。
```

后续 v2 演进方向：

- 将 PatternRepo/TemplateRepo 接入真实的 `patterns/*.pattern.yaml` 与 `templates/*.template.yaml`；
- 用 TemplateMeta 中的 implements.roles 和 Intent 信息推导出真正的文件路径；
- 将 dummy CodeGen 替换为基于 best-practice snippets/模板的代码生成，实现从 Intent 生成 React/Zustand/Service 骨架。

