# Implementation Plan: DevServer Event Stream + Cancel（096）

**Branch**: `096-devserver-event-stream-cancel` | **Date**: 2026-01-27 | **Spec**: [spec.md](./spec.md)

## Summary

- 扩展 WS 协议：event 增加 `requestId`；新增 `dev.cancel` / `dev.stop`
- server 维护 in-flight map：可 interrupt `Effect` fiber、可 kill `pnpm` 子进程
- client（`call`）对 event 免疫：按 `requestId` 等到最终 response

## Constitution Check

- JsonValue-only：event 与 error.data 都必须可序列化。
- 可终止性：cancel best-effort；子进程 kill 兜底（SIGTERM→SIGKILL）。

## Project Structure

### Documentation

```text
specs/096-devserver-event-stream-cancel/
├── spec.md
├── plan.md
└── tasks.md
```

### Source Code

```text
packages/logix-cli/
└── src/internal/devserver/server.ts    # event + inflight cancel
```

## Perf Evidence Plan

N/A（不触及 runtime 热路径）。
