---
title: CLI 跑道：用 logix 跑通导出/门禁/写回（含 logix-devserver）
status: draft
version: 1
---

# CLI 跑道：用 logix 跑通导出/门禁/写回（含 logix-devserver）

> **定位**：这是 `docs/ssot/handbook/` 的“维护者教程/剧本集”（how-to），用于把本仓库的 CLI 跑道（`logix`）与 DevServer Bridge（`logix-devserver`）从 0→1 串起来：**可复现工件 → 可门禁 gate → 最小事实包 →（可选）保守写回**，并给 Studio/Agent 留出可交互调用入口。  
> **重要**：本文不是裁决来源；凡涉及 MUST/协议/边界的最终口径以 SSoT 与 specs/contracts 为准（`docs/ssot/platform/**`、`docs/ssot/runtime/**`、`specs/085-*`、`specs/094-*`）。
> **你不需要懂 IR 字段**：把它理解成“把你的改动变成可审阅、可门禁、可解释的证据包”，先跑通 demo，再按需回来看解释。
> **新人入口（强烈推荐）**：先按 `examples/logix-cli-playground/tutorials/README.md` 的 00→06 递进跑一遍（每关都有“成功标志/该看什么文件”），然后再回来看这篇长文。

---

## 0. 最短阅读路径（10–30 分钟先跑通）

### 0.0 新人：直接跑“递进式教程目录”

如果你是刚接手、对 CLI 这条线没有历史包袱，最推荐的顺序是：

- `examples/logix-cli-playground/tutorials/README.md`

你会拿到三件事：

1) 一条命令看门禁 PASS/FAIL（并定位原因）  
2) 失败时的“最小事实包”（直接交给 Agent）  
3) report-only 的补丁计划（先看怎么补，再决定要不要写回）

### 0.0 先跑起来（复制粘贴）

如果你不想先理解任何概念，只想确认“这套链路能跑通 + 产物在哪 + 成功/失败怎么看”，按下面跑：

### 0.05 新手常见坑（先避雷）

- **用错工作目录**：推荐一直用 `pnpm -C examples/logix-cli-playground ...` 跑 demo（它自带 `logix.cli.json`，命令更短且不容易踩参数坑）。
- **exit code 2 不是崩溃**：它表示“门禁失败/发现差异”等可行动信号；真正的原因在输出目录的 JSON 里（尤其是 `contract-suite.verdict.json`）。
- **先 report 再 write**：默认 `--mode report` 不会写回源码；需要写回时必须显式 `--mode write`（建议先把 patch plan 看明白）。

**A) 最推荐：直接跑 demo scripts（最短、最不容易踩参数坑）**

```bash
pnpm -C examples/logix-cli-playground cli:contract:pass
```

产物默认会落在 `examples/logix-cli-playground/.logix/out/`，你只需要先看两类文件：

- `contract-suite.verdict.json`：PASS/WARN/FAIL + reasons（决定门禁结果）
- `trialrun.report.json`：试跑报告（用于解释“为什么失败/缺了什么”）

想顺带拿到“锚点缺口 → 最小补丁计划（不写回）”：

```bash
pnpm -C examples/logix-cli-playground cli:contract:with-autofill
```

会额外产出 `patch.plan.json` / `autofill.report.json`，并写入 `contract-suite.context-pack.json`（给 Agent 的最小事实包）。

**B) DevServer（WS bridge）：启动 30s 自动退出 + 纯命令行 call**

```bash
pnpm -C packages/logix-cli build
node packages/logix-cli/dist/bin/logix-devserver.js --port 0 --shutdownAfterMs 30000
```

随后（省略 `--url`：从 state file 自动发现）：

```bash
node packages/logix-cli/dist/bin/logix-devserver.js call --requestId demo-0 --method dev.workspace.snapshot
node packages/logix-cli/dist/bin/logix-devserver.js call --requestId demo-1 --method dev.run -- anchor index --repoRoot examples/logix-cli-playground
```

