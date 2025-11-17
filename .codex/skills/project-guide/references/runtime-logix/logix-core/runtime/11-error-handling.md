# 错误处理模型（Error Handling Model）

> **Status**: Draft（Effect-Native）  
> **Date**: 2025-12-16  
> **Layer**: Runtime Contract

本页是 Logix Runtime 的错误处理 SSoT：定义错误分类、默认传播语义、以及“全局 → 模块 → 局部”的组合方式。目标是让业务作者、平台适配层与运行时维护者对同一类失败有一致心智模型，并避免把“取消/诊断提示/装配失败”混成一类。

## 0. 结论（先记住这 5 类）

Logix 将失败拆成 5 类（分类是契约的一部分）：

1. **预期错误（Expected / Typed Error）**：业务可预期、可恢复；在 Effect 错误通道 `E` 中表达并在局部处理。
2. **缺陷（Defect）**：代码 bug / 不可恢复系统错误；通常来自 `die/throw` 或未处理异常；需要模块与全局做“最后上报”。
3. **装配失败（Resolution / Assembly Error）**：依赖解析缺失提供者、Tag 冲突等；属于配置错误，必须稳定失败并给出可修复提示。
4. **中断/取消（Interrupt / Cancel）**：并发语义或 Scope 结束导致的中断；不是错误，不应进入错误兜底链路。
5. **诊断提示（Diagnostic）**：运行时给出的结构化提示（phase guard、reducer 时序等）；用于解释与修复，不替代错误通道。

## 1. 分类与默认处理矩阵

| 类别      | 典型来源                                                    | 对外表现                                   | 默认影响                            | 推荐处理层级                                                           |
| --------- | ----------------------------------------------------------- | ------------------------------------------ | ----------------------------------- | ---------------------------------------------------------------------- |
| 预期错误  | `Effect.fail(E)` / `Effect.tryPromise` 映射到领域错误       | 仍在当前流程内传播（可被 `catch*` 捕获）   | 不应终止模块实例                    | **局部**：Flow/Task/Handler 内捕获并转为状态/返回值                    |
| 缺陷      | `Effect.die`、throw、Promise reject 作为 defect             | 进入“未处理失败”链路，并产生可观测错误事件 | 可能终止当前逻辑/实例（视运行语义） | **模块**：`$.lifecycle.onError` 最后上报；**全局**：DebugSink/上报系统 |
| 装配失败  | `$.use` / `Root.resolve` / imports-scope 缺失、TagCollision | 同步抛出/稳定失败（带修复建议）            | 阻止目标能力可用（应尽早失败）      | **全局/入口**：修复装配；不应在业务流程里兜底吞掉                      |
| 中断/取消 | `runLatest` 取消旧任务、Scope.close、Fiber interrupt        | 不视为错误；允许静默结束                   | 不应触发错误兜底或高严重诊断        | **局部**：必要时识别并停止写回；**运行时**：保证不误报                 |
| 诊断提示  | phase guard、reducer late/duplicate、missing onError 等     | `DebugSink` 的 `diagnostic` 事件           | 不改变业务语义（仅提示）            | **全局**：Devtools/日志展示；**模块**：按提示修复写法                  |

> 说明：诊断提示（`diagnostic`）与错误事件（例如 `lifecycle:error`）是两条不同通道；诊断用于解释与引导，不作为错误处理的替代品。

## 2. “全局 → 模块 → 局部”的处理模式

### 2.1 局部（Local）：把预期错误留在 `E` 通道

约定：

- 任何“业务上可恢复”的失败都 SHOULD 表达为 typed error，并在局部用 `catchTag/catchAll` 转换为状态更新或用户可见结果。
- 不要依赖 `try/catch` 把未知异常吞掉；缺陷应让其进入缺陷链路，并通过模块/全局统一上报。

### 2.2 模块（Module）：`$.lifecycle.onError` 作为最后上报

约定：

- `$.lifecycle.onError` 只用于 **Last-breath reporting**：记录日志、上报监控、清理“必须显式结束”的资源。
- 它不用于恢复业务流程；预期错误的恢复应在局部完成。
- 推荐在 Logic builder 顶部尽早注册（避免缺失处理器导致诊断提示）。

### 2.3 全局（Global）：统一接入日志/监控/Devtools

全局层通常承担两类职责：

- **观测**：通过 DebugSink 收集 `lifecycle:error` / `diagnostic` 等事件（Devtools、日志、证据包）。
- **上报**：把“未处理缺陷/装配失败”接入外部告警或监控系统（例如统一 error reporter）。

实践建议：

- 使用 `Logix.Debug.layer(...)` 选择默认调试策略（dev/prod/off），或替换为自定义 Sink 将事件接入你的日志/监控系统。
- `Runtime.make(..., { onError })` 提供全局兜底入口：用于 Root processes 的未处理失败兜底，并作为“模块未处理失败”的最后上报桥（仍以 DebugSink 事件作为可观测事实源）。

### 2.4 反例（Anti-patterns）

- **把预期错误当缺陷处理**：用 `Effect.die/throw` 表达业务失败，会导致错误上报链路噪音飙升，也会让调用方无法在 `E` 通道做精确恢复。
- **用 `$.lifecycle.onError` 做业务恢复**：`onError` 仅用于最后上报/兜底清理；业务恢复应在局部 `catch*` 内完成。
- **把取消当错误上报**：任务取消/Scope 关闭导致的 interrupt 不应触发错误告警；如需分支处理，基于 `Cause.isInterrupted` 在局部识别并提前结束写回。

## 3. 装配失败（Resolution Errors）的最低契约

装配失败属于“尽早失败”的配置错误，必须满足：

- `error.name` 稳定；
- dev/test 环境下包含：请求 token、发生位置（entrypoint）、语义模式（mode）、起点 scope（startScope）与至少两条可执行修复建议（fix）。

典型错误集合与排查入口见 [`09-debugging.md`](../observability/09-debugging.md) 的 “解析失败（Resolution Errors）”。

## 4. 中断/取消（Interrupt/Cancel）语义

中断不是错误：

- 并发语义（例如 latest）取消旧任务时，不应触发错误兜底链路；
- Scope 结束导致 fiber 中断时，不应被当作缺陷上报；
- 如需在局部区分取消与失败，推荐基于 `Cause.isInterrupted` 做分支，并避免在取消路径写回状态。

## 5. 与生命周期升级的对齐

本页定义的分类与处理层级是生命周期升级的一部分：生命周期任务（init/start/destroy/platform-signal）中的未处理失败必须进入同一条“错误兜底 + 诊断”链路，同时必须保持“取消不误报、装配不吞掉、诊断不替代错误”的不变量。
