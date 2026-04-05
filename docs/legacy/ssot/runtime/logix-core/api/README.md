# `@logixjs/core` · API 规范（渐进式披露）

> **定位**：对外 API 的 SSoT（业务/库作者必读）。内部实现细节不在这里展开。

## 建议阅读顺序

1. `02-module-and-logic-api.md`：Module-first 编程模型与 `$` 总览
2. `03-logic-and-flow.md`：Fluent DSL / Flow / 结构化控制流（Effect.\* + `$.match`）的组合方式与边界
3. `04-logic-middleware.md`：Logic Middleware（与 EffectOp 总线的职责边界）
4. `05-runtime-and-runner.md`：Runtime 与 Program Runner（openProgram/runProgram 的统一表面积）
5. `06-reflection-and-trial-run.md`：Reflection / Manifest / StaticIR / Trial Run（IR/证据提取）
6. `07-ir-pipeline-from-irpage.md`：从 `IrPage` 反推 IR 全链路（字段语义 + sandbox 传输）

## 深挖落点（代码）

- 公共出口：`packages/logix-core/src/index.ts`
- Bound API：`packages/logix-core/src/Bound.ts`、`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`
- Flow：`packages/logix-core/src/Flow.ts`、`packages/logix-core/src/internal/runtime/core/FlowRuntime.ts`
- ExternalStore：`packages/logix-core/src/ExternalStore.ts`
- StateTrait：`packages/logix-core/src/StateTrait.ts`（含 `StateTrait.externalStore`）
- Program Runner：`packages/logix-core/src/Runtime.ts`、`packages/logix-core/src/internal/runtime/ProgramRunner*.ts`（薄 re-export）、`packages/logix-core/src/internal/runtime/core/runner/*`（实现内核）
- Reflection：`packages/logix-core/src/Reflection.ts`、`packages/logix-core/src/internal/reflection/*`
- Trial Run：`packages/logix-core/src/internal/observability/trialRunModule.ts`
