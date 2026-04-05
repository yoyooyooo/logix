# 08 · Perf Execution Protocol

本页对应 `D-3 perf execution protocol`，固化当前已经实际采用的 perf 执行协议。

它不负责回答“下一刀做什么”，那是 `06-current-head-triage.md` 与 `07-optimization-backlog-and-routing.md` 的职责；
它只负责回答“主会话、实施线、worktree/branch/subagent 应该怎样协作，以及一条线如何收口”。

若旧文档中的执行习惯与本页冲突，以本页为准，并同步回写 `README` / `04` / `07`。

## 1. 角色分工

### 主会话（coordinator）

职责：
- 读取 `06` / `07`，决定当前主线与可并行副线。
- 只做协调、审查、合流，不直接承载 runtime / benchmark / gate 的实现。
- 给每条实施线分配独立 `worktree + branch + owner`；owner 可以是 agent、subagent 或人工维护者。
- 审查实施线最终证据与最终 diff，只接收“已经收口好的 1 个最终 HEAD commit”。

禁止事项：
- 不要在主会话工作区里顺手改 `packages/**`、benchmark、gate 或 harness。
- 不要在主会话里替实施线“补最后一点代码”或手工拼 diff。
- 不要让多条实施线共享同一个可写工作区。

### 实施线（execution line）

职责：
- 一条实施线只解决一刀，或一个已经明确收敛的问题切面。
- 所有探索、验证、试验提交、临时回滚都在该线自己的 worktree / branch 内完成。
- 收口前自行清理中间态，确保交回主会话时只剩一个最终可审查提交。

## 2. 硬协议

1. 主会话必须保持干净。
- “干净”指角色干净，而不只是 `git status` 干净：主会话只负责 routing / review / merge，不直接做实施。

2. 每条实施线都必须在独立 `worktree/branch/subagent` 中推进。
- 这里的 `subagent` 表示执行 owner；如果没有启用 subagent，也至少要保证独立 `worktree + branch`。
- 一条线未结束前，不要把第二个不相干 cut 混进同一条线。

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

2. 开线。
- 为该线创建独立 `worktree + branch`，并明确 owner 与主要落点文件。
- 主会话从这一步开始退出实施，只保留协调职责。

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
