# Perf Evidence（如何跑、如何读、如何对比）

> 目标：把 perf 跑道产出的 `PerfReport / PerfDiff` JSON 变成“可回归、可交接”的性能证据。
> 读者包含：人类（review/调参/回归定位）与 LLM（自动总结/判定回归/产出报告）。

新增/扩展场景（suite/矩阵/用例/脚本）见：`.codex/skills/logix-perf-evidence/references/authoring.md`

## 你会得到什么（产物）

- `before.*.json`：某次认可的基线（Baseline），用于后续 Before/After 对照。
- `after.*.json`：某次对比样本（After），通常是当前工作区（working tree）或某个 commit。
- `diff.*.json`：Before/After 的对比结果（机器可读 + 人类可扫）。

推荐做法：**证据落在特性目录**（`specs/<id>/perf/*`），而不是散落在临时目录。

默认约定：`<id>` 可由用户显式提供（例如输入里直接出现 `specs/NNN-xxx`）；若未明确指定则优先从对话上下文推断，推断失败再询问。

## 术语澄清：`local`（当前工作区） vs `git worktree`（子工作区）

- 本文出现的 `after.local.json` 中的 `local` 指“采集时所在当前工作区（working tree）”，**不要求**你使用 `git worktree add`。
- 当需要隔离采集时，本文会明确写 `git worktree（子工作区）`，避免与“当前工作区”混淆。

## baseline 的两种含义（都支持）

- **验收当前需求（A/B 或预算内）**：`before` 可以是“改动前代码”，也可以是“同一代码下的参考配置/参考引擎”；`after` 是目标实现/目标配置。目标是量化成本/收益，或验证是否落在预算内。
- **防止未来回退（长期基线）**：把本次验收通过的 `before.*.json` 作为长期基线，后续触到同链路时重跑相同 suite/预算，用 `diff` 判回退。

## 两种模式（按你当前诉求选）

### 探索模式（并行迭代优先）

- 允许 before/after 混杂其它改动，目标是“快速比较方向”，不是下硬结论。
- 建议 `profile=quick`，在同一工作区多次 collect，落盘用 `r1/r2/...` 或时间戳区分（例如 `after.local.<envId>.quick.r1.json`）。
- diff 用 `pnpm perf diff:triage`（允许 config/env drift）；当 `meta.comparability.comparable=false` 时只作为线索，不宣称“已达标/已回归”。
- budgets/门禁可以先当作参考指标，不强行卡死；但最好把观察到的 tradeoff 写进结论（例如“提升 X 但引入 Y 成本”）。

### 交付模式（硬结论/长期基线）

- 需要对外宣称“已回归/已达标/可作为长期基线”时，再按下方 `MUST` 口径补一份更严格、可复现的证据。

## 最短闭环：做一次 Before/After（推荐流程）

1. 固定环境与档位（同机同配置才可对比）：

- 同 OS/arch/CPU/浏览器版本/headless
- profile：`quick`（探路）/ `default`（交付结论）/ `soak`（更稳更贵）

2. 采集 Before（基线）：

- **默认快跑（不切 `git worktree` 子工作区）**：在你开始改动前，先在当前工作区跑一次 collect，把输出写成 `specs/<id>/perf/before.local.<envId>.<profile>.json`（或你认可的命名）。
- **硬门（可复现）**：在你认可的 baseline commit 上跑一次 collect（可通过 `git worktree` 子工作区隔离采集），写入 `specs/<id>/perf/before.<sha>.<envId>.<profile>.json`。

3. 采集 After（当前对比）：

- 在目标代码/配置上跑 collect，写入 `specs/<id>/perf/after.<sha|local>.<envId>.<profile>.json`。

4. 运行 diff 并落盘：

- 写入 `specs/<id>/perf/diff.<before>__<after>.json`

## 规划期硬门（MUST，强制写进 plan.md）

