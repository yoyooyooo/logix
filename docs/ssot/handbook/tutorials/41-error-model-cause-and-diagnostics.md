---
title: 错误语义教程 · Cause / SerializableErrorSummary / 诊断投影（从 0 到 1）
status: draft
version: 1
---

# 错误语义教程 · Cause / SerializableErrorSummary / 诊断投影（从 0 到 1）

> **定位**：本文讲清楚 Logix 运行时里“错误如何被表达、如何被投影到 Slim 证据、如何被平台/Devtools 消费”。  
> 核心结论：**错误对象（Error/Cause）不是证据工件**；证据里只能出现 `SerializableErrorSummary` 这种 Slim、可序列化、可预算裁剪的结构。  
> **裁决来源**：错误分类的 SSoT 在 `docs/ssot/runtime/logix-core/runtime/11-error-handling.md`；本文补充实现链路与剧本集。

## 0. 最短阅读路径（10 分钟上手）

1. 读错误分类：`docs/ssot/runtime/logix-core/runtime/11-error-handling.md`（typed error/defect/装配失败/取消/诊断）。  
2. 读「2.1 `toSerializableErrorSummary`」：为什么必须把 Cause/Error 投影成 summary。  
3. 读「2.3 TrialRun 的错误编码（code+hint）」：平台/CI 如何获得可行动提示。  
4. 最后读「3.1/3.2」：两种最常见的坑（把业务错误当 defect、把 Error 塞进事件）。

## 1. 心智模型（为什么 Error 不能直接进入证据）

### 1.1 证据工件的硬约束：必须 JSON 可序列化、Slim、有预算

无论是 EvidencePackage、TrialRunReport 还是 ProcessEvent：

- 都可能跨线程/跨进程/跨机器传输；  
- 必须可 JSON 序列化（不能携带闭包、Error 实例、循环引用）；  
- 必须可裁剪（预算超限要可解释降级）。  

因此“错误证据”只能是最小摘要，而不能是原始 Error/Cause。

### 1.2 Cause 是 Effect 的事实形态；summary 是平台/证据的事实形态

在 Effect v3 里，失败常见形态是 `Cause.Cause<unknown>`：

- 它可以表达 fail/die/interrupt 的结构；  
- 但它不是 JSON-safe，也不是 UI 友好。  

证据链路需要的是：

- 可展示：message/name/code/hint  
- 可门禁：稳定 code（例如 TrialRunReport.error.code）  
- 可对比：同类失败能聚合统计（而不是靠日志全文）

所以我们需要 `SerializableErrorSummary`。

## 2. 核心链路（从 0 到 1：Cause → summary → 证据/诊断）

### 2.1 `toSerializableErrorSummary(cause)`：把任何失败投影成 Slim 摘要

事实源：`packages/logix-core/src/internal/runtime/core/errorSummary.ts`

输出结构：

- `errorSummary: { message, name?, code?, hint? }`
- `downgrade?: 'non_serializable' | 'oversized' | 'unknown'`

关键策略：

- 先从 `Error.message` / `name` / 常见字段提取；  
- best-effort 使用 `Cause.pretty`（但仍视为不可信字符串，必须截断）；  
- 默认 `maxMessageLength=256`，超长会截断并标记 `oversized`；  
- 原始 cause 若不可 JSON.stringify，会标记 `non_serializable`（显式化不确定性）。

### 2.2 Process 事件里的错误：必须是 SerializableErrorSummary

事实源：`packages/logix-core/src/internal/runtime/core/process/protocol.ts`

`ProcessEvent.error` 与 `ProcessInstanceStatus.lastError` 都是 `SerializableErrorSummary`：

- 这是为了保证 Process 诊断事件可导出、可展示、可回放（不携带 Error 实例）。

### 2.3 TrialRunReport 的错误：在 summary 基础上叠加 `code + hint`

事实源：`packages/logix-core/src/internal/observability/trialRunModule.ts`

