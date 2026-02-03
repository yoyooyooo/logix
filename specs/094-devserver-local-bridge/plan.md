# Implementation Plan: Dev Server Local Bridge（094 · Local WS）

**Branch**: `094-devserver-local-bridge` | **Date**: 2026-01-27 | **Spec**: [spec.md](./spec.md)

## Summary

交付一个 Node-only 的本地 WS Dev Server（桥接进程），把 Studio/Agent 的交互式需求收口为 **版本化、可序列化、最小特权** 的协议：

- Transport：Local WS（`intent-flow.devserver.v1`）
- 方法：`dev.info` / `dev.run` / `dev.runChecks`
- 复用：`@logixjs/cli`（085）作为“能力执行引擎”；所有写回语义复用 082/079（PatchPlan/WriteBackResult/幂等）。

## Constitution Check

- **单一真相源**：Dev Server 不产生 sidecar 事实源；它只复用 085/081/082/079 的 IR/工件与写回结果。
- **统一最小 IR**：对外输出只允许 JsonValue；`dev.run` 返回 `CommandResult@v1`（与 CLI 同形）。
- **最小特权**：默认不回传源码全文；仅返回工件摘要/anchors/patch 等结构化产物；禁止破坏性 git 操作。
- **可终止性**：提供 `--shutdownAfterMs` 用于 CI/测试；请求级别提供 timeout（沿用 085 CLI 的 `--timeout` 等参数）。

## Project Structure

### Documentation

```text
specs/094-devserver-local-bridge/
├── spec.md
├── plan.md
├── tasks.md
├── quickstart.md
└── contracts/
    └── public-api.md
```

### Source Code

```text
packages/logix-cli/
├── src/bin/logix-devserver.ts          # devserver CLI 入口（启动 WS server）
└── src/internal/devserver/**           # WS 协议与 handler（纯 Node-only）
```

## Perf Evidence Plan

不触及 runtime 热路径；但需要对 Dev Server 做两类“可复现证据”：

- 启动可用性：`logix-devserver --port 0 --shutdownAfterMs 3000` 能在 3s 内启动并自关。
- 冷启动不拖累 `logix --help`：devserver 相关依赖必须与 `logix` bin 解耦（新增独立 bin，避免把 ws 依赖带入主 CLI cold path）。

