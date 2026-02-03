# Tasks: DevServer Event Stream + Cancel（096）

## P0（协议能力）

- [x] event 信封补齐 `requestId`
- [x] 新增 `dev.cancel`（按 requestId 取消 in-flight）
- [x] 新增 `dev.stop`（用于 stop/CI 清理）

## P1（实现）

- [x] server：维护 in-flight map（Effect fiber / 子进程）
- [x] `dev.runChecks`：推送 `check.started/check.finished` events
- [x] `dev.run`/`dev.runChecks`：取消后返回 `ERR_CANCELLED`

## P2（回归）

- [x] 集成测试：发起 runChecks → 收到 event → cancel → 断言 `ERR_CANCELLED`