> 目标：让“性能证据”不是实现末尾的附属品，而是规划期就能落地的硬门；否则实现完很容易出现“before/after 不可比、结论不硬、只能马后炮”的情况。

### MUST-0：交付结论必须用 `default`/`soak`

- `quick` 只用于迭代探路：可以用来发现“疑似退化”的线索，但不允许用它下“已回归/已提升”的硬结论。
- 要下硬结论：before/after 必须同机同浏览器版本/同 headless，且同 `profile=default`（更稳更贵用 `soak`）。
- 若定位阶段先跑 `quick`：必须在结论里写清“仅 quick 观测，待 default/soak 复测确认”，并把复测作为阻塞项写回任务/清单。

### MUST-1：明确 baseline 语义（选一条并写清楚）

- **代码前后（Commit A → Commit B）**：before=改动前代码，after=改动后代码（最常见的“是否回归”问题）。
- **策略/配置 A/B（同一代码）**：before=参考策略（例如 `sync`），after=目标策略（例如 `suspend/defer`）（最适合回答“策略权衡/成本模型”问题）。

### MUST-2：锁死可比性参数（before/after 必须一致）

对同一份 before/after，对比结论必须满足：

- 同环境：同机、同浏览器版本、同 headless、避免后台重负载；
- **同采样参数**：同 `profile`（以及等价的 `runs/warmupDiscard/timeoutMs`）。
- **同矩阵口径**：同 `matrixId` 且 `matrixHash` 一致（suite/axes/budget 漂移会直接导致阈值/档位结论不可比）。

> 强制规则：`quick` 只能用于迭代探路；要下“硬结论”，必须用 `default`（或 `soak`），且 before/after 必须同 profile。

### MUST-3：把“证据命名与落点”当成交付物

建议在 plan.md 写死：

- envId（用于保证可比性）：`<os>-<arch>.<cpu>.<browser>-<version>.<headless>`
- 文件命名：
  - `specs/<id>/perf/before.<gitSha>.<envId>.<profile>.json`
  - `specs/<id>/perf/after.<gitSha|local>.<envId>.<profile>.json`
  - `specs/<id>/perf/diff.<before>__<after>.json`

### MUST-4：在计划里写“失败策略”

- 若 diff 出现 `stabilityWarning` 或点位 `timeout`：结论必须标注“不确定”，并升级为 `default/soak` 复测，或缩小矩阵/只跑子集（`--files`）。

### Plan Snippet（复制到 `specs/<id>/plan.md` 即可）

```text
## Perf Evidence Plan（MUST）

- Baseline 语义：代码前后 / 策略 A/B（填其一）
- envId：<...>
- profile：default（交付）/ soak（更稳）
- collect（before）：pnpm perf collect -- --profile <profile> --out specs/<id>/perf/before.<sha>.<envId>.<profile>.json [--files ...]
- collect（after）：pnpm perf collect -- --profile <profile> --out specs/<id>/perf/after.<sha|local>.<envId>.<profile>.json [--files ...]
- diff：pnpm perf diff -- --before specs/<id>/perf/before...json --after specs/<id>/perf/after...json --out specs/<id>/perf/diff.before...__after....json
- Failure Policy：若出现 stabilityWarning/timeout → 复测（profile 升级或缩小子集）
```

## 工作法（把 perf 当成“可回放的实验”）

### 做改动前（建立可对比前提）

- 选定 baseline：使用已固化的 `before.*.json`（可能来自改动前代码或参考配置），或在开始对比前先采一份 `after.<sha>.<envId>.json` 并重命名为 `before.<sha>.<envId>.json`
- 固定环境：同机同浏览器版本/同 headless；避免后台重负载
- 选择 profile：默认用 `default` 作为“可交付结论”；`quick` 用于迭代中快速反馈

### 做改动后（采集与判定）

