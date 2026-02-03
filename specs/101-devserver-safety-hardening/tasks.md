# Tasks: DevServer 安全硬化（101）

## P0（合同）

- [x] 定义 server 启动参数：`--readOnly` / `--allowWrite`（默认策略）`specs/101-devserver-safety-hardening/contracts/public-api.md`
- [x] 定义错误码：`ERR_FORBIDDEN`（或等价）与 capability 字段

## P1（实现）

- [x] CLI 解析 `--allowWrite/--readOnly` 并传入 server start args `packages/logix-cli/src/bin/logix-devserver.ts`
- [x] `dev.info` 返回 `capabilities`（write allowed）`packages/logix-cli/src/internal/devserver/server.ts`、`packages/logix-cli/src/internal/devserver/protocol.ts`
- [x] `dev.run` 增加只读拦截：拒绝 `--mode write` / `--mode=write`，返回 `ERR_FORBIDDEN` `packages/logix-cli/src/internal/devserver/server.ts`
- [x] state file 写入权限收口（dir 0700 + file 0600 best-effort）`packages/logix-cli/src/internal/devserver/state.ts`

## P2（回归与文档）

- [x] 集成测试：readOnly 下拒绝写回（`ERR_FORBIDDEN`）`packages/logix-cli/test/Integration/cli.devserver.readonly-forbid-write.test.ts`
- [x] 集成测试：`--allowWrite` 下允许写回请求进入执行链路（不要求实际写回成功）`packages/logix-cli/test/Integration/cli.devserver.allowwrite.allows-write.test.ts`
- [x] 集成测试：state file 权限（类 Unix 断言 0600；其它平台跳过）`packages/logix-cli/test/Integration/cli.devserver.statefile.permissions.test.ts`
- [x] 更新协议 SSoT `docs/ssot/platform/contracts/04-devserver-protocol.md`（补 capabilities 与 ERR_FORBIDDEN）