> 提示：`dev.run` 会在 argv 里缺失 `--runId` 时自动注入 `--runId <requestId>`，所以 `requestId` 既是 WS 关联 id，也能当作 CLI 的 runId。

### 0.1 我想在自己的 repo 里跑（不依赖 demo）

最小建议：先固定一个 `--outRoot`，把所有产物收敛到同一目录（便于排障与 diff）。

```bash
pnpm -C packages/logix-cli build
logix contract-suite run --runId demo --entry <modulePath>#<exportName> --outRoot .logix/out --includeContextPack
```

不懂 `entry` 怎么填：先照着 demo 里的入口跑一遍，再换成你自己的入口：

- `examples/logix-cli-playground/src/entry.basic.ts#AppRoot`

### 0.2 我想看权威说明（当你要写脚本/做 CI）

- `logix` 的命令表/参数/exit code：`specs/085-logix-cli-node-only/contracts/public-api.md`
- 工件命名与稳定性规则：`specs/085-logix-cli-node-only/contracts/artifacts.md`
- `logix-devserver` 的 CLI flags/WS 方法表：`specs/094-devserver-local-bridge/contracts/public-api.md`

---

## 1. 你能用它干什么（新接手开发者视角）

### 1.1 你只需要记住的默认入口：`contract-suite run`

当你刚接手一个模块、或者你刚改完一坨代码，第一件事通常不是“理解 IR 的字段”，而是：

- **我这次改动能不能过门禁？**
- **如果不过，失败原因能不能指到“下一步怎么做”？**

这就是 `logix contract-suite run` 的价值：一次执行同时拿到

- `contract-suite.verdict.json`：门禁结果（PASS/WARN/FAIL）与 reasons
- `trialrun.report.json`：解释用的试跑报告（告诉你缺了什么/冲突在哪）
- `contract-suite.context-pack.json`（可选或失败默认）：给 Agent/脚本的“最小事实包”（失败时更容易自动化处理）

> 你可以把它当成“统一入口的验收命令”。大多数人日常只需要先记住这一条，其他命令是“想更细粒度”时再用。

### 1.2 想更省心：`--includeAnchorAutofill`（只生成补丁计划，不写回）

如果门禁失败的原因是“缺少某些可回写字段/锚点”，你可以让它一次性把“缺口定位 + 最小补丁计划”也产出来：

```bash
logix contract-suite run --runId <id> --entry <entry> --includeAnchorAutofill
```

这会额外产出 `patch.plan.json` / `autofill.report.json`，并写入 `contract-suite.context-pack.json`。

### 1.3 其它命令你什么时候才需要（按需）

- 想把“导出”与“门禁”拆开跑（做基线 diff/更细的 CI 阶段）：`logix ir export` / `logix ir validate` / `logix ir diff`
- 想真正写回源码（默认不写回）：`logix anchor autofill --mode write`（谨慎；先 report 再 write）
- 想批量加 state/action 或补 stepKey：`logix transform module --ops ...`（同样建议先 report）

> 统一约束：stdout 单行 JSON（`CommandResult@v1`）；exit code 统一 `0=PASS / 2=VIOLATION / 1=ERROR`（详见 085 合同）。

### 1.4 “为什么要 runId/outRoot”（只要记住不踩坑即可）

CLI 把“可复现”分成三层：

1. **稳定运行标识**：`--runId` 必须显式提供（禁止 Date.now 默认值）。
2. **稳定序列化**：JSON 使用 stable stringify；超预算裁剪必须显式标记 `truncated/budgetBytes/actualBytes`。
3. **稳定落盘**：推荐用 `--outRoot <dir>`（或 `logix.cli.json` defaults.outRoot），自动落盘到 `<outRoot>/<command>/<runId>`，避免同 runId 多命令互相覆盖。

工件命名建议与稳定性规则：`specs/085-logix-cli-node-only/contracts/artifacts.md`

### 1.5 `logix.cli.json`：把命令变短（适合新接手快速上手）

配置查找与优先级（低→高）：

