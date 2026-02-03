# Tasks: Dev Server Local Bridge（094）

## P0（先跑通最小闭环）

- [x] 新增 `specs/094-devserver-local-bridge/*`（spec/plan/tasks/contracts/quickstart）
- [x] 更新 `docs/ssot/platform/contracts/04-devserver-protocol.md`：方法集合收口到 `dev.info/dev.run/dev.runChecks`
- [x] 在 `packages/logix-cli` 新增独立 bin：`logix-devserver`
- [x] 实现 WS server：协议信封 + request/response + 错误码归一化
- [x] 实现 `dev.info`（版本/协议/cwd）
- [x] 实现 `dev.run`（进程内调用 `@logixjs/cli/Commands` 的 `main(argv)`，可选注入 `runId=requestId`）
- [x] 实现 `dev.runChecks`（`pnpm typecheck/lint/test`，返回结构化摘要）

## P1（回归与示例）

- [x] 添加集成测试：启动 devserver（随机端口 + `--shutdownAfterMs`），通过 WS 调用 `dev.run` 跑 `anchor autofill --mode report` 并断言返回 `CommandResult@v1`
- [x] 在 `examples/logix-cli-playground` 增加 README 用法：如何启动 devserver + 发送一个最小请求

## P2（体验与安全收口）

- [x] 为 WS 请求增加 `maxMessageBytes` 与明确的 `ERR_PAYLOAD_TOO_LARGE`
- [x] 为 `dev.runChecks` 增加输出截断与 reason codes（避免巨大日志）

## P3（后续拆分到独立 specs）

- [x] 纯命令行 client（`logix-devserver call`）→ `specs/095-devserver-cli-client`
- [x] event stream + cancel → `specs/096-devserver-event-stream-cancel`
- [x] runChecks diagnostics → `specs/097-devserver-runchecks-diagnostics`
- [x] status/health/stop/token/state → `specs/098-devserver-process-governance`
