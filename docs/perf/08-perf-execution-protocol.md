# 08 · Perf Execution Protocol

本页对应 `D-3 perf execution protocol`，固化当前已经实际采用的 perf 执行协议。

它不负责回答“下一刀做什么”，那是 `06-current-head-triage.md` 与 `07-optimization-backlog-and-routing.md` 的职责；
它只负责回答“主会话、实施线、worktree/branch/subagent 应该怎样协作，以及一条线如何收口”。

若旧文档中的执行习惯与本页冲突，以本页为准，并同步回写 `README` / `04` / `07`。

## 0.1 2026-03-19 当前约束（覆盖 2026-03-18 旧口径）

从本次用户裁决开始：

1. 默认由主会话编排并优先使用 `spawn_agent`，后续每一刀默认在独立 `worktree + branch + subagent` 中推进。
2. 当前母线 `v4-perf` 默认只承载：
   - routing / protocol / docs/evidence-only 沉淀
   - worktree 开线与 owner 指派
   - 审查与最终收口
3. 主会话允许少量本地动作的触发条件只有三类：
   - 平台不可用，或 `spawn_agent` 无法稳定创建可用 worker
   - 任务不可分拆，且可在最小改动内一次完成
   - 并行实施线存在硬冲突，需要先做最小冲突消解
4. 若平台 subagent 不能直接绑定到指定 worktree，主会话必须显式说明，并改用“独立 Codex 进程 + worktree”的方式保持隔离。
5. 平台 subagent 默认使用“最小任务包”，不要把主会话长历史整段 fork 给它。
6. 若 subagent 线程因 context window 爆掉，主会话必须开 fresh worker 继续，同线程不再复用。
7. `2026-03-18` 的“平台可用时优先 `spawn_agent`”口径仅作为历史背景保留；当前默认是先派发，三类例外才回退到主会话少量本地动作。

## 0.2 `probe_next_blocker` 判门协议（2026-03-18 C-8）

1. `probe_next_blocker` 的 `status` 由两层信号共同决定：
- 子命令进程返回码（`process_returncode`）
- `LOGIX_PERF_REPORT.thresholds` 阈值结果（`threshold_anomalies`）

2. 当 `process_returncode=0` 且存在 `threshold_anomalies` 时：
- 先按 `budget.gateClass` 分层
- `gateClass=hard` 的异常：判定 `status=blocked`，`failure_kind=threshold`，返回 `returncode=42`
- `gateClass=soft` 的异常：保留在 `threshold_anomalies` 作为 watch，不阻塞 `probe_next_blocker`
- 未显式标注的 budget 默认按 `hard` 处理

3. 当前默认 blocker 口径：
- blocker plane 只看 `hard gate`
- `externalStore.ingest.tickNotify / full/off<=1.25` 已在 `D-5-min` 中下放到 `gateClass=soft`
- 当前 soft watch 样本继续保留在 probe payload 中，不再作为 blocker

4. 路由语义：
- 该类阻塞归入 residual/gate 复核线。
- 默认动作是 clean comparable evidence audit。
- 当前不触发 runtime core 实现线。

## 1. 角色分工

### 主会话（coordinator）

职责：
- 读取 `06` / `07`，决定当前主线与可并行副线。
- 默认只做协调、审查、合流，并优先派发 subagent；仅在三类例外条件下执行少量本地动作。
- 给每条实施线分配独立 `worktree + branch + owner`；owner 默认是 subagent。
- 审查实施线最终证据与最终 diff，只接收“已经收口好的 1 个最终 HEAD commit”。

禁止事项：
- 不要在主会话工作区里顺手改 `packages/**`、benchmark、gate 或 harness；若命中三类例外，动作范围保持最小并留痕。
- 不要在主会话里替实施线“补最后一点代码”或手工拼 diff；三类例外只允许做收敛冲突或不可分拆的最小动作。
- 不要让多条实施线共享同一个可写工作区。

### 实施线（execution line）

职责：
- 一条实施线只解决一刀，或一个已经明确收敛的问题切面。
- 所有探索、验证、试验提交、临时回滚都在该线自己的 worktree / branch 内完成。
- 收口前自行清理中间态，确保交回主会话时只剩一个最终可审查提交。

## 2. 硬协议

1. 主会话默认保持干净。
- “干净”指角色干净，而不只是 `git status` 干净：主会话默认负责 routing / review / merge。
- 若命中三类例外，主会话允许执行少量本地动作，且必须在 dated record 写明触发条件与回退原因。
- 若主会话因 routing / docs / evidence 协调产生了临时文件改动，默认要求尽快收口并提交，再从新的母线 HEAD 派生子 worktree。

2. 每条实施线默认在独立 `worktree/branch/subagent` 中推进。
- 这里的 `subagent` 表示默认执行 owner。
- 一条线未结束前，不要把第二个不相干 cut 混进同一条线。

2.0 开线前的母线 clean 检查：
- 在 `git worktree add` 之前，默认先确认母线 `git status --short` 为空。
- 若母线不为空：
  - 先判断这些改动是否属于当前这轮必须下发给子线的最小 routing/docs/evidence
  - 若是，优先把它们收口并提交，再开子线
  - 若暂时无法收口，主会话不得长期保留脏状态；应尽快完成最小收口并恢复 clean
