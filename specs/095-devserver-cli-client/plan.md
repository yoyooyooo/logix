# Implementation Plan: DevServer CLI Client（095）

**Branch**: `095-devserver-cli-client` | **Date**: 2026-01-27 | **Spec**: [spec.md](./spec.md)

## Summary

把 devserver 的“调用侧”变成稳定的 CLI 合同：

- `logix-devserver call`：纯命令行 WS client（默认忽略 event；按需 `--includeEvents` 累积）
- 连接发现：默认从 state file 读取 `url/token`（可被 flags/env 覆盖）
- 输出合规：stdout 单行 JSON；exit code：`0(ok:true)` / `1(ok:false 或连接失败)` / `2(用法/参数错误)`

## Constitution Check

- Devserver 只做桥接，不产生双真相源；对外仍是 JsonValue-only。
- Machine 输出不污染：`--help` 之外禁止多行/日志/彩色。
- 不引入破坏性 git 行为。

## Project Structure

### Documentation

```text
specs/095-devserver-cli-client/
├── spec.md
├── plan.md
└── tasks.md
```

### Source Code

```text
packages/logix-cli/
├── src/bin/logix-devserver.ts              # call/status/stop + start
└── src/internal/devserver/client.ts        # WS client（忽略 event → 等待 response）
```

## Perf Evidence Plan

N/A（不触及 runtime 热路径）。门槛：不把 `ws` 依赖引入 `logix` 主 bin 的 cold path。
