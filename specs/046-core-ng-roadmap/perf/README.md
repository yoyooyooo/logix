# 046 / perf：38db（before）→ 当前（after）综合对比解读

> 目标：把「046 这一大波实现之前」与「当前」的性能收益，用**同一套 Browser perf 口径**做一次可交接的 before/after 综述；
> 同时给未来需求提供“该往哪里继续压、该用什么门禁守住”的方向。

## 证据文件（本次对比的单一事实源）

- before：`./before.browser.38db2b05.darwin-arm64.20260101-005537.default.json`
- after：`./after.browser.c2e7456d.darwin-arm64.20260101-005537.default.json`
- diff：`./diff.browser.38db2b05__c2e7456d.darwin-arm64.20260101-005537.default.json`

> 这三份文件是同一套 matrix/环境下采集并 diff 的结果；本次为对齐 `38db` 的可用套件，采集的是 matrix 的子集（见 report 的 `suites`）；解读以它们为准，避免口径漂移。

## Policy Update（2025-12-31）：默认单内核回退为 core（core-ng 仅对照/试跑）

证据文件：

- Browser：
  - before：`./before.browser.default-kernel.core-ng.darwin-arm64.20251231-235522.default.json`
  - after：`./after.browser.default-kernel.core.darwin-arm64.20251231-235522.default.json`
  - diff：`./diff.browser.default-kernel.core-ng__core.darwin-arm64.20251231-235522.default.json`（`comparable=true`；`regressions=0`）
- Node：
  - before：`./before.node.default-kernel.core-ng.darwin-arm64.20251231-235522.default.json`
  - after：`./after.node.default-kernel.core.darwin-arm64.20251231-235522.default.json`
  - diff：`./diff.node.default-kernel.core-ng__core.darwin-arm64.20251231-235522.default.json`（`comparable=true`；`regressions=1`）

解读（简要）：

- Browser（`react.bootResolve`）：本次对比下 core 与 core-ng 无显著差异（diff neutral）。
- Node（`converge.txnCommit`）：`auto<=full*1.05` 阈值在 `dirtyRootsRatio=0.75` 出现回退：core 在 `steps=200` 时 `auto/full≈1.23`（fail），core-ng 为 `≈1.03`（pass）。这是“kernel 实现差异”而非单内核装配期分支成本；若需要抹平差异，需要把 core 的 auto 决策/实现向 core-ng 对齐，或在 perf/对照场景继续显式跑 core-ng。

## 实验（未采纳）：core 默认开启 ExecVmMode（计划复用 typed-array 降分配）

证据文件：

- Node：
  - before：`./before.node.default-kernel.core.exec-vm-mode.off.darwin-arm64.20251231-234252.default.json`
  - after：`./after.node.default-kernel.core.exec-vm-mode.on.darwin-arm64.20251231-234252.default.json`
  - diff：`./diff.node.default-kernel.core.exec-vm-mode.off__on.darwin-arm64.20251231-234252.default.json`（`comparable=true`；`regressions=1`）

结论：

- 该开关当前主要影响 `converge` 的 plan 计算复用策略（typed-array 复用 vs 新分配）；对外语义不变，但会改变默认热路径形态。
- 本次证据下，`converge.txnCommit` 的相对预算 `auto<=full*1.05` 在 `dirtyRootsRatio=0.75` 出现回退（after:budgetExceeded），不满足“纯赚 + 可作为默认”的门槛。
- 因此选择：**保持 core 默认关闭**；仅在 `core-ng` / perf 对照场景通过 Layer/环境显式开启（未来若有稳定收益证据再讨论默认切换）。

## 对比口径（为什么这次 before 的 `git.dirty=true` 仍然“可比”）

你要求的对比口径是：

- **before 基线**：`38db2b0525e00e98fb24f696e7332dc9e89bbf40`（046 实施之前节点）
- **after 基线**：当前最新提交（本次 evidence 为 `c2e7456d498ebd1465d94ec4b6e8535b726ea8cc`）
- **关键额外约束**：因为 `38db` 与当前 perf harness 差异较大，所以把“最新 perf 相关代码”覆盖到 before 上去跑证据。

因此这次出现：

- `before.meta.git.dirty=true` / `after.meta.git.dirty=true`
- diff 里也会出现 `git.dirty.*` 的 warning

但 **可比性仍成立**，因为我们用的是“只比较 runtime 行为”的口径：

- `before.meta.matrixHash` 与 `after.meta.matrixHash` **一致**（同一套参数矩阵）
- `before.meta.env` 与 `after.meta.env` **一致**（同一台机器、同一套 Node/Playwright/Chromium 版本）
- `before.meta.config` 与 `after.meta.config` **一致**（runs/warmup/timeout/stability 一致）

