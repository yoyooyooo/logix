# Quickstart: 085 Logix CLI（Node-only）

> 目标：在平台落地前，用 `logix` CLI 串起 IR 导出 / 受控试跑 / Anchor 索引 / 保守回写，并输出版本化 JSON 工件供 CI/Devtools/平台侧消费。

## 1) 产物是什么

- `CommandResult@v1`：CLI 输出 envelope（stdout + 落盘引用）。
- 工件示例（按子命令不同）：`TrialRunReport`、`AnchorIndex@v1`、`PatchPlan@v1`、`WriteBackResult@v1` 等。
- 集成验收（036）：`ContractSuiteVerdict@v1`、`ContractSuiteContextPack@v1`。

权威 schema：

- `specs/085-logix-cli-node-only/contracts/schemas/cli-command-result.schema.json`

## 2) 怎么运行（预期入口）

由 `packages/logix-cli` 暴露 `logix` 命令（本 spec 只固化语义与工件形态）：

- `logix ir export`：导出 Manifest/StaticIR/Artifacts（可落盘）
- `logix ir validate`：对导出工件做门禁（锚点/预算/Raw Mode 统计）
- `logix ir diff`：对两份工件做稳定 diff（用于 CI gate）
- `logix trialrun`：导出 TrialRunReport（受控窗口 + 预算/超时）
- `logix contract-suite run`：一键集成验收（036）：trialrun + verdict/context-pack；可选 baseline diff；可注入 `facts.inputs`（`--inputs`）用于 Agent 最小编辑上下文；用于 CI/Agent gate
- （可选）`logix spy evidence`：采集 `$.use(Tag)` 的 best-effort 证据并输出 `SpyEvidenceReport@v1`（084；不写回源码）
- `logix anchor index`：导出 `AnchorIndex@v1`（081）
- `logix anchor autofill --mode report|write`：导出 PatchPlan/WriteBackResult（082），并在 `mode=write` 时执行写回（079）
- （可选）`logix transform module --ops <delta.json> --mode report|write`：对 Platform-Grade 子集内的 Module 做 batch ops（默认 report-only）

仓库内最小 demo（可直接复用命令与产物目录结构）：

- `examples/logix-cli-playground`：最小 `--entry` 入口 + `--inputs` 注入 + `--includeContextPack` 演示（见该目录 README）

### 推荐：用 `logix.cli.json` / `--profile` 缩短命令（Agent/CI 友好）

CLI 会在解析前尝试把配置文件转换为 argv 前缀：

- 默认从 cwd 向上查找 `logix.cli.json`（找不到则跳过）
- 或显式提供：`--cliConfig <path>`
- 可选叠加 profile：`--profile <name>`

配置优先级：`defaults < profiles.<name> < argv（命令行显式参数）`；布尔类 flag 支持 `--flag/--noFlag` 且“最后出现者胜”。

若提供 `outRoot`（来自配置或 `--outRoot`），并且未显式提供 `--out`，则默认落盘目录为：

```text
<outRoot>/<command>/<runId>/*
```

示例：

```bash
# 假设 logix.cli.json 已提供 defaults.entry/outRoot/timeout/diagnosticsLevel 等
logix trialrun --runId tr1
logix trialrun --runId tr2 --profile trace
logix contract-suite run --runId cs1 --profile requireRules --allowWarn
```

### 最小可跑样例（当前实现进度）

> 当前 `packages/logix-cli` 已实现：`ir export / ir validate / ir diff / trialrun / spy evidence / anchor index / anchor autofill / transform module`。  
> 备注：`transform module` v1 支持 `ensureWorkflowStepKeys` 与 `addState/addAction`（其余 ops 会在报告中标记为 unsupported）。
> 备注：`--entry` 的 `modulePath` 按执行时 cwd 解析；脚本/CI 建议使用绝对路径或固定在 repoRoot 下运行。

