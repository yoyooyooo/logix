---
title: 北极星与硬约束（对齐目标项目）
---

# 北极星与硬约束（对齐目标项目）

本文件把 Logix 关键裁决压缩成“开发必须遵守”的版本，用于对齐目标项目的 SSoT 与源码实现。

## 1) 北极星（Outcome）

- 单一事实源：`Static IR + Dynamic Trace`。
- 运行时行为必须可解释、可回放、可证据化。
- 平台与 Devtools 以 IR/Trace 为消费面，而不是私有对象图或口头约定。

## 2) 工程不变量（Invariants）

1. 稳定锚点去随机化：`instanceId/txnSeq/opSeq/tickSeq/linkId` 可复现。
2. 事务窗口禁止 IO：`update/mutate/reducer` 只做同步纯写。
3. 业务不可写 `SubscriptionRef`：写入必须经过事务入口。
4. 诊断事件必须 Slim、可序列化、可预算化（`JsonValue`）。
5. 跨模块协作默认白盒：`linkDeclarative-first`，blackbox 仅作 bridge。
6. 命名约定采用 `*.make`，避免 `*.define` 回潮。
7. Playground/Sandbox 定位为 Runtime Alignment Lab，不是单纯 runner。

## 3) 默认决策顺序（冲突时）

1. 事务安全与语义正确。
2. 单一事实源与稳定锚点。
3. 可解释与可诊断。
4. 工程可维护性。
5. 开发效率。

## 4) 典型违约信号

- 事务体里出现 await/IO/dispatch/`run*Task`。
- 通过 `SubscriptionRef.set/update` 绕过事务队列写状态。
- 诊断事件塞入不可序列化对象或超大载荷。
- 改动后 `instanceId/txnSeq/opSeq` 链路不稳定或不可回链。
- Playground 输出只有日志，缺失可结构化的 RunResult/anchors。

## 5) 延伸阅读（Skill 内）

- `references/llms/01-core-glossary.md`
- `references/llms/04-runtime-transaction-rules.md`
- `references/llms/06-diagnostics-perf-basics.md`
- `references/llms/08-builder-ir-basics.md`
- `references/llms/99-project-anchor-template.md`（可选）
