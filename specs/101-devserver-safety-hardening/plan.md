# Implementation Plan: DevServer 安全硬化（101）

**Branch**: `101-devserver-safety-hardening` | **Date**: 2026-01-28 | **Spec**: [spec.md](./spec.md)

## Summary

在不引入兼容层的前提下，给 DevServer 加上“显式授权 + 可发现能力位”的安全护栏（默认只读，写回需显式 allowWrite）：

- server 启动参数：readOnly/allowWrite
- `dev.run` 写回拦截（argv 级别）
- state file 权限与 token 泄漏面收敛
- `dev.info/status` 暴露 capabilities（write allowed 等）

## Constitution Check

- **最小特权**：默认只读；只有显式 `--allowWrite` 才允许写回意图进入执行链路。
- **可审计**：v1 拒绝策略只基于 argv 中“显式意图”（`--mode write` / `--mode=write`），不引入复杂 parser。
- **JsonValue-only**：协议层与错误响应保持 JSON-safe；不回传敏感信息全文（尤其 token）。
- **单一真相源**：写回语义仍由 CLI（085）与 Anchor/Rewrite（082/079）决定；本 spec 只做外层护栏。

## Project Structure

```text
specs/101-devserver-safety-hardening/
├── spec.md
├── plan.md
├── tasks.md
└── contracts/
    └── public-api.md
```

```text
packages/logix-cli/
├── src/bin/logix-devserver.ts            # 解析 --allowWrite/--readOnly
└── src/internal/devserver/
    ├── protocol.ts                       # dev.info/status capabilities 字段
    ├── server.ts                         # dev.run 拒绝策略 + capabilities 暴露
    └── state.ts                          # state dir/file 权限收口（best-effort）
```

## Design Notes（裁决点）

1. **默认只读**：未传 `--allowWrite` 时，`capabilities.write === false`（与 `contracts/public-api.md` 一致）。
2. **拒绝策略 v1（简单可审计）**：仅拦截“显式写回意图”的 argv token（`--mode write` / `--mode=write`）。
   - 目标：阻断误写回；不试图推断更隐蔽的意图（避免误杀与不可解释）。
3. **状态文件权限 best-effort**：
   - 目录尽量 `0700`，文件尽量 `0600`；
   - 平台不支持 chmod 时允许降级，但必须在 diagnostics/preview 中可解释（不得 silent）。
4. **能力位可发现**：`dev.info`（与 `status`）必须携带 `capabilities: { write }`，用于 UI/Agent 防呆。

## Cross-Reference（需要回写/对齐）

- 协议 SSoT：`docs/ssot/platform/contracts/04-devserver-protocol.md`（补 `capabilities.write` + `ERR_FORBIDDEN` 语义）
- CLI 写回语义：与 `085` 的 `--mode write` 口径保持一致（本 spec 不引入新写回语义）

## Rollout / Migration

- 默认行为收紧：devserver 默认只读；任何依赖 devserver 执行写回的客户端必须显式用 `--allowWrite` 启动。
- 不提供兼容层：这是 forward-only 的安全基线升级；通过文档与错误码引导迁移。
