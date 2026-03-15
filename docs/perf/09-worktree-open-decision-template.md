# 09 · Perf Worktree 开线决策模板

本页用于回答一个非常具体的问题：**现在要不要再开新的 perf worktree？**

适用场景：
- `probe_next_blocker` 已经是 `clear`
- `06-current-head-triage.md` 已写成“当前没有默认 runtime 主线”
- 只剩条件性架构/API 候选（例如 `R-2`）
- 用户继续要求“狠狠干/继续砍/再识别下一刀”，但 current-head 没有天然 blocker

目标不是鼓励继续开线，而是**强制把“不开”也当成一个正式裁决**，避免为了继续而继续。

## 1. 先判定：默认是不开

若没有新的 clean/comparable 证据，默认结论一律是：
- 不开新的 perf worktree
- 不重开已关闭的 runtime / benchmark 线
- 只允许 docs/evidence-only 收口，或停在当前结论

换句话说：**“想继续做点什么”不是开线理由。**

## 2. 允许开线的触发器

只有命中以下任一条件，才允许从 `effect-v4` 再开新的 perf worktree：

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
- 当前主分支：`effect-v4`
- 当前 HEAD：`<commit>`
- 当前 triage 结论：摘自 `06-current-head-triage.md`
- 当前 routing 结论：摘自 `07-optimization-backlog-and-routing.md`

### Step 2：写明触发器

必须二选一：
- `触发器成立`
- `触发器不成立`

若成立，必须写清：
- 是哪一类触发器
- 对应哪份证据 / 哪条 probe 输出 / 哪个新 SLA

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
- write scope
- 明确不改哪些模块
- 最小验证命令
- 成功门 / 失败门
- 收口后相对 `effect-v4` 只保留 1 个 HEAD 提交

### Step 5：若 override 不成立，写停机结论

必须显式落一条：
- `本轮不开新的 perf worktree`
- `当前只保留 watchlist: <例如 R-2>`
- `下一次允许重开所需的触发器是什么`

## 5. 可直接复制的模板

```md
## Perf Worktree 开线裁决

- Date: <YYYY-MM-DD>
- Base branch: `effect-v4`
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

按当前 `effect-v4` 的结论，这个模板应被填写成：

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

- 证据：`docs/perf/2026-03-14-c7-current-head-reprobe-clear.md`
- Trigger: `不成立`
- Default Decision: `不开新的 perf worktree`
- Override: `否`
- If Not Open:
  - 结论：`本轮不开新的 perf worktree`
  - Watchlist only: `R-2`
  - Reopen conditions:
    1. `probe_next_blocker --json` 再次出现新的 `blocker`
    2. 出现新的 clean/comparable native-anchor 证据或新的产品级 SLA

## 7. 与其它文档的关系

- `06-current-head-triage.md`
  - 给出“当前到底有没有默认 blocker”的事实判断
- `07-optimization-backlog-and-routing.md`
  - 给出“哪些线已关闭，哪些只保留为候选”的路由判断
- `04-agent-execution-playbook.md`
  - 给出实际执行纪律；当 `probe_next_blocker=clear` 时，应先回到本模板，而不是直接开线
- `08-perf-execution-protocol.md`
  - 给出一旦决定开线后，如何用独立 worktree / 单提交收口的协议