- 采集 after：落盘到 `after.*.json`
- 运行 diff：输出 `diff.*.json`
- 写结论（建议按 suite 优先级汇总）：
  - 主要看 `thresholdDeltas`（当前 diff 里 `budgetViolations` 仍是预留字段）
  - 关键硬门是否通过（例如 `auto<=full*1.05`）
  - `maxLevel` 的变化（提升/回归）
  - 稳定性告警与是否需要复测

## 命令入口（统一通过本 skill）

> 说明：browser mode 内不直接写文件，默认通过 `LOGIX_PERF_REPORT:<json>` 单行输出 + collect 脚本落盘。

- 采集（默认口径）：`pnpm perf collect`
- 采集（快速口径）：`pnpm perf collect:quick`
- 对比：`pnpm perf diff -- --before <before.json> --after <after.json> --out <diff.json>`
- 只跑子集（例：只跑 converge suite 文件）：`pnpm perf collect -- --files test/browser/perf-boundaries/converge-steps.test.tsx --out specs/<id>/perf/after.local.json`
- 校验（硬结论门禁）：`pnpm perf validate -- --report <before|after>.json`（子集采集可加 `--allow-partial`）

## 命名约定（envId / before / after）

- envId 建议：`<os>-<arch>.<cpu>.<browser>-<version>.<headless>`（示例：`darwin-arm64.m2max.chromium-131.headless`）
- 同一份 Before/After 对照必须同机同配置（同 envId + 同 profile/runs/warmup/timeout + 同浏览器版本/headless）
- 推荐文件名：
  - `specs/<id>/perf/before.<gitSha|local>.<envId>.<profile>.json`
  - `specs/<id>/perf/after.<gitSha|local>.<envId>.<profile>.json`
  - `specs/<id>/perf/diff.<before>__<after>.json`

## 环境元信息（建议随证据一起记录）

建议在 `specs/<id>/perf.md`（或你的交接文档）记录至少：

- Date
- Git branch / commit（含工作区是否 dirty）
- OS / arch / CPU / Memory
- Node.js / pnpm
- Browser（name/version/headless，若为 browser run）
- profile（quick/default/soak）与 runs/warmupDiscard/timeoutMs
- Notes（电源模式/后台负载/浏览器版本锁定/是否切换 tab 等）

## 如何读 PerfReport（after/before json）

PerfReport 关键结构：

- `meta.config`：本次采样参数（`runs` / `warmupDiscard` / `timeoutMs` / `profile` / `stability`）。
- `suites[]`：一个 suite 对应一个“实验场景 + 矩阵”。
  - `id`：suite 标识（例如 `converge.txnCommit`）。
  - `primaryAxis`：主轴（阈值/上限以它为“level”递增）。
  - `points[]`：每个点位（参数组合）的采样结果。
  - `thresholds[]`：对 `budgets[]` 的阈值计算结果（最重要的“可扫指标”）。
  - `notes`：补充说明/异常（例如稳定性告警、缺失原因）。

### points：怎么看

每个 point：

- `params`：该点位的参数（矩阵维度 + 派生维度）。
- `status`：
  - `ok`：采样成功，metrics 有统计值。
  - `timeout`：在 `timeoutMs` 内没跑完（该点不可用于对比/判门）。
  - `failed`：执行失败（通常要先修用例或修环境）。
  - `skipped`：由于 cutOff 或显式 skip 被跳过（用于节省成本，通常也不可用于对比/判门）。
- `metrics[]`：
  - `status=ok` 时提供 `stats { n, medianMs, p95Ms }`
  - `status=unavailable` 时提供 `unavailableReason`（例如 `notImplemented`）
- `evidence[]`：非耗时指标的证据字段（用于解释“为什么这么快/这么慢/为什么退化”）。

### thresholds：怎么看（最重要）

thresholds 语义：对每个 budget，在“其它维度 where 固定”的情况下，沿 primaryAxis 从低到高扫描，找出满足 budget 的最大 level：