```text
logix.cli.json defaults < logix.cli.json profiles.<name> < argv（命令行显式参数）
```

实践建议：

- 在 demo/CI 里用 `--profile` 固化“同一场景的默认参数组合”（outRoot/entry/diagnosticsLevel/packMaxBytes…）。
- 布尔开关统一支持 `--flag/--noFlag`，且“最后出现者胜”，便于覆盖 profile 默认值。

### 1.6 Host adapters（`--host browser-mock`）：入口有浏览器全局时怎么跑

当入口模块顶层访问 `window/document/navigator` 等浏览器全局时，Node-only 的 CLI 会失败；此时可以显式：

- `--host browser-mock`

它的定位是：**为导出/试跑提供最小 browser globals**，用于 best-effort 跑道；不是完整浏览器语义，也不替代真实 e2e。

合同与错误码：`specs/099-cli-host-adapters/contracts/public-api.md`、`specs/099-cli-host-adapters/contracts/error-codes.md`

### 1.7 DevServer：把 CLI 变成 WS 可调用（并且默认只读）

DevServer（`logix-devserver`）解决的是另一类问题：

- Studio/Agent 想用 WS 调用 CLI，而不是在本机直接跑 `logix ...`；
- 需要一个可发现的 state file（读到 url/token/cwd），以及治理接口（status/health/stop）；
- 默认只读：避免在“远端调用”场景下出现误写回；只有显式 `--allowWrite` 才允许 `--mode write`。

协议与合同：

- 协议 SSoT：`docs/ssot/platform/contracts/04-devserver-protocol.md`
- CLI 合同：`specs/094-devserver-local-bridge/contracts/public-api.md`
- 安全硬化：`specs/101-devserver-safety-hardening/contracts/public-api.md`

> 关键坑：`logix-devserver call` 的 exit code **只反映协议调用是否 ok**；业务结果要看 stdout JSON 里的 `result.outcome.exitCode`（详见 094 合同）。

---

## 2. 核心链路（从 0 到 1）：最小闭环 + 常用增量

> 注意：`@logixjs/cli` 的 bin 指向 `dist/**`，所以任何 “直接跑 logix/logix-devserver” 前先 build（demo 脚本会自动 build）。

### 2.1 最小闭环（最推荐）：`contract-suite run` 一条命令拿到 verdict + context pack（可选）

在 `examples/logix-cli-playground` 内（demo 已配好 `logix.cli.json` 与 scripts）：

```bash
pnpm -C examples/logix-cli-playground cli:contract:pass
```

你会得到（默认落在 `.logix/out/...`，详见 demo README）：

- `trialrun.report.json`（结构 + 动态信息的最小摘要）
- `contract-suite.verdict.json`（门禁裁决：PASS/WARN/FAIL + reasons）
- （可选）`contract-suite.context-pack.json`（给 Agent 的最小事实包；失败默认输出，或显式 `--includeContextPack`）

### 2.2 需要“顺带定位锚点缺口”：`--includeAnchorAutofill`（report-only）

当你希望一次执行就拿到“锚点缺口 → PatchPlan/AutofillReport”的最小事实链：

```bash
pnpm -C examples/logix-cli-playground cli:contract:with-autofill
```

结果：

- 会额外产出 `patch.plan.json` / `autofill.report.json`
- 并把它们写进 `contract-suite.context-pack.json` 的 `facts.artifacts`（用于 Agent 直接生成最小补丁）

### 2.3 拆开“导出/门禁”（更适合做基线 diff）

当你想把“导出”与“门禁”拆成两步（例如 CI 做 baseline 对比）：

```bash
pnpm -C packages/logix-cli build
logix ir export --runId demo-ir --outRoot .logix/out
logix ir validate --runId demo-validate --in .logix/out/ir.export/demo-ir --outRoot .logix/out
```

（需要对比基线时）：

```bash
logix ir diff --runId demo-diff --before <baselineDir> --after <currentDir> --outRoot .logix/out
```

### 2.4 需要 trace（非门禁口径）：`--includeTrace`（CLI）+ `--trace`（DevServer）

