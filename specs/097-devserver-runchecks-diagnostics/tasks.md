# Tasks: DevServer RunChecks Diagnostics（097）

## P0（结构化结果）

- [x] `dev.runChecks`：每条 result 增加 `durationMs`
- [x] `dev.runChecks`：每条 result 增加 `diagnostics[]`（稳定 `code`）
- [x] `preview`：严格截断（禁止回传全文日志）

## P1（pointer 与 action）

- [x] 从 output 中提取少量 `file:line:col` / `file(line,col)` 作为 `CHECK_POINTER`
- [x] diagnostics 增加 `action: { kind: "run.command", command: "pnpm <check>" }`

## P2（文档对齐）

- [x] 更新 `docs/ssot/platform/contracts/04-devserver-protocol.md` 的 runChecks 返回结构