- `maxLevel`：当前 report 下，这条 budget 能“稳定通过”的最大 level。
- `firstFailLevel`：第一次失败的 level（用于定位“哪一级开始超预算/缺数据/不支持”）。
- `reason`：失败原因：
  - `budgetExceeded`：p95 超过预算；
  - `missing` / `missingNumerator` / `missingDenominator`：报告缺点位；
  - `timeout` / `cutOff`：点位超时或被 cutOff；
  - `notImplemented`：该指标还没实现；
  - 其它：按 report 写的字符串为准。

对人类来说，`maxLevel` 就是“这条预算下的承载上限”；对 LLM 来说，优先用 `thresholds` 做汇总与判定。

### 术语：什么是“预算内最大加压档位”（maxLevel）

`maxLevel` 来自阈值扫描算法：

- 固定其它维度（`where`）；
- 把 `primaryAxis` 的每个 level 视为“加压档位”（例如 `steps=200/800/2000`）；
- 逐档检查 budget（例如 `commit.p95<=50ms`）是否满足；
- **最后一个仍满足 budget 的档位**就是 `maxLevel`（也就是“预算内最大加压档位”）。

因此类似 `before=2000, after=800` 的含义是：在同一条预算、同一组 `where` 条件下，before 最多能在 `steps=2000` 仍不超预算；after 从更高档位开始超预算/缺点位/超时，所以只剩 `steps=800` 还能稳定通过。

> 强制提醒：只有当 diff 的 `meta.comparability.comparable=true` 时，`maxLevel` 前后变化才是“硬退化/硬提升”；否则只能当线索，必须对齐采样参数后复测。

## stability（噪声容忍）口径

对同一 `suite + params + metric` 的两次运行（前一次为 baseline），若：

`absΔp95Ms <= max(maxP95DeltaMs, baselineP95Ms * maxP95DeltaRatio)`

则认为在容忍范围内；否则 diff 会在 `SuiteDiff.notes` 输出 `stabilityWarning`，并要求在结论里显式标注“不确定性来源”。

## 如何读 PerfDiff（diff json）

PerfDiff 关键结构：

- `summary`：
  - `regressions`：回归数量（按阈值下降/预算违例等统计）。
  - `improvements`：提升数量（按阈值上升等统计）。
  - `budgetViolations`：预算违例数量（预留；当前 diff 脚本默认不产出该项，先看 `thresholdDeltas`）。
- `suites[]`：按 suite 汇总差异：
  - `thresholdDeltas[]`：同一 budget/where 的 `beforeMaxLevel → afterMaxLevel` 变化。
  - `budgetViolations[]`：after 触发“超预算”的重点点位（若实现开启）。
  - `evidenceDeltas[]`：证据字段差异（用于解释与根因定位）。
  - `notes`：稳定性告警、缺 suite、缺点位等说明。

### 先看可比性（强制）

解释 `thresholdDeltas` 前必须先检查：

- `meta.comparability.comparable`：是否可比；
- `meta.comparability.configMismatches/envMismatches`：不可比原因；
- `meta.comparability.warnings`：非致命漂移（例如 node 版本变化、profile 名称变化、`git.dirty.*`/`git.commit` 提示等）。

如果 `comparable=false`，禁止下“回归/提升”的硬结论（最多输出“疑似变化，需复测确认”）。

### 如何判定“提升/回归”

按优先级排序：

1. `budgetViolations`：若实现开启且出现，优先处理（通常不可接受）。
2. `thresholdDeltas`：
   - `afterMaxLevel < beforeMaxLevel`：回归（尤其是 P1 suite / hard gate）。
   - `afterMaxLevel > beforeMaxLevel`：提升（说明承载上限更高）。
3. `notes.stabilityWarning`：说明点位噪声可能影响结论；需要提升 profile 或重复采样。

### 探索式解读（命令模板）

> 目标：复用一次真实探索过程的套路（选 diff → 看 summary → 看阈值变化 → 看 evidence → 钻取点位），用于并行迭代下的“尽力而为”性能判断。

