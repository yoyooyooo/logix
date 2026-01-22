---
title: 长链路实现笔记 · H｜宿主生命周期（ProgramRunner / Host Plane）
status: draft
version: 1
---

# 长链路实现笔记 · H｜宿主生命周期（ProgramRunner / Host Plane）

> **主产物**：把 Runtime 作为“可资源化的程序”运行：boot → main(ctx,args) → dispose，并统一处理 signals/exit code/错误上报。
>
> **一句话**：不要在业务里手写 `ManagedRuntime.make + runPromise + try/finally`；统一走 ProgramRunner 才能可交接、可测试、可诊断。

## 目录

- 1. 三跳入口（public → internal → tests）
- 2. openProgram / runProgram 的契约
- 3. signals / exit code / closeScopeTimeout
- 4. Runtime.onError 与错误分类
- 5. auggie 查询模板

## 1) 三跳入口（public → internal → tests）

- **public**
  - `packages/logix-core/src/Runtime.ts`（`openProgram` / `runProgram`）
- **internal**
  - `packages/logix-core/src/internal/runtime/core/runner/ProgramRunner.ts`
  - 相关模块：`packages/logix-core/src/internal/runtime/core/runner/ProgramRunner.errors.ts`、`ProgramRunner.signals.ts`、`ProgramRunner.exitCode.ts`
- **tests**
  - `packages/logix-core/test/Runtime/Runtime.runProgram.basic.test.ts`
  - `packages/logix-core/test/Runtime/Runtime.runProgram.signals.test.ts`
  - `packages/logix-core/test/Runtime/Runtime.runProgram.disposeTimeout.test.ts`

## 2) openProgram / runProgram 的契约

- **openProgram（资源化）**
  - 返回 scope-bound 的 `ProgramRunContext`（boot 已完成，可立即交互）。
  - 由调用方决定什么时候 close scope（适合 REPL/长驻进程/集成测试）。
- **runProgram（一次性）**
  - 封装“启动 → 执行 main → 释放”，并提供 CLI 友好的选项（args/exitCode/reportError 等）。

## 3) signals / exit code / closeScopeTimeout

这三件事决定了“是否可交接”：

- **signals**：统一处理 SIGINT/SIGTERM 等，避免业务层散落信号监听。
- **exit code**：把错误分类映射为稳定 exit code（CI/脚本可依赖）。
- **closeScopeTimeout**：避免 dispose 卡死；超时要有明确错误类型（便于上报与回归）。

## 4) Runtime.onError 与错误分类

不要把所有错误都当成一个 `Error`：

- 预期错误 vs 未捕获错误 vs interrupt；
- 是否需要 reportError（一次性程序 vs devtools 交互）；
- Runtime options.onError 是“App 级统一上报口”，不要绕过它。

## 5) auggie 查询模板

- “`ProgramRunner.openProgram` 如何组织 boot？`ProgramRunContext` 里有哪些关键资源？”
- “signals 处理发生在哪？如何做到可选开启且不泄漏监听器？”
- “exit code 的分类规则在哪？哪些错误会映射为非 0？”
- “closeScopeTimeout 超时时抛什么错误？如何保证最终不会挂死？”
- “Runtime.onError 在哪里被调用？哪些错误会被过滤/分类？”
