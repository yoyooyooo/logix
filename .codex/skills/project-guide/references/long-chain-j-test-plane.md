---
title: 长链路实现笔记 · J｜测试面（Test Plane / logix-test）
status: draft
version: 1
---

# 长链路实现笔记 · J｜测试面（Test Plane / logix-test）

> **主产物**：把“可解释证据/trace”变成可回归断言；让失败可定位、可复现，而不是只知道末态不对。
>
> **注意**：core/runtime 的测试优先用 `@effect/vitest` 风格（见仓库约定）。

## 目录

- 1. 三跳入口（API → runtime → 示例）
- 2. 测试运行时在断言什么（证据优先）
- 3. 与 Debug/Devtools 的对齐（事件口径/稳定标识）
- 4. auggie 查询模板

## 1) 三跳入口（API → runtime → 示例）

- **API**
  - `packages/logix-test/src/index.ts`
  - `packages/logix-test/src/Scenario.ts`
- **runtime**
  - `packages/logix-test/src/runtime/TestRuntime.ts`
- **示例/回归参考**
  - core：`packages/logix-core/test/*`
  - react：`packages/logix-react/test/*`

## 2) 测试运行时在断言什么（证据优先）

把测试目标从“末态”提升为“证据”：

- 断言结构化事件序列（发生了哪些 txn/op，顺序是否稳定）。
- 断言关键不变量（例如事务窗口 0/1 commit、phase guard、strict imports）。
- 需要末态断言时，也尽量绑定到某个 txnId/opSeq，避免“断言漂移”。

## 3) 与 Debug/Devtools 的对齐（事件口径/稳定标识）

测试面想写得轻松，前提是 Runtime 把下面三件事做对：

- 稳定标识（instanceId/txnSeq/opSeq）可预测；
- 事件 Slim 且可序列化；
- Debug/Devtools 的导出能力可用于“失败现场打包”（EvidencePackage）。

详见：`long-chain-efg-observability-evidence-replay.md`。

## 4) auggie 查询模板

- “`TestRuntime` 如何收集 actions/changes/debug 形成 trace？trace 的最小数据结构是什么？”
- “`Scenario` 的最小写法在哪？如何把一个模块/多个模块组合成可运行测试？”
- “如何在测试里导出 EvidencePackage？导出入口与字段口径在哪？”