1) 先选你要解读的 diff（建议优先 `default`，再补一份 `soak` 做稳定性确认）：

- 典型落点：`specs/<id>/perf/diff.*.json`
- 经验：同一波改动通常会同时有 `diff.node.*`（runtime 热路径）和 `diff.browser.*`（端到端感知）两类。

2) 一眼扫 summary + 可比性（先写出“这份结论靠不靠谱”）：

- 推荐先落盘再用 jq 读（避免 pnpm 运行日志污染 stdout）：
  - `pnpm perf diff -- --before <before.json> --after <after.json> --out <diff.json>`
  - `pnpm perf diff:triage -- --before <before.json> --after <after.json> --out <diff.json>`（探索口径）
- `jq '{summary:.summary, comparability:.meta.comparability}' <diff.json>`

3) 抓出“到底变化在哪些预算/切片”（thresholdDeltas）：

- `jq -r '.suites[] | select(.thresholdDeltas!=null) | .id as $id | .thresholdDeltas[] | \"\\($id)\\t\\(.message)\"' <diff.json>`

4) 抓出“可能的解释线索”（evidenceDeltas）：

- `jq -r '.suites[] | select(.evidenceDeltas!=null) | .id as $id | .evidenceDeltas[] | \"\\($id)\\t\\(.message)\"' <diff.json>`

> 解释口径提醒：diff 里的 evidence 是跨点位聚合值（见实现 `.codex/skills/logix-perf-evidence/scripts/diff.ts`）：
> - `unit=ratio`：对所有点位的 ratio 取中位数（median）。
> - 其它数值（count/bytes/msDeltaMs 等）：对所有点位求和（sum）。

5) 对“最在意/最诡异”的那条 delta 做点位钻取（看真实 p95，而不是只看 maxLevel）：

- 先确认 suite 的轴/指标名（避免写错 params）：
  - `jq '.suites[] | select(.id==\"<suiteId>\") | {primaryAxis, points:(.points|length), sampleParams:.points[0].params, metricNames:(.points[0].metrics|map(.name)), evidenceNames:(.points[0].evidence|map(.name))}' <after.json>`
- 绝对预算（示例：拿一个固定 where，把不同 level 的 p95 列出来）：
  - `jq -r '.suites[]|select(.id==\"<suiteId>\")|.points[]|select(<where 条件>)|{level:.params.<primaryAxis>, p95:(.metrics[]|select(.name==\"<metric>\")|.stats.p95Ms)}|\"\\(.level)\\t\\(.p95)\"' <report.json> | sort -n`
- 相对预算（示例：`auto<=full*1.05` 这类，必须同时看 numerator/denominator；同时留意“低档位失败但高档位通过”的非单调情况，会导致 `maxLevel=null`）：
  - `jq -r '.suites[]|select(.id==\"<suiteId>\")|.points[]|select(<where 条件>)|select(.params.<primaryAxis>==200 or .params.<primaryAxis>==800 or .params.<primaryAxis>==2000)|{mode:.params.<modeAxis>, level:.params.<primaryAxis>, p95:(.metrics[]|select(.name==\"<metric>\")|.stats.p95Ms)}|\"\\(.level)\\t\\(.mode)\\t\\(.p95)\"' <report.json> | sort -n`

6) 结论怎么写（探索口径）

- 先写一句话总结：`summary` + `comparable/triage`（例如“默认口径可比 / 仅 triage 线索”）。
- 每个关键 suite 只抓 1–2 条最重要的阈值变化（`thresholdDeltas` 的 message 直接引用即可）。
- 如有明显 evidence 变化（例如 diagnostics overhead 上升/下降），把它当作“解释线索”，不要当作硬门。

#### 例：057（legacy → selectorGraph）的探索复盘入口

> 这是一次真实探索记录的“入口集合”，用于回看/复跑/对齐讨论口径（不要求你严格复现当时的代码状态）。

