# Harness Path：171 实施自验证

本页把 171 实施收缩成 harness-first 路线。它不新增 public API，也不扩大 171 v1 能力范围。它只规定实施 Agent 如何在无需用户参与的情况下证明实现符合规划。

## 目标

第一轮必须证明：

```text
attach
  -> target discovery
    -> capture or dispatch
      -> canonical evidence export
        -> trial or compare
          -> VerificationControlPlaneReport.repairHints
```

同时证明：

- `LiveCommandResult` 只给 repair clues 和 artifact refs。
- `CommandResult` 只服务 `check / trial / compare`。
- live output 不拥有 verdict、repairHints、nextRecommendedStage、runtime identity、session truth 或 evidence envelope。
- disabled path 是 structural no-op 或 static-empty。
- mutation-capable denial 是 pre-mutation 且 no mutation。

## 路线选择

采用 `Harness-first`。

原因：

- 171 触及 runtime hot path、CLI、Playground、DVTools、Workbench 与 evidence projection，失败面宽。
- 没有 harness 时，Agent 容易只证明“接口存在”，不能证明“闭环真实可运行”。
- 浏览器 proof、runtime attachment、evidence export 和 repairHints linking 必须先可复现，后续实现才有约束力。

## Harness Pack

### Run

```bash
rtk pnpm -C packages/logix-core typecheck
rtk pnpm -C packages/logix-cli typecheck
rtk pnpm -C examples/logix-react typecheck
```

### Smoke

```bash
rtk logix live start
rtk logix live status
rtk logix live targets --tree
rtk logix live inspect <target>
```

### Browser Proof Tools

Playwright 是可复现 browser proof 的主工具，适合进入 CI 或 final proof。

`agent-browser` 是交互式、探索式、QA/dogfood 辅助工具，适合实施过程中定位 browser host、Playground route、DOM/console/runtime 状态。它可以生成 screenshot、accessibility snapshot、console/errors、network requests、video 或 CDP trace，但不能单独关闭最终 proof。

允许使用：

```bash
rtk agent-browser open <url>
rtk agent-browser snapshot
rtk agent-browser screenshot <path>
rtk agent-browser console
rtk agent-browser errors
rtk agent-browser network requests
rtk agent-browser record start <path> <url>
rtk agent-browser record stop
rtk agent-browser trace start <path>
rtk agent-browser trace stop <path>
rtk agent-browser stream enable
rtk agent-browser stream status
```

使用边界：

- `agent-browser` 产物只能作为辅助 artifact 或 failure inspection material。
- final closure 必须有可重复命令：Playwright test、Vitest、CLI proof script、perf command 或 text sweep。
- 人工截图或人工浏览判断不能关闭 W171 proof。
- `agent-browser` trace/profile 不能把 raw browser trace 升级成 `171` evidence authority。
- 浏览器 console/error 只能辅助定位；进入修复闭环仍必须导出 canonical evidence package。

### Logs / Structured Artifacts

必须记录结构化 proof，不接受只读 human log：

- attachment lifecycle state。
- target coordinate。
- static-live binding header。
- operation admission outcome。
- noMutation marker。
- capture artifact ref。
- evidence export ref。
- trial/compare report ref。
- repair hint refs。
- dropped/degraded/redacted markers。

### Tests

Loop-1 最小测试组：

- disabled bridge no-op。
- target discovery。
- capture event facet。
- canonical evidence export。
- `LiveCommandResult` 不含 `repairHints / nextRecommendedStage / verdict`。
- `CommandResult` 不服务 live。
- stale manifest / unauthorized target denial no mutation。
- live evidence -> trial/compare -> repairHints link。

### Repro Fixture

必须提供一个 dogfood fixture：

```text
one running runtime
one declared action
one invalid dispatch case
one captureable failure
one evidence export
one verification report with repairHints
one browser/Playground route if browser proof is in scope
```

### Failure Inspection Path

失败时按顺序检查：

1. `LiveCommandResult` 是否存在。
2. `primaryLiveOutputKey` 是否指向 artifact。
3. artifact 是否有 target/evidence/operation facet。
4. evidence package 是否 canonical。
5. trial/compare 是否消费了 evidence ref。
6. report 是否有 `repairHints`。
7. repair hint 是否能追溯到 live-derived artifact。
8. browser proof 失败时先看 Playwright trace，再看 `rtk agent-browser snapshot/console/errors/network`。

## Loop-1 Contract

Objective：

- 打通一条最小无人验收闭环：live capture/export 后，verification report 产出 repairHints，并证明 live 没有越权产 verdict 或 repair advice。

Deliverable：

- dogfood fixture。
- CLI/core/browser proof commands。
- verification note 记录命令、摘要、artifact refs。
- 最小 CLI/core/browser tests。

Validation：

- `rtk git diff --check`
- targeted typecheck。
- targeted unit/integration tests。
- Playwright browser dogfood proof。
- optional `agent-browser` inspection artifacts for failed or exploratory runs。
- final negative text sweep。

Done evidence：

- 命令退出码。
- 测试通过摘要。
- artifact paths。
- `notes/verification.md` 中 W171-001、W171-003、W171-006、W171-009 proof record。
- `notes/perf-evidence.md` 中 W171-002 proof 或 blocked reason。
- `scenarios.md` required 场景已有 proof refs 或 owner handoff。

Out of scope：

- cloud remote protocol。
- full DevTools UI。
- deep profiler。
- scenario executor 成功路径。
- automatic code patch generation。

## Loop-1 Starter Checklist

1. 建 dogfood fixture：runtime + declared action + startup failure + invalid dispatch + browser route。
2. 写 proof command sequence：attach、targets、capture、export、trial/compare。
3. 写 Playwright proof，覆盖 browser route、live attach offer、capture/export handoff。
4. 用 `agent-browser` 做探索式 smoke，保存失败时必要的 screenshot/snapshot/console/errors artifact。
5. 写 negative tests：`LiveCommandResult` 不得有 `repairHints / nextRecommendedStage / verdict`。
6. 实现最小 live target discovery 和 capture/export path。
7. 实现 operation denial no mutation cases。
8. 接 verification lane，证明 evidence ref 能进入 `trial/compare` 并产生 report-owned repairHints。
9. 更新 `notes/verification.md` 和 `notes/perf-evidence.md`。
10. 跑 final sweep，确认没有 second truth、flat root、live-owned repair。

## Expansion Rails

Loop-1 通过后再扩：

- Rail 1：完善 `dispatch/wait/snapshot` transition proof。
- Rail 2：DVTools / Playground projection parity。
- Rail 3：researchability header 与 bounded profile summary。
- Rail 4：cloud attachment spec，只在 local proof 稳定后重开。