CLI 侧让 `trialrun/contract-suite` 产出 `trace.slim.json`：

```bash
pnpm -C examples/logix-cli-playground cli:trialrun:trace
```

DevServer 侧把 trace 作为 event 流桥接给 WS 客户端（`dev.event.trace.*`），适合 Studio/Agent 边跑边消费（仍遵守预算）。

合同：`specs/102-devserver-trace-bridge/contracts/public-api.md`

---

## 3. DevServer 剧本：Local WS（dev.info / dev.workspace.snapshot / dev.run / dev.runChecks / dev.cancel / dev.stop）

### 3.1 最小：启动 + snapshot + dev.run

```bash
pnpm -C packages/logix-cli build
node packages/logix-cli/dist/bin/logix-devserver.js --port 0 --shutdownAfterMs 30000
```

随后（省略 `--url`，从 state file 读）：

```bash
node packages/logix-cli/dist/bin/logix-devserver.js call --requestId demo-0 --method dev.workspace.snapshot
node packages/logix-cli/dist/bin/logix-devserver.js call --requestId demo-1 --method dev.run -- anchor index --repoRoot examples/logix-cli-playground
```

要点：

- `dev.run` 默认会把 `--runId <requestId>` 注入到 argv（如果 argv 里没有 `--runId`），让 CLI 的确定性规则在 WS 场景里仍成立。
- 你可以用 `dev.info` 读取 `capabilities.write`（默认 `false`）。

### 3.2 只读防误写：readOnly 下的 `ERR_FORBIDDEN`

默认 readOnly 时，只要 argv 试图写回（包含 `--mode write` 或 `--mode=write`），`dev.run` 会直接返回：

- `ok:false`
- `error.code === "ERR_FORBIDDEN"`

要允许写回，必须在启动 devserver 时显式 `--allowWrite`（并建议在 CI/本地脚本里也同时显式 `--readOnly/--allowWrite` 自解释）。

### 3.3 trace events：`--trace` + `--includeEvents`

如果你想在纯命令行里“收集 trace events”用于调试（而不是用 WS 客户端实时消费），可以让 call 进程累积 events：

```bash
node packages/logix-cli/dist/bin/logix-devserver.js call --requestId demo-trace --method dev.run --includeEvents --trace -- \
  trialrun --entry examples/logix-cli-playground/src/entry.basic.ts#AppRoot --includeTrace
```

说明：

- `--trace` 只是打开 “devserver 桥接 trace” 的开关；trace 的来源仍来自 CLI 产物（需要 argv 里显式 `--includeTrace`）。
- `--includeEvents` 让 `call` 把 event 数组塞回最终 stdout JSON（否则 events 仍会通过 WS 发出，但 `call` 不会累积输出）。

---

## 4. 代码锚点（Code Anchors）

### 4.1 CLI（`logix`）

- `packages/logix-cli/src/Commands.ts`：统一入口（stdout 单行 JSON、exit code 策略、命令分发）
- `packages/logix-cli/src/internal/args.ts`：argv 解析（`--runId` 强制、`--outRoot` 目录收敛、`--host` 等）
- `packages/logix-cli/src/internal/artifacts.ts`：artifact 输出（落盘 vs inline，预算裁剪）
- `packages/logix-cli/src/internal/host/*`：Host adapters（node / browser-mock）

### 4.2 DevServer（`logix-devserver`）

- `packages/logix-cli/src/bin/logix-devserver.ts`：CLI 外壳（start/status/health/stop/call）
- `packages/logix-cli/src/internal/devserver/server.ts`：协议实现（`dev.run` 注入 runId、readOnly 拦截、trace bridge）
- `packages/logix-cli/src/internal/devserver/protocol.ts`：协议类型（与 SSoT 对齐）

### 4.3 可运行 demo

- `examples/logix-cli-playground/README.md`：最小可运行闭环（profiles/outRoot/context pack）

---

## 5. 验证方式（Evidence）