- 目标是让新 worktree 默认继承母线最新且已提交的文件，而不是依赖临时同步。

2.2 `实施高收益方向` 的 fanout 协议：
- 若用户直接以 `$logix-perf-cut-loop 实施高收益方向` 触发：
  - 默认尽可能多开 `subagent + worktree`
  - 先消费 `07` 中 still-open 的高收益方向
  - 低冲突方向并行，高冲突方向按冲突域串行
- 若 `07` 当前没有 still-open 高收益方向：
  - 默认改为并行 docs-only scout
  - 目标是尽快补出新的高收益方向，再回收母线
- 无论是实施线还是 scout 线，每条线仍然保持“一条线一个目标，一个最终提交”。

2.1 平台 subagent 任务包约束：
- 默认 `fork_context=false`
- 只传：
  - worktree 路径
  - branch 名
  - 这刀唯一目标
  - 禁止重做的失败切口
  - write scope / 禁区
  - 验证命令
  - 成功门 / 失败门
  - docs/spec 回写位置
- 若母线有未提交但必须让子线可见的 docs/evidence/基线代码，主会话先同步最小文件集到目标 worktree，再派发 worker。

3. 并行判断以“实施线”为单位，而不是以 commit 为单位。
- `07` 里写的“可并行/必须串行”，指的是不同实施线之间能否同时推进。
- 即使两条线都只会产出单提交，只要主文件族冲突，仍然必须串行。

4. 每条实施线结束时，相对主分支只允许保留 `1` 个最终 HEAD commit。
- 中间试验提交、fixup、回滚提交可以在实施过程中存在。
- 但在交接、审查、合流前，必须压成 `1` 个最终 HEAD commit，再交回主会话。

5. 成功线与失败线都必须收口为 `1` 个提交。
- 成功线：保留最终要吸收的代码/测试/文档/evidence diff，并在该提交里完成对应回写。
- 失败线：清掉半成品 runtime/benchmark 改动，只保留失败结论本身需要的 dated evidence、`docs/perf/*` 路由更新、或必要 harness 结论；失败也不能拆成“代码回滚一提交 + 文档总结一提交”。

6. 主会话只审查和合流这 `1` 个最终提交。
- 主会话可以拒绝该提交并把问题退回原实施线。
- 但不要在主会话里再开第二轮实现，把实施线未收口的内容手工补完。

## 3. 一条线的标准生命周期

1. 选路。
- 主会话先读 `06` 与 `07`，确认这条线是 runtime 主线、benchmark/gate 副线，还是 docs/protocol 维护线。
- 若 `07` 中已经没有 still-open 高收益方向，则本轮先切回识别模式，优先开 docs-only scout 线补出新的方向。

2. 开线。
- 为该线创建独立 `worktree + branch`，默认用 `spawn_agent` 指派 subagent owner，并明确主要落点文件。
- 主会话从这一步开始默认退出实施，只保留协调职责；命中三类例外条件时可执行少量本地动作。

3. 线内探索。
- 允许在线内做 targeted verify、collect、试验性改动与临时提交。
- 允许失败；失败不是问题，未收口才是问题。

4. 线内收口。
- 先看相对主分支到底哪些 diff 需要留下。
- 把探索期的噪声、半成品、无效 patch、额外提交都在线内清干净。
- 形成 `1` 个最终 HEAD commit，并把需要保留的 evidence / `docs/perf/*` 回写一起带上。

5. 主会话审查与合流。
- 主会话只审查这一份最终 diff、验证命令与 dated record。
- 审查通过后，再决定 cherry-pick、merge 或其他合流方式。
- 合流后若母线暂时承载了协调期的未提交改动，主会话应立即完成最小收口并恢复 clean。

5.1 线程故障恢复。
- 若 subagent 因 context window / thread 污染失败：
  - 先读取该 worktree 当前 diff
  - 判断能否直接按失败线收口
  - 若不能，再开一个 fresh worker 继续
- 不在失效线程里继续追加消息。

## 4. 成功与失败的收口定义

| 结果 | 最终提交应该保留什么 | 不允许留下什么 |
| --- | --- | --- |
| 成功线 | 最终有效实现、必要测试/验证、对应 `docs/perf/*` 回写、dated evidence | 多个探索提交叠在一起；让主会话再手工拼 diff |
| 失败线 | 失败结论需要的 `docs/perf/*` 记录、dated evidence、必要 routing 更新；若结论依赖轻量 harness/doc 修正，可与失败结论同提交收口 | 半成品 runtime/core patch、未吸收的 benchmark 试验、把失败拆成多个提交 |

补充约定：
- 若失败结论已经足够明确，优先把代码差异清回与主分支一致，只留下 docs/evidence 收口。
- 若成功线改变了 routing 状态，应在同一最终提交里同步更新 `07` / `README` / 对应 dated record，而不是另开补文档提交。

## 5. DoD（执行协议层）

满足以下条件，才算一条线真正结束：
- 主会话没有承载该线的实现 diff。
- 该线全程在独立 `worktree + branch` 中推进。
- 相对主分支只剩 `1` 个最终 HEAD commit。
- 无论成功还是失败，都已经在这个提交里完成必要的 `docs/perf/*` 收口。
- `04` / `07` / `README` 中与执行协议相关的入口没有漂移。
