---
title: 北极星与硬约束
---

# 北极星与硬约束

本文件把 Logix 关键裁决压缩成“开发必须遵守”的自包含版本。

## 1) 北极星（Outcome）

- 当前公开主链小而稳定：`Module.logic(...) -> Program.make(...) -> Runtime.make(...) -> React host law`。
- Logix 优先服务 Agent 稳定生成、理解、组合、调试和验证逻辑。
- 运行时行为必须可解释、可回放、可证据化。
- 平台、Devtools 与对齐实验只消费 runtime evidence 和 control-plane outcome，不反向定义业务 authoring surface。

## 2) 工程不变量（Invariants）

1. 稳定锚点去随机化：`instanceId/txnSeq/opSeq/tickSeq/linkId` 可复现。
2. 事务窗口禁止 IO：`update/mutate/reducer` 只做同步纯写。
3. 业务不可写 `SubscriptionRef`：写入必须经过事务入口。
4. 诊断事件必须 Slim、可序列化、可预算化（`JsonValue`）。
5. 跨模块协作默认白盒：优先保持可解释的 read -> dispatch contract，blackbox 仅作 bridge。
6. 公开 API 主链采用 `Module.logic(...)`、`Program.make(...)`、`Runtime.make(...)`。
7. 默认验证代码只生成 `Logix.Runtime.check` 与 `Logix.Runtime.trial`；`compare` 只作为评审阶段名。
8. Playground/Sandbox 属于对齐实验专项层，不定义第二业务运行时。

## 3) 默认决策顺序（冲突时）

1. 事务安全与语义正确。
2. 单一事实源与稳定锚点。
3. 可解释与可诊断。
4. Agent 生成稳定性。
5. 工程可维护性。
6. 开发效率。

## 4) 典型违约信号

- 事务体里出现 await/IO/dispatch/`run*Task`。
- 通过 `SubscriptionRef.set/update` 绕过事务队列写状态。
- 诊断事件塞入不可序列化对象或超大载荷。
- 改动后 `instanceId/txnSeq/opSeq` 链路不稳定或不可回链。
- 为了便利新增第二 host gate、第二 report object、第二 evidence envelope 或第二 authoring carrier。
- Playground 输出只有日志，缺失结构化对齐结果与 anchors。

## 5) 延伸阅读（Skill 内）

- `references/agent-first-api-generation.md`
- `references/llms/01-core-glossary.md`
- `references/llms/04-runtime-transaction-rules.md`
- `references/llms/06-diagnostics-perf-basics.md`
- `references/llms/08-builder-ir-basics.md`
