# Implementation Plan: DevServer Process Governance（098）

**Branch**: `098-devserver-process-governance` | **Date**: 2026-01-27 | **Spec**: [spec.md](./spec.md)

## Summary

- `logix-devserver` 启动时写入 state file（默认基于 repoRoot 的 tmp 路径）
- 提供 `status/health/stop` 子命令（stdout 单行 JSON）
- 协议层新增 `dev.stop`，并支持可选 `auth.token`

## Constitution Check

- 必须可自动结束（CI/测试用 `--shutdownAfterMs`）。
- 输出严格：machine 输出不污染。
- 安全：token 可选但一旦开启必须强制校验。

## Project Structure

### Documentation

```text
specs/098-devserver-process-governance/
├── spec.md
├── plan.md
└── tasks.md
```

### Source Code

```text
packages/logix-cli/
├── src/bin/logix-devserver.ts                # start/status/health/stop
└── src/internal/devserver/state.ts           # state file read/write/resolve
```

## Perf Evidence Plan

N/A（非 runtime 热路径）。门槛：state file 默认写到 tmp，避免 repo 产生垃圾文件。

