# Public API: Logix CLI（085 · Node-only 工具箱）

> 本文件裁决“命令表与参数语义”（实现阶段可微调命令名，但语义必须保持稳定）。
> 输出协议统一为 `CommandResult@v1`：`specs/085-logix-cli-node-only/contracts/schemas/cli-command-result.schema.json`。

## 全局参数（所有子命令共享）

- `--runId <string>`：必须显式提供；用于确定性工件命名与日志关联（禁止默认 Date.now）。
- `--out <dir>`：可选；稳定落盘目录；stdout 仍输出 `CommandResult@v1`。
- `--mode report|write`：仅对可能写回的命令有效；默认 `report`。
- `--timeout <ms>`：可选；受控执行窗口（trialrun/parse/transform 等）。
- `--budgetBytes <n>`：可选；stdout/inline artifact 的预算上限（超限必须截断并标记）。
- `--tsconfig <path>`：可选；涉及 ts-morph 解析/改写时指定 tsconfig（默认自动探测）。

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

## 命令：Run / Introspect（Oracle + 运行期证据）

### `logix trialrun`

语义：对入口做受控试跑，输出 TrialRunReport（必要时引用 Slim Trace artifact）。

输入：

- `--entry <modulePath>#<exportName>` 或等价入口表达（以实现为准）

输出 artifacts：

- `trialrun.report.json`（file）
- （可选）`trace.slim.json`（file）

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