换句话说：这不是“两个提交的完整仓库对比”，而是“两个 runtime 核心版本在同一套 perf harness 下的对比”。

## 你该如何读这次 diff（不要被噪声带偏）

Browser perf 的核心问题是噪声（tab 切换/省电/后台负载/Chromium 抖动）。因此本仓的证据输出有两种“更抗噪”的读法：

1) **阈值/容量视角（优先）**：`thresholdDeltas` 关心“在 p95≤Xms 的预算下，最大能承载到多大规模（maxLevel）”。
2) **尾部延迟视角（辅助）**：看 `p95Ms` 的 before/after 比值（ratio），但要注意：当基线本身非常小（比如 0.2ms）时，0.1ms 的抖动会被放大成 1.5x。

另外，`diff.*.json` 里的 `stabilityWarning` 不代表回退，它只是在提示：本次测量里出现了超过稳定性阈值的点，需要用“复测/隔离噪声”的方式确认。

## 总体收益（先看结论）

### 1) 热路径：`txnCommit` 进入“能跑满 + 尾部大幅下降”的新阶段

- **可跑规模显著提升**：`converge.txnCommit` 的 point 状态从 `ok=20 timeout=10 skipped=6` → `ok=36`（before 有大量超时/跳过，after 全部跑完）。
- **尾部延迟（可对齐 20 点）显著下降**：对 overlap 的 20 个点，`runtime.txnCommitMs.p95` 的 ratio：
  - median ≈ `0.11`（约 **-89%**）
  - best（最“慢”的点也大幅改善）：`11.37ms → 0.42ms`（约 **-96%**）
- **容量门禁翻倍/数量级提升**（阈值视角）：`commit.p95<=50ms` 在多组 `dirtyRootsRatio` + `convergeMode` 下的 `maxLevel` 从 `200~800` 提升到 `2000`（见 diff 的 `thresholdDeltas`）。

这类收益属于“算法/架构级”的：一旦成立，未来需求应该优先以它为预算锚点，避免被 e2e 噪声掩盖。

### 2) 负优化边界：`dirtyPattern` 变成更可靠的回归防线

- `negativeBoundaries.dirtyPattern` 72/72 点均可对齐对比。
- `runtime.txnCommitMs.p95` ratio：
  - median ≈ `0.057`（约 **-94%**）
  - min ≈ `0.042`（约 **-96%**）
  - worstBefore 示例：`14.8ms → 0.8ms`（约 **-95%**）

这是“把最坏情况压下去”的收益：对长期演进非常关键，因为它直接决定“业务遇到高基数/异常模式时会不会被拖死”。

### 3) 体验端容量：StrictMode 下的 watchers 承载翻倍

`watchers.clickToPaint` 的绝对 p95 基本在噪声范围内波动（median ratio ≈ `0.96`），但更重要的是阈值容量：

- `p95<=50ms`（StrictMode=true）：`max watchers 64 → 128`
- `p95<=100ms`（StrictMode=true）：`max watchers 256 → 512`

这类收益应该用“容量阈值”表达与守门，而不是执着于每个点的 ms 级抖动。

### 4) 诊断开销：整体维持近似不变（无新增长期税）

`diagnostics.overhead.e2e`（4 个点）在不同 `diagnosticsLevel` 下的 `e2e.clickToPaintMs.p95`：

- median ratio ≈ `1.02`（约 `+2%`），处在 Browser 噪声/抖动可解释范围内

结论：当前 046 这波改动没有引入明显的“诊断长期税”；但后续仍应把它当作预算门禁持续守住。

## 分 suite 深度解读（收益“是什么”与“为什么重要”）

### converge.txnCommit：从“局部快”到“可预测 + 可扩容”

1) **before 的问题不是“慢一点”**，而是 **大量 timeout/skip** —— 这会让 perf 证据失真，也意味着线上某些负载下会进入不可控区间。
2) **after 的关键变化** 是：在同样 `timeoutMs=20000` 下，**所有点都能完成**，同时在可对齐点上 p95 大幅下降。
3) **如何把它变成未来需求的方向**：
   - 继续把 `commit.p95<=50ms` 的 `maxLevel` 当作“硬指标”，优先追求：更高 `dirtyRootsRatio` 下仍能保持高 `maxLevel`。
   - 新增/重构 runtime 热路径时，先问：会不会让 `timeout/skipped` 回来？会不会让 `thresholdDeltas` 逆转？

### negativeBoundaries.dirtyPattern：把“高基数/坏模式”从恐怖故事变成可测回归

这个 suite 的价值不是平均速度，而是：

- 它系统性地扫 `uniquePatternPoolSize`、`patternKind` 等参数，模拟“业务写出坏模式/高基数”的情况；
- 目标是：让最坏点也可控（否则产品体验会出现“偶发卡死”的诡异问题）。

