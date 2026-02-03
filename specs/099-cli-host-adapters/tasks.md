# Tasks: CLI Host 抽象与 Browser Mock Runner（099）

## P0（合同与设计收口）

- [x] 定义 Host public API：`--host` 与 browser-mock 最小 globals（v1）`specs/099-cli-host-adapters/contracts/public-api.md`
- [x] 固化错误码：Host mismatch / missing global `specs/099-cli-host-adapters/contracts/error-codes.md`
- [x] 固化可执行 action 的产物形态：`CliDiagnostics@v1` `specs/099-cli-host-adapters/contracts/cli-diagnostics.md`

## P1（实现：Host 抽象 + browser-mock）

- [x] 新增 Host 抽象：`packages/logix-cli/src/internal/host/Host.ts`（install/restore + `name`）
- [x] 实现 `node` host（no-op）`packages/logix-cli/src/internal/host/nodeHost.ts`
- [x] 实现 `browser-mock` host（lazy-load `happy-dom`；安装 window/document/navigator 等并可 restore）`packages/logix-cli/src/internal/host/browserMockHost.ts`
- [x] 解析全局 `--host`（含来自 `logix.cli.json` 的默认值；argv last-wins）`packages/logix-cli/src/internal/args.ts`、`packages/logix-cli/src/internal/cliConfig.ts`
- [x] 入口加载接入 Host：`loadProgramModule()` 在 import 前 install，结束后 restore（成功/失败/异常都必须 restore）`packages/logix-cli/src/internal/loadProgramModule.ts`
- [x] 将 Host 相关失败映射为结构化 `SerializableErrorSummary.code`（见 099 error-codes）`packages/logix-cli/src/internal/errors.ts`
- [x] 在 Host 相关失败时输出 `CliDiagnostics@v1` artifact（action=run.command，提示 `--host browser-mock`）`packages/logix-cli/src/Commands.ts`（注入 `cliDiagnostics` artifact）

## P2（回归与示例）

- [x] 增加最小 fixture：顶层访问 `window` 的入口模块（不引入 DOM lib；用 `declare const window: any`）`packages/logix-cli/test/fixtures/BrowserGlobalModule.ts`
- [x] 集成测试：默认 node host 失败（error.code=CLI_HOST_MISSING_BROWSER_GLOBAL + CliDiagnostics action）`packages/logix-cli/test/Integration/cli.host.node-missing-browser-global.test.ts`
- [x] 集成测试：`--host browser-mock` 成功（`ir export` / `trialrun` 至少一条链路）`packages/logix-cli/test/Integration/cli.host.browser-mock.smoke.test.ts`
- [x] 集成测试：restore 生效（同进程二次运行不残留 window）`packages/logix-cli/test/Integration/cli.host.restore.test.ts`
- [x] 更新 085 CLI 合同文档：新增 `--host`（或明确引用 099 扩展）`specs/085-logix-cli-node-only/contracts/public-api.md`（仅文档）
- [x] 更新 demo：在 `examples/logix-cli-playground/README.md` 增加一条 browser-mock 用法（仅示例）
