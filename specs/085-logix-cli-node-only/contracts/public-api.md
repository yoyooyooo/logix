# Public API: Logix CLI（085 · Node-only 工具箱）

> 本文件裁决“命令表与参数语义”（实现阶段可微调命令名，但语义必须保持稳定）。
> 输出协议统一为 `CommandResult@v1`：`specs/085-logix-cli-node-only/contracts/schemas/cli-command-result.schema.json`。

## 全局参数（所有子命令共享）

- `--runId <string>`：必须显式提供；用于确定性工件命名与日志关联（禁止默认 Date.now）。
- `--out <dir>`：可选；稳定落盘目录；stdout 仍输出 `CommandResult@v1`。
- `--outRoot <dir>`：可选；当未显式提供 `--out` 时，自动落盘到 `<outRoot>/<command>/<runId>`（避免多命令复用同一 runId 时互相覆盖）。
- `--mode report|write`：仅对可能写回的命令有效；默认 `report`。
- `--timeout <ms>`：可选；受控执行窗口（trialrun/parse/transform 等）。
- `--budgetBytes <n>`：可选；stdout/inline artifact 的预算上限（超限必须截断并标记）。
- `--tsconfig <path>`：可选；涉及 ts-morph 解析/改写时指定 tsconfig（默认自动探测）。
- `--host node|browser-mock`：可选；入口加载的 host 适配（默认 `node`）。当入口顶层访问 `window/document/navigator` 等浏览器全局时，用 `browser-mock`（见 `specs/099-cli-host-adapters`）。
- `--cliConfig <path>`：可选；显式指定 `logix.cli.json` 路径（不提供则从 cwd 向上查找；找不到则跳过）。
- `--profile <name>`：可选；选择配置文件中的 `profiles.<name>`（在 `defaults` 之上叠加）。
- `-h, --help`：输出帮助文本（多行）；不输出 `CommandResult@v1`。

配置优先级（低 → 高）：

```text
logix.cli.json defaults < logix.cli.json profiles.<name> < argv（命令行显式参数）
```

布尔类 flag 统一支持 `--flag` / `--noFlag` 两种形式，且“最后出现者胜”（用于覆盖配置默认值）。

## Host adapters（099 · 已落地）

- 合同与错误码：`specs/099-cli-host-adapters/contracts/public-api.md`、`specs/099-cli-host-adapters/contracts/error-codes.md`
- 目标：在 Node-only CLI 里提供“最小可恢复/可回收”的浏览器全局模拟，用于导出/试跑的 best-effort 跑道（不是完整浏览器语义）。

## 仓库扫描参数（解析/改写类命令共用）

- `--repoRoot <dir>`：仓库根目录；默认 `.`（cwd）。用于 `anchor index/autofill`、`transform module`，以及 `contract-suite run --includeAnchorAutofill`（建议在 CI 显式提供，避免 cwd 漂移）。

## 命令：Inspect / Extract（Oracle）

### `logix ir export`

语义：导出 ControlSurfaceManifest（Root IR）以及可选 slices（例如 workflowSurface）。

输出 artifacts（建议）：

- `control-surface.manifest.json`（file）
- `workflow.surface.json`（file，可选）

### `logix anchor index`

语义：构建 Platform-Grade AnchorIndex（081），对子集外形态显式 Raw Mode + reason codes。

输出 artifacts（建议）：

- `anchor.index.json`（file）

## 命令：Validate / Diff（Gate）

### `logix ir validate`

语义：对导出的工件做门禁（schema/digest/budgets/Raw Mode 统计/锚点规则）。

输入：

- `--in <dir>` 或 `--artifact <file>`（实现阶段二选一收敛）

输出 artifacts：

- `ir.validate.report.json`（inline 或 file）

Exit Code：

- PASS → 0
- VIOLATION（门禁失败/差异存在）→ 2
- ERROR（命令执行失败）→ 1

### `logix ir diff`

语义：对两份工件目录/文件做稳定 diff，输出可行动 reason codes。

输入：

- `--before <dir|file>`
- `--after <dir|file>`

输出 artifacts：

- `ir.diff.report.json`（inline 或 file）

Exit Code：同上（有差异 → 2）。

### `logix contract-suite run`

语义：一键集成验收（036）：执行一次受控试跑（trialrun）并计算 `ContractSuiteVerdict@v1`，必要时输出 `ContractSuiteContextPack@v1` 作为 Agent/CI 的最小事实包。

