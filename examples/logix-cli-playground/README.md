# Logix CLI Playground (node-only)

一个专门用来“体验 @logixjs/cli”的最小项目：提供可被 `logix --entry <modulePath>#<exportName>` 直接加载的入口文件，并把 CLI 产物写入本目录的 `.logix/`。

本目录自带 `logix.cli.json`，因此大多数命令只需提供 `--runId` + 少量可选 flags（`--entry/--out/--timeout/...` 都有默认值/可用 profile 收敛）。

## Tutorials（从 0 到 1 的递进式 demo）

如果你是刚接手的开发者，不想先理解 IR 字段/协议细节，建议按教程目录从 0 开始跑：

- `examples/logix-cli-playground/tutorials/README.md`

> 提示：教程里优先使用 `pnpm -C examples/logix-cli-playground cli:*` 脚本（它们会自动先 build `@logixjs/cli`，避免 “bin 指向 dist 但未 build” 的坑）。

## Quickstart

在仓库根目录已完成 `pnpm i` 的前提下：

```bash
pnpm -C examples/logix-cli-playground cli:ir:export
pnpm -C examples/logix-cli-playground cli:trialrun
pnpm -C examples/logix-cli-playground cli:contract:pass
```

> 备注：以上脚本会自动先构建 `@logixjs/cli`（`pnpm -C packages/logix-cli build`），避免 “bin 指向 dist 但未 build” 的坑。

产物默认写入：
- `.logix/out/ir.export/demo-ir/*`
- `.logix/out/trialrun/demo-trialrun/*`
- `.logix/out/contract-suite.run/demo-contract-pass/*`

## 体验 Host adapters（`--host browser-mock`）

当入口模块顶层会访问 `window/document/navigator` 等浏览器全局时，可用 `--host browser-mock` 在 Node 进程内提供最小模拟（用于“能跑就跑”的导出/试跑）：

```bash
pnpm -C examples/logix-cli-playground cli:build
logix trialrun --runId demo-host-browser-mock --host browser-mock --entry src/entry.browser-global.ts#AppRoot
```

## 体验 Dev Server（Local WS：`dev.run`）

Dev Server 是常驻桥接进程：用 WS 协议把 `logix` CLI 的能力（085）变成可交互调用（见 `specs/094-devserver-local-bridge`）。

启动（随机端口 + 30s 后自动关闭，便于本地试用）：

```bash
pnpm -C packages/logix-cli build
node packages/logix-cli/dist/bin/logix-devserver.js --port 0 --shutdownAfterMs 30000
```

把 stdout 里的 `url` 复制出来，发送一个最小请求（`dev.run` 调用 `anchor index`；省略 `--runId`，由 `requestId` 自动注入）：

```bash
node packages/logix-cli/dist/bin/logix-devserver.js call --url "<PASTE_URL_HERE>" --requestId demo-1 --method dev.run -- anchor index --repoRoot examples/logix-cli-playground
```

或（推荐）省略 `--url`：从 `DevServerStarted.stateFile` 读取连接信息：

```bash
node packages/logix-cli/dist/bin/logix-devserver.js call --requestId demo-1 --method dev.run -- anchor index --repoRoot examples/logix-cli-playground
```

## 体验“门禁失败 → 最小事实包”

强制要求 `rulesManifest`（基础 Module 不会产出），故意让门禁失败并生成 context pack：

```bash
pnpm -C examples/logix-cli-playground cli:contract:requireRules:fail
```

重点看：
- `.logix/out/contract-suite.run/demo-contract-requireRules-fail/contract-suite.verdict.json`
- `.logix/out/contract-suite.run/demo-contract-requireRules-fail/contract-suite.context-pack.json`

## 体验 “inputs 注入 → context pack（给 Agent 的最小编辑上下文）”

把一个最小 `inputs.demo.json` 注入到 Contract Suite 的 `facts.inputs`，并强制生成 context pack（无论 PASS/FAIL）：

```bash
pnpm -C examples/logix-cli-playground cli:contract:inputs
```

重点看：
- `.logix/out/contract-suite.run/demo-contract-inputs/contract-suite.context-pack.json`

## 体验“一次命令收敛：Contract Suite + Anchor Autofill（report-only）”

把 `anchor autofill --mode report` 嵌入到 `contract-suite run` 中：一次执行即可拿到 verdict/context pack，并额外产出 `PatchPlan/AutofillReport`（用于 Agent 快速定位“锚点缺口”并生成最小补丁）。

```bash
pnpm -C examples/logix-cli-playground cli:contract:with-autofill
```

> 提示：`--repoRoot` 默认 `.`（cwd），因此在目标仓库根目录运行时可以省略；在 CI 建议显式提供，避免 cwd 漂移。

重点看：
- `.logix/out/contract-suite.run/demo-contract-with-autofill/contract-suite.context-pack.json`（`facts.artifacts` 里包含 `@logixjs/anchor.patchPlan@v1` / `@logixjs/anchor.autofillReport@v1` 的 value）
- `.logix/out/contract-suite.run/demo-contract-with-autofill/patch.plan.json`
- `.logix/out/contract-suite.run/demo-contract-with-autofill/autofill.report.json`

## 体验“满足要求 → 门禁通过”

使用 `@logixjs/form` 的 rules（会产出 `@logixjs/form.rulesManifest@v1`）。这里复用 `examples/logix-sandbox-mvp` 里的入口文件（该例子自带依赖）：

```bash
pnpm -C examples/logix-cli-playground cli:contract:requireRules:pass
```

## 体验 “Schema Registry (040) 作为 artifact”

无论 PASS/FAIL，`trialrun.report.json` 里都会包含 `@logixjs/schema.registry@v1`：

- `.logix/out/trialrun/demo-trialrun/trialrun.report.json`
- `.logix/out/contract-suite.run/demo-contract-pass/trialrun.report.json`
- `.logix/out/contract-suite.run/demo-contract-requireRules-fail/contract-suite.context-pack.json`（失败时会带 value）