本次收益（p95 median ≈ 0.057）表明：core-ng 这波优化对“坏模式”收益更大，这是非常健康的信号。

### watchers.clickToPaint：StrictMode 的“可承载规模”是主指标

这个 suite 受 UI、事件循环、浏览器抖动影响大：

- 不建议把每个点的绝对 ms 当作硬门禁；
- 更推荐把“在 p95<=Xms 下能承载到多少 watchers”当作 capacity KPI。

本次 diff 给出的阈值翻倍，是可交接且可行动的方向：未来若要继续优化，应优先看 strictMode 的上限还能否再推。

### diagnostics.overhead.e2e：守住“诊断能力不变成长期税”的底线

这里的核心不是“off 最快”，而是：

- `off/light/sampled/full` 的开销分布是否稳定；
- 修改诊断事件/采样策略/Devtools 链路时，是否把它推高并引入长期税。

本次结果近似持平：可以把它当作未来需求的“守门人”而不是“主战场”。

### form.listScopeCheck：微基准的离散化效应（别用 ratio 误伤自己）

该 suite 的 `txnCommitMs.p95` 在 `0.2ms` 量级，出现 `0.2→0.3ms` 这类变化时：

- **绝对差只有 0.1ms**，但 ratio 会变成 `1.5x`；
- 更像是 timer 分辨率、测量离散化、浏览器抖动导致的“台阶效应”。

建议把它当作“必须保持 sub-ms” 的粗门禁；若要深挖，需要把 workload 放大（让基线从 0.xms 拉到 5~20ms 区间）再谈 ratio。

### react.bootResolve / react.deferPreload：总体稳定（保持“不回退”即可）

两者的 p95 波动基本在几个 ms 以内（median≈1.00）。从 046 这次综合对比视角看：

- 它们不是当前收益主来源；
- 未来需求除非明确触及 boot/resolve 链路，否则保持“不回退”即可。

### react.strictSuspenseJitter：本次口径下“不可测”，需要先让它可测

本次 before/after 都出现 `timeout/skipped`（diff 里 `budget.cutOffCount=6`），导致 **没有可对齐的 ok 点**，因此无法下结论。

下一步如果要把它纳入 046 的综合证据：

- 要么收敛矩阵（减少规模/步骤），让它能在 `timeoutMs` 内跑完；
- 要么把它从 `profile=default` 拆到单独 profile（更长 timeout、或更小参数集）；
- 或者明确它是“极端场景”，用 Node/非浏览器 runner 先做可测版本。

## 复现与复测（未来需求的统一跑法）

> 这里只写“最小复现要点”，避免把脚本细节写死；实际以本仓 perf harness 的命令为准。

- **采集入口（Collect）**：`pnpm perf collect`（会运行 `packages/logix-react` 的 Vitest browser project，并从 stdout/stderr 抓取 `LOGIX_PERF_REPORT:<json>` 合并落盘）。
- **对比入口（Diff）**：`pnpm perf diff -- --before <before.json> --after <after.json> --out <diff.json>`

- **kernel 选择（Browser）**：用 `VITE_LOGIX_PERF_KERNEL_ID` 控制 perf 用哪个 kernel：
  - 未设置：默认跑 `core`
  - `VITE_LOGIX_PERF_KERNEL_ID=core`：显式跑 core（用于固定口径/对照）
  - `VITE_LOGIX_PERF_KERNEL_ID=core-ng`：显式跑 core-ng（对照/试跑）
- **ExecVmMode（Node/core）**：用 `LOGIX_PERF_EXEC_VM_MODE=on|off` 控制 core 的 ExecVmMode（仅对 core 生效；core-ng 仍由 `LOGIX_CORE_NG_EXEC_VM_MODE` 控制）
- **硬门禁开关（只用于采集/调试）**：`VITE_LOGIX_PERF_HARD_GATES=off` 可避免某些 suite 在预算不达标时直接 throw 中断（默认开启 hard gates；CI/门禁不要长期关）。

- **强制同口径**：确保 `matrixHash/config/env` 三者一致；否则不要对 ratio 下结论。
- **噪声隔离**：避免切 tab / 开重负载；必要时复跑两次取一致结论。

**本次对比的最小复现示例**（按需替换输出文件名）：

- after（core-ng，profile=default）：`VITE_LOGIX_PERF_KERNEL_ID=core-ng pnpm perf collect -- --profile default --out specs/046-core-ng-roadmap/perf/after.browser.<gitSha>.<env>.default.json`
- before（core，profile=default）：`pnpm perf collect -- --profile default --out specs/046-core-ng-roadmap/perf/before.browser.<gitSha>.<env>.default.json`
- diff：`pnpm perf diff -- --before <before.json> --after <after.json> --out specs/046-core-ng-roadmap/perf/diff.browser.<before>__<after>.<env>.default.json`
