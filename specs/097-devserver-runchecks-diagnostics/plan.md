# Implementation Plan: DevServer RunChecks Diagnostics（097）

**Branch**: `097-devserver-runchecks-diagnostics` | **Date**: 2026-01-27 | **Spec**: [spec.md](./spec.md)

## Summary

- `dev.runChecks` 的每条结果补齐：`durationMs` + `diagnostics[]`（JsonValue-only）
- diagnostics 采用稳定 `code`（`CHECK_FAILED/CHECK_TIMEOUT/CHECK_CANCELLED/CHECK_POINTER`）
- 尝试从 output 里提取少量 `file:line:col` pointer（失败则降级）

## Constitution Check

- 输出必须可序列化（不回传全文日志，不回传 Error 实例）。
- 诊断必须可行动（至少能提示 `pnpm <check>` 的复现动作）。

## Project Structure

### Documentation

```text
specs/097-devserver-runchecks-diagnostics/
├── spec.md
├── plan.md
└── tasks.md
```

### Source Code

```text
packages/logix-cli/
└── src/internal/devserver/server.ts    # runChecks + diagnostics/pointer 解析
```

## Perf Evidence Plan

N/A（不触及 runtime 热路径）。守门：协议 payload 有严格截断，避免 OOM/卡死。

