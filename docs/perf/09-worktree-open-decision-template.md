# 09 · Perf Worktree 开线决策模板

本页用于回答一个非常具体的问题：**现在要不要再开新的 perf worktree？**

适用场景：
- `probe_next_blocker` 已经是 `clear`
- `06-current-head-triage.md` 已写成“当前没有默认 runtime 主线”
- 只剩条件性架构/API 候选（例如 `R-2`）
- 用户继续要求“狠狠干/继续砍/再识别下一刀”，但 current-head 没有天然 blocker

目标不是鼓励继续开线，而是**强制把“不开”也当成一个正式裁决**，避免为了继续而继续。

补充约定：

- 本模板既服务“实施线开线”，也服务“没有 still-open 高收益方向时的 docs-only scout 开线”。
- 无论哪种开线，默认都要求母线先保持 clean，再派生新 worktree。
- 若用户明确要求 `实施高收益方向`，本模板可按“批量 fanout 裁决”使用：不是只回答开不开一条，而是回答这一轮要不要批量开多条。

## 1. 先判定：默认是不开

若没有新的 clean/comparable 证据，默认结论一律是：
- 不开新的 perf worktree
- 不重开已关闭的 runtime / benchmark 线
- 只允许 docs/evidence-only 收口，或停在当前结论

若当前 `07-optimization-backlog-and-routing.md` 中已经没有 still-open 高收益方向，则“不开新的 perf worktree”只适用于实施线；
此时允许进入 docs-only scout 模式，从头识别新的方向，但仍须按本模板裁决边界。

换句话说：**“想继续做点什么”不是开线理由。**

## 2. 允许开线的触发器

只有命中以下任一条件，才允许从 `v4-perf` 再开新的 perf worktree：

1. 新的 real probe 失败
- `python3 fabfile.py probe_next_blocker` 在 current-head 上出现新的第一失败项
- 且 `failure_kind` 不是 `environment`
- 且失败不属于已知的 suite/display drift

2. 新的 clean/comparable native-anchor 证据
- 新 targeted / full-matrix 明确显示页面内税点重新出现
- 现有 docs/perf 无法再把它归类为 control-surface / browser floor / measurement drift

3. 新的产品级 SLA
- 例如你明确要求把“页面外 admission / click 注入税”也纳入正式预算
- 或者新的 API/产品承诺需要更高层 policy surface（此时才允许讨论 `R-2`）

4. 现有证据链失真
- report / triage / artifact 展示再次丢掉关键 phase
- 造成 current-head 已无法稳定裁决“到底是谁慢”
- 这类线只允许作为 tooling/evidence worktree 打开，不得直接升级成 runtime 重构

5. 当前已无 still-open 高收益方向，且用户明确要求继续
- `07` 中没有可直接消费的高收益方向
- 用户仍然要求“继续 / 实施高收益方向 / 从头识别新方向”
- 这类情况只允许打开 docs-only scout worktree，先补新的方向，不得直接把 scout 当实现线

## 3. 不允许开线的情况

命中以下任一情况，结论都应是“不开”：

1. 只是历史上某条线曾经很重要
- 例如 `R-1`、`S-2` 之前很值钱，但当前已经被 dated record 明确关闭

2. 只有环境失败
- 例如 `node_modules missing`、browser 首轮 warmup、Vite optimizeDeps 抖动
- 这类问题只能先修环境，不能当新 blocker 立项

3. 只是想继续压榨，但没有新证据
- 没有新的 probe 失败
- 没有新的 clean/comparable report
- 没有新的 SLA
- 这种情况只能停

4. 只是想做“大刀架构优化”
- `R-2` 一类候选如果没有新证据/新 SLA，不得因为“它看起来更高级”而立项

## 4. 五步裁决法

### Step 1：锁定基线

填写：
- 当前主分支：`v4-perf`
- 当前 HEAD：`<commit>`
- 母线是否 clean：`是 / 否`
- 当前 triage 结论：摘自 `06-current-head-triage.md`
- 当前 routing 结论：摘自 `07-optimization-backlog-and-routing.md`

若“母线是否 clean=否”，先写明：
- 未提交文件属于什么
- 为什么还未收口
- 是否必须先收口并提交后再开线

默认答案应为：先收口并提交，再开线。

### Step 2：写明触发器

必须二选一：
- `触发器成立`
- `触发器不成立`

若成立，必须写清：
- 是哪一类触发器
- 对应哪份证据 / 哪条 probe 输出 / 哪个新 SLA
- 若属于“无 still-open 高收益方向”，必须明确这是 `docs-only scout` 触发，而不是实现线触发

若写不清，自动判为不成立。

### Step 3：先做“不开”裁决

先写这一句：
- `默认裁决：不开新的 perf worktree`

然后才允许写 override：
- `override 原因：<只允许来自第 2 节触发器>`

### Step 4：若 override 成立，限定新线边界

必须一次写清：
- worktree 名称
- 分支名称
- cut 名称
- 线类型：`implementation / docs-only scout`
- write scope
- 明确不改哪些模块
- 最小验证命令
- 成功门 / 失败门
- 收口后相对 `v4-perf` 只保留 1 个 HEAD 提交