TrialRun 的错误不仅要“可读”，还要“可行动”，所以会把错误归类为稳定 code：

- `MissingDependency`（缺失 services/configKeys）  
- `TrialRunTimeout`（装配/启动阻塞）  
- `DisposeTimeout`（资源/纤程未收束）  
- `Oversized`（报告体积超限）  
- `RuntimeFailure`（兜底）

实现上用 `toErrorSummaryWithCode(base, code, hint?)`：

- `base` 来自 `toSerializableErrorSummary(cause).errorSummary`  
- `code/hint` 由 TrialRun 的错误分类逻辑补充（对齐 SSoT 的错误分类与修复建议）

> 直觉：`code` 是机器门禁用的稳定枚举；`hint` 是人类/LLM 用的可行动提示。

## 3. 剧本集（用例驱动）

### 3.1 剧本 A：我把业务失败写成 throw，为什么在证据里变成 defect 噪音

原因：

- `throw`/Promise reject 走 defect；  
- typed error（预期错误）应该走 `Effect.fail(E)` 或 `Effect.tryPromise(...catch...)`。

修复：

- 把 IO 边界的 reject 映射为领域错误 `E`；  
- 局部捕获并转为状态/返回值；  
- 让 defect 留给真正 bug（并由 onError/DebugSink 做最后上报）。

参见：`docs/ssot/runtime/logix-core/runtime/11-error-handling.md`。

### 3.2 剧本 B：我想把 Error 原样塞进 Debug/Event meta，为什么被裁剪或导出失败

原因：

- Error 实例不可 JSON 序列化，且大小不可控；  
- Slim 投影会丢弃 non-serializable/oversized 字段，并标记 downgrade。

正确做法：

- 事件里只放 `SerializableErrorSummary`（message/name/code/hint）  
- 如需更多上下文：用稳定锚点（moduleId/instanceId/txnSeq/opSeq/stepKey）指回静态结构与源码锚点；  
- 不把 stack/原始对象当作证据工件（需要时走本地日志或受控抓取）。

### 3.3 剧本 C：TrialRun 报 `MissingDependency`，我应该如何让错误“更可修复”

TrialRun 已提供两条强信号：

- `environment.missingServices/missingConfigKeys`：缺失清单  
- `error.code + hint`：稳定分类与修复建议

你的修复动作通常是：

- 在 trial-run 的 `options.layer` 注入 mock 实现；或  
- 把依赖访问从 build-time 移到 runtime（避免装配期硬依赖）；或  
- 给 Config 加默认值/补齐 buildEnv.config。

## 4. 代码锚点（Code Anchors）

1. `docs/ssot/runtime/logix-core/runtime/11-error-handling.md`：错误分类与默认处理矩阵（SSoT）。  
2. `packages/logix-core/src/internal/runtime/core/errorSummary.ts`：`toSerializableErrorSummary`（Slim 错误摘要）。  
3. `packages/logix-core/src/internal/observability/trialRunModule.ts`：TrialRun 错误分类（code+hint）与报告裁剪。  
4. `packages/logix-core/src/internal/runtime/core/process/protocol.ts`：ProcessEvent/Status 的错误字段契约。  

## 5. 验证方式（Evidence）

最小验证建议：

- 任何进入证据/事件的错误字段都能 JSON.stringify（并且 message 长度受控）。  
- TrialRun 的 `error.code` 能稳定分类（缺依赖/超时/收束失败/超限/兜底）。  
- downgrade 发生时可解释（non_serializable/oversized/unknown 不能 silent）。  

## 6. 常见坑（Anti-patterns）

- 把 Error/Cause 实例当作证据工件直接导出。  
- 把 stack 当合同字段（会过大且不稳定）。  
- 缺少稳定 code：只有 message 会让平台/CI 无法门禁与聚合。  
- 让取消/interrupt 走错误上报链路（会造成告警噪音）。  
