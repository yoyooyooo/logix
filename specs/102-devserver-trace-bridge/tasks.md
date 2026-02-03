# Tasks: DevServer Trace/Debug Bridge（102）

## P0（协议合同）

- [x] 定义 event kind 与 payload 子集、预算策略 `specs/102-devserver-trace-bridge/contracts/public-api.md`

## P1（实现与回归）

- [x] 扩展 `dev.run` params 类型：新增 `trace` 选项 `packages/logix-cli/src/internal/devserver/protocol.ts`
- [x] 在 `dev.run` handler 中实现 trace bridge：当 `trace.enabled` 时从 `CommandResult.artifacts[outputKey=traceSlim]` 提取 trace（优先 inline，其次尝试 file）并推送 `dev.event.trace.*` `packages/logix-cli/src/internal/devserver/server.ts`
- [x] 实现预算治理：maxBytes/chunkBytes/截断统计 `packages/logix-cli/src/internal/devserver/server.ts`
- [x] 集成测试：启动 devserver → 发送 `dev.run`（argv 含 `--includeTrace`）→ 断言 events 序列与最终 response `packages/logix-cli/test/Integration/cli.devserver.trace-bridge.test.ts`

## P2（文档同步）

- [x] 更新协议 SSoT：`docs/ssot/platform/contracts/04-devserver-protocol.md`