若本轮是 fanout：
- 还必须写清并行分组
- 每组为何可并行
- 哪些组必须串行
- 为什么这批 worktree 的总数已经“尽可能多”

### Step 5：若 override 不成立，写停机结论

必须显式落一条：
- `本轮不开新的 perf worktree`
- `当前只保留 watchlist: <例如 R-2>`
- `下一次允许重开所需的触发器是什么`

## 5. 可直接复制的模板

```md
## Perf Worktree 开线裁决

- Date: <YYYY-MM-DD>
- Base branch: `v4-perf`
- Base HEAD: `<commit>`
- Current-head triage: <引用 06 的一句话>
- Current routing: <引用 07 的一句话>

### Trigger

- Status: `成立 / 不成立`
- Type: `<real probe failure / clean comparable evidence / new SLA / evidence drift / none>`
- Evidence:
  - `<file or command output 1>`
  - `<file or command output 2>`

### Default Decision

- 默认裁决：`不开新的 perf worktree`

### Override

- 是否 override：`是 / 否`
- 原因：<若否，写无；若是，只能引用 Trigger>

### If Open

- Worktree: `<path>`
- Branch: `<branch>`
- Cut: `<S/R/F-x name>`
- Scope:
  - 改：`<files/modules>`
  - 不改：`<forbidden areas>`
- Verify:
  - `<cmd 1>`
  - `<cmd 2>`
- Success gate:
  - `<what proves this cut is worth keeping>`
- Failure gate:
  - `<what means docs/evidence-only close>`

### If Not Open

- 结论：`本轮不开新的 perf worktree`
- Watchlist only:
  - `<R-2 or none>`
- Reopen conditions:
  1. `<condition 1>`
  2. `<condition 2>`
```

## 6. 当前仓库的基线示例（2026-03-07）

按当前母线的结论，这个模板应被填写成：

- Trigger: `不成立`
- Default Decision: `不开新的 perf worktree`
- Override: `否`
- If Not Open:
  - 结论：`本轮不开新的 perf worktree`
  - Watchlist only: `R-2`
  - Reopen conditions:
    1. current-head 再次出现新的 real probe failure
    2. 出现新的 clean/comparable native-anchor 证据或新的产品级 SLA

## 6.1 当前实例（2026-03-14）

- 证据：`docs/perf/archive/2026-03/2026-03-14-c7-current-head-reprobe-clear.md`
- Trigger: `不成立`
- Default Decision: `不开新的 perf worktree`
- Override: `否`
- If Not Open:
  - 结论：`本轮不开新的 perf worktree`
  - Watchlist only: `R-2`
  - Reopen conditions:
    1. `probe_next_blocker --json` 再次出现新的 `blocker`
    2. 出现新的 clean/comparable native-anchor 证据或新的产品级 SLA

## 6.2 当前实例（2026-03-20，P2-1 fresh reopen check）

- 证据：`docs/perf/archive/2026-03/2026-03-20-p2-1-reopen-check.md`
- Trigger: `不成立`
- 触发事实：最小验证命令命中 `failure_kind=environment`（`vitest` 缺失 / `node_modules missing`）
- Default Decision: `不开新的 perf worktree`
- Override: `否`
- If Not Open:
  - 结论：`本轮不开新的 P2-1 扩面 worktree`
  - Watchlist only: `P2-1`、`R-2`
  - Reopen conditions:
    1. 先消除 environment 阻塞并复跑最小验证
    2. `probe_next_blocker --json` 出现非 environment 的真实 blocker，或出现新的 clean/comparable 证据 / 新 SLA

## 6.3 当前实例（2026-03-21，P2-1 env-ready fresh reopen check）

- 证据：`docs/perf/archive/2026-03/2026-03-21-p2-1-env-ready-recheck.md`
- Trigger: `不成立`
- 触发事实：环境已就绪，focused tests 通过；本轮 `probe_next_blocker` 命中 `externalStore.ingest.tickNotify` threshold 失败（`first_fail_level=256`），该失败仍属于已知 `edge_gate_noise`，且不映射 `P2-1` 唯一最小切口。
- Default Decision: `不开新的 perf worktree`
- Override: `否`
- If Not Open:
  - 结论：`本轮不开新的 P2-1 扩面 worktree`
  - Watchlist only: `P2-1`、`R-2`
  - Reopen conditions:
    1. `probe_next_blocker --json` 出现非 environment 且非 edge-gate-noise 的真实 blocker，并可映射到 `P2-1` 最小切口
    2. 出现新的 clean/comparable 证据或新的产品级 SLA

## 7. 与其它文档的关系

- `06-current-head-triage.md`
  - 给出“当前到底有没有默认 blocker”的事实判断
- `07-optimization-backlog-and-routing.md`
  - 给出“哪些线已关闭，哪些 still-open，哪些需要重新识别”的路由判断
- `04-agent-execution-playbook.md`
  - 给出实际执行纪律；当 `probe_next_blocker=clear` 时，应先回到本模板，而不是直接开线
- `08-perf-execution-protocol.md`
  - 给出一旦决定开线后，如何用独立 worktree / 单提交收口的协议