- Node（default）：`specs/057-core-ng-static-deps-without-proxy/perf/diff.node.legacy__selectorGraph.darwin-arm64.default.json`
- Node（soak）：`specs/057-core-ng-static-deps-without-proxy/perf/diff.node.legacy__selectorGraph.darwin-arm64.soak.json`
- Browser（default）：`specs/057-core-ng-static-deps-without-proxy/perf/diff.browser.legacy__selectorGraph.darwin-arm64.default.json`
- 快速抽取阈值变化：`jq -r '.suites[] | select(.thresholdDeltas!=null) | .id as $id | .thresholdDeltas[] | \"\\($id)\\t\\(.message)\"' <diff.json>`

## 调参实验场（推荐默认值）

目标：在任意时刻快速得到“当前代码下的推荐默认配置 + 可读证据”，用于日常调参与发布评审。

- 快速闭环（先采集 quick，再生成推荐文件）：`pnpm perf tuning:best`
- 自定义 sweep（profile / candidates / retries）：`pnpm perf tuning:recommend -- --profile default --retries 2`
- 产物：
  - 人类可读：`perf/tuning/recommendation.latest.md`
  - 机器可读：`perf/tuning/recommendation.latest.json`

## 给 LLM 的“读报告提示词模板”（可直接复制）

把 `before.json`、`after.json`、`diff.json` 路径贴给 LLM，并附加以下要求：

1. 只基于 `PerfDiff.summary` 与每个 suite 的 `thresholdDeltas/notes` 下结论（`budgetViolations` 若存在再纳入）；
2. P1 suite 优先、P2 次之、P3 最后；
3. 如果 `notes` 提到 `missing suite` 或 `stabilityWarning`，必须在结论里显式标注“不确定性来源”；
4. 输出格式：每个 suite 一段（通过/回归/提升 + 关键 budget/where + maxLevel 变化）。

## 常见“看不懂/对不上”的原因（排查清单）

- Before/After suites 不一致：diff 会标注 `missing suite in before/after report`（此时不能做严格对比，只能给“现状”）。
- 指标未实现：`metricUnavailable` / `notImplemented`（diff 会把它当作不可对比原因）。
- quick 抖动：`stabilityWarning`（建议跑 default/soak 或重复采样）。
- 点位超时：`pointTimeoutMs=...`（需要提升 timeout、缩小矩阵、或降低单次 run 成本）。

## 马后炮：现在才想补 before/after，还来得及吗？

来得及，但取决于你选的 baseline 语义：

- **策略 A/B（同一代码）**：永远来得及。策略轴在矩阵里（例如 `policyMode=sync/suspend/defer`），同一份 report 就能对比策略预算（相对 budget）。
- **代码前后（commit A→B）**：
  - 如果“变更前”已经有 commit（或能提供一个可复用的 patch）：可以用 `git worktree` 跑 before，不用动当前工作区。
  - 如果“变更前”从未被 commit、也没保存 patch：严格意义上无法复现原始 before，只能退化为“用当前代码做策略 A/B”或“用最近可用的 before.json 当近似基线”，并在结论里明确不确定性来源。

## 维护者入口（必要时再看）

- 矩阵（SSoT）：`.codex/skills/logix-perf-evidence/assets/matrix.json`
- Schema：`.codex/skills/logix-perf-evidence/assets/schemas/perf-report.schema.json`、`.codex/skills/logix-perf-evidence/assets/schemas/perf-diff.schema.json`
- 采集脚本：`.codex/skills/logix-perf-evidence/scripts/collect.ts`
- diff 脚本：`.codex/skills/logix-perf-evidence/scripts/diff.ts`
- 调参推荐脚本：`.codex/skills/logix-perf-evidence/scripts/tuning.recommend.ts`
- Browser 跑道：`pnpm -C packages/logix-react test -- --project browser`
- Perf 输出协议：`LOGIX_PERF_REPORT:<json>`
