# Public API: CLI Host 抽象（099）

> 本文件裁决：为 `logix` CLI 增加宿主选择能力，以支持加载/试跑包含浏览器依赖的模块入口。
> 该能力会作为 085（`logix`）的增量扩展落地；实现时需同步更新 `specs/085-logix-cli-node-only/contracts/public-api.md`。

## 全局参数（新增）

- `--host <name>`：选择宿主（影响入口加载与试跑）。
  - `node`（默认）：保持现状。
  - `browser-mock`：Node 内模拟最小浏览器全局，用于加载/试跑前端入口。

配置：

- `logix.cli.json` 允许在 `defaults/profiles.*` 中声明 `host`，并按既有规则参与优先级合并（defaults < profile < argv）。

## browser-mock：最小全局子集（v1）

实现必须至少提供以下全局（不要求完整 DOM 语义；“子集外必须可解释失败”），且必须可 restore：

- `globalThis.window`（建议来自 `happy-dom`）
- `globalThis.document`
- `globalThis.navigator`
- `globalThis.location`（可选，但推荐提供；很多前端代码会读取）
- `globalThis.self`（建议指向 `window`）

约束：

- 必须在一次命令执行结束后恢复全局（不污染同进程后续命令），且 restore 必须覆盖“成功/失败/异常”三条路径。
- 不得把非确定性字段写入门禁工件口径（gating/non-gating 仍以 085 约束为准）。

## 错误码（建议最小集合）

Host 相关错误码详见：`specs/099-cli-host-adapters/contracts/error-codes.md`。

诊断建议：

- 必须输出 `CliDiagnostics@v1` artifact（见 `contracts/cli-diagnostics.md`），其中包含 `action.kind === "run.command"`，建议命令为原命令加上 `--host browser-mock`（或等价）。
