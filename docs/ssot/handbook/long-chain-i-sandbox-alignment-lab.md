---
title: 长链路实现笔记 · I｜Sandbox / Alignment Lab（logix-sandbox）
status: draft
version: 1
---

# 长链路实现笔记 · I｜Sandbox / Alignment Lab（logix-sandbox）

> **主产物**：可解释、可约束、可回放地执行“外来代码/生成代码”，并把执行过程纳入证据链（Alignment Lab 的基础设施）。
>
> **一句话**：Sandbox 不是“代码 runner”，而是“可解释执行底座”——协议/证据/隔离边界比跑起来更重要。

## 目录

- 1. 三跳入口（src → worker → tests）
- 2. 编译链路（compiler）
- 3. 执行链路（worker）
- 4. 协议边界（protocol/types）
- 5. 与证据包/观测的对齐点
- 6. auggie 查询模板

## 1) 三跳入口（src → worker → tests）

- **src**
  - `packages/logix-sandbox/src/compiler.ts`
  - `packages/logix-sandbox/src/client.ts`
  - `packages/logix-sandbox/src/protocol.ts`
  - `packages/logix-sandbox/src/service.ts`
- **worker**
  - `packages/logix-sandbox/src/worker/*`
- **tests**
  - `packages/logix-sandbox/test/SandboxClientLayer.test.ts`
  - `packages/logix-sandbox/test/browser/*`

## 2) 编译链路（compiler）

编译链路的关键不是“TS→JS”，而是“把执行对象变成可约束的 IR”：

- 明确输入（源码/依赖/配置）与输出（bundle/entry/manifest）。
- 明确可观测点（编译错误分类、耗时、产物摘要）。
- 明确与 worker 的契约（协议字段、版本、能力探测）。

入口：`packages/logix-sandbox/src/compiler.ts`

## 3) 执行链路（worker）

执行链路需要同时满足三件事：

- **隔离**：不能让外来代码越权访问宿主能力。
- **可解释**：每一步发生了什么要能产出结构化事件（至少是可序列化的 Slim 轨迹）。
- **可回放**：最小证据包要能在本地复现关键行为（失败/超时/拒绝）。

入口：`packages/logix-sandbox/src/worker/*`

## 4) 协议边界（protocol/types）

协议是 Sandbox 的 SSoT（至少在该包内）：

- 协议字段必须稳定、可版本化。
- 错误必须结构化（不要只有字符串 message）。
- 任何“安全策略/白名单/限额”都应体现在协议能力里，而不是隐式写在实现里。

入口：`packages/logix-sandbox/src/protocol.ts`、`packages/logix-sandbox/src/types.ts`

## 5) 与证据包/观测的对齐点

Sandbox 想和 Runtime/Devtools 对齐，至少要对齐：

- 稳定标识（instanceId/txnSeq/opSeq 的风格，不引入随机化）。
- 事件口径（Slim、可序列化、可聚合）。
- 最小可回放证据（maps/traces 的分离：静态结构 + 动态轨迹）。

观测/证据的通用原则见：`long-chain-efg-observability-evidence-replay.md`。

## 6) auggie 查询模板

- “compiler 的输入/输出结构是什么？如何生成可缓存的产物摘要（digest）？”
- “worker 的隔离边界在哪？哪些能力被允许/禁止？拒绝如何结构化上报？”
- “protocol 的版本字段在哪？能力探测/向后兼容策略是什么？”
- “Sandbox 事件如何对齐 Runtime 的 Debug/证据包？最小 evidence 的导出入口在哪？”