- CLI 最小回归：优先用 demo 的脚本（它覆盖 `export/trialrun/contract-suite` 的主链路）：
  - `examples/logix-cli-playground/package.json`（`scripts.cli:*`）
- DevServer 最小回归：按 `specs/094-devserver-local-bridge/quickstart.md` 走一遍（建议带 `--shutdownAfterMs` 防驻留）

---

## 6. 常见坑（Anti-patterns）

1. **没 build 就跑 `logix`**：bin 指向 `dist/**`，没 build 会直接找不到入口（demo scripts 已自动 build）。
2. **误解 exit code**：
   - `logix` 的 exit code 表达门禁（0/2/1）
   - `logix-devserver call` 的 exit code 只表达“协议调用是否成功”；业务结果看 stdout JSON 里的 `result.outcome.exitCode`
3. **`--out` vs `--outRoot` 覆盖**：复用同一个 `runId` 但共用 `--out` 会覆盖工件；推荐 `--outRoot`。
4. **在 readOnly devserver 上写回**：默认会 `ERR_FORBIDDEN`；需要写回必须显式 `--allowWrite`（并建议把写回与门禁拆开跑）。
5. **把 `browser-mock` 当成真实浏览器**：它只为“入口能加载/能跑就跑”的 best-effort 跑道服务；语义差异需要用真实浏览器/Playwright 另证。

---

## 7. 附录：门禁口径与错误码速查（不懂 IR 也能用）

### 7.1 门禁口径（建议：哪些文件适合做 baseline/CI gate）

当你要做“可复现门禁/可对比基线”时，建议把工件分成两类：

- **gating（门禁口径）**：用于 byte-level 复现对比或 gate 报告
  - `control-surface.manifest.json` / `workflow.surface.json`（结构清单；用于稳定引用与 diff）
  - `ir.validate.report.json` / `ir.diff.report.json`（结构化 gate 报告）
  - `contract-suite.verdict.json`（一键验收裁决）
- **non-gating（证据/上下文口径）**：用于解释与排障，不建议作为 byte-level gate 基线
  - `trialrun.report.json`、`trace.slim.json`
  - `contract-suite.context-pack.json`（Agent 最小事实包）
  - `patch.plan.json` / `autofill.report.json` / `writeback.result.json` / `transform.report.json`

更完整的工件命名与稳定性规则：`specs/085-logix-cli-node-only/contracts/artifacts.md`

### 7.2 高频错误码（如何自救）

CLI（`logix`）侧：

- `CLI_MISSING_RUNID`：补 `--runId <id>`（DevServer 的 `dev.run` 会在缺失时自动注入 `--runId <requestId>`）。
- `CLI_CONFIG_INVALID` / `CLI_INVALID_INPUT`：修复 `logix.cli.json`（未知字段/schemaVersion 不支持等）；必要时用 `--cliConfig` 显式指定路径。
- `CLI_HOST_MISSING_BROWSER_GLOBAL`：入口顶层访问浏览器全局时，显式 `--host browser-mock`（见 099）。
- `CLI_HOST_MISMATCH`：确认当前 host 与入口预期一致；避免“已注入 browser-mock 但仍按 node 跑”的混用。

DevServer（`logix-devserver`）侧：

- `ERR_STATE_NOT_FOUND`：没找到 state file；显式 `--stateFile` 或设置 `LOGIX_DEVSERVER_STATE_FILE`，并确认 devserver 已启动。
- `ERR_UNAUTHORIZED`：devserver 启用了 token；在 `call` 侧补 `--token` 或设置 `LOGIX_DEVSERVER_TOKEN`。
- `ERR_FORBIDDEN`：readOnly 下禁止写回；移除 `--mode write`，或启动 devserver 时显式 `--allowWrite`。
- `ERR_CALL_FAILED`：url/超时/WS 异常；优先 `logix-devserver status/health` 确认可达，必要时提高 `--timeoutMs`。

DevServer 协议与错误码口径以 SSoT 为准：`docs/ssot/platform/contracts/04-devserver-protocol.md`