```bash
# 1) 导出 Root IR（manifest）
logix ir export --runId r1 --entry ./path/to/app.ts#AppRoot --out ./.logix/ir/r1

# 2) 门禁（PASS=0 / VIOLATION=2 / ERROR=1）
logix ir validate --runId v1 --in ./.logix/ir/r1 --out ./.logix/ir/r1

# 3) 对比基线与当前（有差异 exit code=2）
logix ir diff --runId d1 --before ./.logix/ir/baseline --after ./.logix/ir/r1 --out ./.logix/ir/diff

# 4) 受控试跑（默认不输出 evidence；可用 --includeTrace 输出 trace.slim.json）
logix trialrun --runId tr1 --entry ./path/to/app.ts#AppRoot --out ./.logix/tr/tr1 --diagnosticsLevel off --timeout 2000

# 4b) Contract Suite（一键验收；可用于 CI/Agent gate）
# - `--allowWarn`：把 WARN 视为通过（exit code=0）
# - `--baseline`：可选，读取 baseline 目录内的 trialrun.report.json 进行 manifest diff（输出 manifest.diff.json）
# - `--inputs`：可选，注入 `facts.inputs`（StageBlueprint/UIBlueprint/BindingSchema/...），并进入 context pack（默认会剥离 uiKitRegistry；可用 `--includeUiKitRegistry` 保留）
# - `--includeAnchorAutofill`：可选，在同一条命令里执行 `anchor autofill --mode report`，并把 `PatchPlan/AutofillReport` 作为 artifacts 写入 context pack（需要时用 `--repoRoot`/`--tsconfig` 限定扫描范围与解析配置；该选项会强制输出 context pack，即使 verdict=PASS）
logix contract-suite run --runId cs1 --entry ./path/to/app.ts#AppRoot --out ./.logix/cs/cs1 --requireRulesManifest --allowWarn

# 4c) 可选：Loader Spy（084，证据不作权威；不写回源码）
logix spy evidence --runId se1 --entry ./path/to/app.ts#AppRoot --out ./.logix/spy/se1

# 5) 构建 AnchorIndex（081）
logix anchor index --runId ai1 --repoRoot . --out ./.logix/anchor/ai1

# 6) 保守 autofill（079 + 082，默认 report-only；不会写回源码）
logix anchor autofill --runId af1 --repoRoot . --mode report --out ./.logix/anchor/af1

# 7) 审阅后显式写回（幂等；第二次运行应 0 diff）
logix anchor autofill --runId af2 --repoRoot . --mode write --out ./.logix/anchor/af2

# 8) 可选：受限 batch transform（stepKey / state / action；report-only）
logix transform module --runId tm1 --repoRoot . --mode report --ops ./delta.json --out ./.logix/transform/tm1
```

`delta.json` 示例（`addState` + `addAction`）：

```json
{
  "schemaVersion": 1,
  "kind": "ModuleTransformDelta",
  "target": { "moduleFile": "path/to/module.ts", "exportName": "UserPageModule" },
  "ops": [
    { "op": "addState", "key": "isSaving", "type": "boolean", "initialCode": "false" },
    { "op": "addAction", "actionTag": "ui/user/submit", "payloadType": "void" }
  ]
}
```

### Cold start 测量（`--help`）

`085/plan.md` 的预算目标是 `logix --help` cold start `< 500ms`（禁加载 `ts-morph`）。

```bash
pnpm -C packages/logix-cli build
pnpm -C packages/logix-cli measure:startup
```

当前基线（本机测量）：`189.12ms`。

## 3) 安全边界（必须牢记）

- 强制显式 `runId`；输出必须确定性、可序列化、可 diff。
- `--mode write` 会修改源码：只补“未声明且高置信度”的锚点缺口；对子集外/歧义形态必须拒绝写回并给出 reason codes。
- 默认工作方式建议：先直接出码/重构，再用 `ir export/validate/diff` 做证据链与门禁；仅在“机械且高风险小改动”时才考虑 `transform module`。