关键参数（只列“对外稳定语义”；其余调试开关实现阶段可增补）：

- `--entry <modulePath>#<exportName>`：试跑入口（`modulePath` 支持绝对路径或相对 cwd；解析等价于 `path.resolve(process.cwd(), modulePath)`）。
- `--allowWarn`：把 `WARN` 视为通过（exit code=0）。
- `--requireRulesManifest`：强制要求 rulesManifest 工件存在（缺失视为 FAIL/VIOLATION）。
- `--baseline <dir>`：读取 `<baseline>/trialrun.report.json` 做 manifest diff（输出 `manifest.diff.json`）。
- `--inputs <file|->`：注入 `facts.inputs`（Agent 最小编辑上下文）；默认会剥离 `uiKitRegistry`，需要时显式 `--includeUiKitRegistry`。
- `--includeContextPack`：无论 PASS/WARN/FAIL 都强制输出 `contract-suite.context-pack.json`（默认只在门禁失败时输出）。
- `--packMaxBytes <n>`：限制 ContextPack JSON 大小（超限必须确定性裁剪并记录 dropped 字段）。
- `--includeTrace`：输出 `trace.slim.json`（非门禁口径）。
- `--includeAnchorAutofill`：在同一条命令中内嵌一次 `anchor autofill --mode report`（079+082；**不写回**），并将 `PatchPlan/AutofillReport` 写入 ContextPack；`repoRoot` 默认取 `.`，必要时配合 `--repoRoot/--tsconfig` 限定扫描范围与解析配置。

输出 artifacts：

- `trialrun.report.json`
- `contract-suite.verdict.json`
- `contract-suite.context-pack.json`（默认失败时输出；或显式 `--includeContextPack`；或 `--includeAnchorAutofill`）
- `manifest.diff.json`（可选：提供 `--baseline` 时）
- （可选：`--includeAnchorAutofill`）`patch.plan.json`、`autofill.report.json`
- （可选：`--includeTrace`）`trace.slim.json`

Exit Code：

- PASS → 0
- VIOLATION（门禁失败/差异存在）→ 2
- ERROR（命令执行失败）→ 1

## 命令：Run / Introspect（Oracle + 运行期证据）

### `logix trialrun`

语义：对入口做受控试跑，输出 TrialRunReport（必要时引用 Slim Trace artifact）。

输入：

- `--entry <modulePath>#<exportName>`：入口（`modulePath` 支持绝对路径或相对 cwd；解析等价于 `path.resolve(process.cwd(), modulePath)`）。

输出 artifacts：

- `trialrun.report.json`（file）
- （可选）`trace.slim.json`（file）

### `logix spy evidence`

语义：运行 Loader Spy（084）采集 `$.use(Tag)` 的 best-effort 证据并输出 `SpyEvidenceReport@v1`；**证据不作权威**，不写回源码。

输入：

- `--entry <modulePath>#<exportName>`（`modulePath` 支持绝对路径或相对 cwd；解析等价于 `path.resolve(process.cwd(), modulePath)`）。
- （可选）`--maxUsedServices <n>` / `--maxRawMode <n>` / `--timeout <ms>`

输出 artifacts：

- `spy.evidence.report.json`（file）

## 命令：Write-Back（保守回写：补缺失锚点）

### `logix anchor autofill --mode report|write`

语义：输出 PatchPlan/WriteBackResult/AutofillReport（079/082），并在 `mode=write` 时执行写回（宁可漏不乱补）。

输出 artifacts（建议）：

- `patch.plan.json`（file；优先复用 082 PatchPlan@v1）
- `writeback.result.json`（file；mode=write 时）
- `autofill.report.json`（file 或 inline）

## 命令：Transform（可选加速器：batch ops）

### `logix transform module --ops <delta.json> --mode report|write`

语义：对 Platform-Grade 子集内的 Module 执行 batch ops（新增 state/action/补 stepKey 等），默认 `mode=report`。

输入：

- `--ops <file>`：delta.json（见 `specs/085-logix-cli-node-only/contracts/transform-ops.md`）

输出 artifacts：

- `patch.plan.json`（inline 或 file；优先复用 082 PatchPlan@v1）
- `transform.report.json`（inline 或 file）
- （`mode=write`）`writeback.result.json`（file）

Exit Code：

- report-only：存在 `failed`/`skipped` 不一定是错误；按门禁策略决定是否 `VIOLATION`。
- write：任何写回失败必须 `ERROR` 或 `VIOLATION`（由 reason code 与可恢复性裁决）。
