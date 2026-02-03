# Tasks: DevServer Project Awareness（100）

## P0（协议与合同）

- [x] 定义对外方法与返回结构（workspace snapshot + cliConfig）`specs/100-devserver-project-awareness/contracts/public-api.md`
- [x] 明确 `cliConfig` 的可解释错误码集合（写入 `result.cliConfig.error.code`）：`CLI_CONFIG_NOT_FOUND` / `CLI_CONFIG_INVALID` / `CLI_ENTRY_INVALID`（或等价）
- [x] 固化预算/裁剪策略：`params.maxBytes` + `cliConfig.truncated` 的语义

## P1（实现与回归）

- [x] 在 devserver 协议层新增方法：`dev.workspace.snapshot`（只读）`packages/logix-cli/src/internal/devserver/protocol.ts`
- [x] 实现 handler：workspace snapshot（repoRoot/cwd/packageManager/devserver version）`packages/logix-cli/src/internal/devserver/server.ts`
- [x] 复用 CLI 的 `logix.cli.json` 发现与解析逻辑（抽取 `discoverCliConfig()`），返回 `path/config/profiles` `packages/logix-cli/src/internal/cliConfig.ts`
- [x] 集成测试：启动 devserver → `logix-devserver call --method dev.workspace.snapshot` → 断言结构与 `cliConfig` 分支 `packages/logix-cli/test/Integration/cli.devserver.snapshot.test.ts`

## P2（文档同步）

- [x] 更新协议 SSoT（新增方法）`docs/ssot/platform/contracts/04-devserver-protocol.md`
