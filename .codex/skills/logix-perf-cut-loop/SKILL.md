---
name: logix-perf-cut-loop
description: 在 logix 仓库里识别当前性能瓶颈、区分真实瓶颈与测量伪影、选择“下一刀”高收益改造并按“一刀→验证→docs/perf→单独提交”推进。只要用户提到性能瓶颈、继续砍、下一刀、perf matrix/full-matrix、为什么慢、如何继续优化、是否值得改 API 换性能，都应该优先使用本 skill。若判断需要表面 API 变动来换取显著收益，先输出提案和收益面，等用户对齐后再实施。
---

# logix-perf-cut-loop

把本仓的性能工作收敛成两个阶段：

- **识别**：找出当前真正的性能缺口，先分清“内核真瓶颈”还是“证据/计时/门禁测歪了”。
- **实施**：一次只做一刀，做完就验证、回写 `docs/perf`、单独提交，再继续下一刀。

## 0) 先读哪些东西

1. `project-guide`：确认代码/SSoT/测试入口。
2. `logix-perf-evidence`：确认 collect/diff 的口径与文件命名。
3. 当前 perf 事实源分两层：
   - `docs/perf` 控制面 / 消费入口：
     - `docs/perf/README.md`
     - `docs/perf/06-current-head-triage.md`
     - `docs/perf/07-optimization-backlog-and-routing.md`
     - `docs/perf/08-perf-execution-protocol.md`
     - `docs/perf/09-worktree-open-decision-template.md`
   - `specs/<id>/perf/*` 证据附件 / 工件区：
     - `specs/<id>/perf/*.json`
     - `specs/<id>/perf/*.summary.md`
     - `specs/<id>/perf/*.evidence.json`

当前口径补充：

- perf 优化是一套独立机制：`识别 -> 消费 -> worktree/subagent 实施 -> 回收母线`
- `docs/perf` 是这套机制的 control-plane
- `specs/<id>/perf/*` 只负责 evidence / artifact，不负责路由与选线
- 若仓库里还存在 `specs/<id>/perf/README.md`，只把它当历史或可选索引，不当默认入口

如果当前 head 没有可信的新证据，先补一份 current-head quick matrix，再决定下一刀。

## 0.1) 默认入口（先判 blocker，再决定开刀）

默认入口不是先读历史 broad matrix，也不是先写 ad-hoc 分析脚本。

主顺序固定为：

1. `python3 fabfile.py probe_next_blocker --json`
2. 若结果是 `blocked`
   - 围绕默认 blocker 继续
   - 不直接跳 future-only 候选池
3. 若结果是 `clear`
   - 先回到 `docs/perf/07-optimization-backlog-and-routing.md` 读取仍未消费的高收益方向
   - 再回到 `docs/perf/09-worktree-open-decision-template.md`
   - 最后做“开/不开新的 perf worktree”裁决
4. 只有 `clear` 且 trigger 成立时，才允许继续看 future-only 候选

补充：

- `probe_next_blocker` 已是 threshold-aware probe，不能再只看子命令退出码。
- 若 `probe_next_blocker` 和 dated evidence 口径冲突，先以最新 current-head 证据复核，不直接信旧结论。
- 若 `07` 中已经没有 still-open 高收益方向，默认不要假装还有“下一刀”可实施；此时自动切回识别模式，从头识别新的方向。

## 1) 工作模式选择

### A. 识别模式

用户意图像这些时，先做识别：

- “现在还剩什么性能瓶颈？”
- “继续砍，先看最值的下一刀”
- “哪些问题是真的，哪些只是 benchmark 测歪？”
- “有没有值得为了性能改 API 的地方？”

输出必须至少包含：

- `当前瓶颈排行`
- `真实瓶颈 / 证据伪影 / 门禁噪声` 的分类
- `建议下一刀`
- `是否需要 API 变动`

### B. 实施模式

用户意图像这些时，直接实施一刀：

- “继续”
- “继续狠狠干”
- “按这个方向往下做”
- “就做下一刀”
- “实施高收益方向”

输出必须遵守：

- 一次只做一刀
- 做完必须跑验证
- 回写 `docs/perf`
- 单独提交

若用户只说“实施高收益方向”而未点名切口，默认按下面顺序消费：

1. 先读 `docs/perf/README.md` 的 top-level future-only 方向
2. 再读 `docs/perf/07-optimization-backlog-and-routing.md` 的当前唯一任务源
3. 进入高收益 fanout 模式：尽可能多地消费 still-open 且满足当前 gate 口径的方向
4. 每个方向各自使用 `独立 worktree + branch + subagent`
5. 低冲突方向并行，高冲突方向按冲突域串行
6. 不从 `specs/<id>/perf/*` 目录反推“下一刀”

fanout 模式的默认规则：

- 目标不是只挑 1 条，而是尽可能把当前 still-open 高收益方向一轮吃掉
- 但并行上限受冲突域约束：
  - 会同时改 `ModuleRuntime.impl.ts` / `ModuleRuntime.txnLanePolicy.ts` / `RuntimeStore.ts` / `TickScheduler.ts` / `RuntimeExternalStore.ts` 的线，不并行
  - docs-only scout / gate / evidence / API proposal 线优先并行
- 主会话只做：
  - 读取 `07`
  - 分组冲突域
  - 派发 `spawn_agent`
  - 回收最终单提交

若执行到第 3 步发现：

- 没有 still-open 高收益方向
- 或所有现存方向都已被消费 / 关闭 / 卡在非当前 gate

则行为切换为：

1. 显式进入识别模式
2. 从 `docs/perf/README.md` 与 `07` 当前盘面出发，识别新的高收益方向
3. 默认优先并行开 docs-only scout worktree，而不是直接做实现试探
4. 尽可能多开 `subagent + worktree`，按低冲突切面并行识别
5. 先把识别结果回写 `docs/perf`，再把新方向放回 `07` 供后续“实施高收益方向”消费

## 1.5) 收口纪律（避免过度探索）

- 默认先看 **current-head** 的最新证据，不先深挖历史。
- 历史样本只在以下场景再看：
  - 需要 before/after 对比
  - 需要确认某条路线曾失败过
  - 需要解释为什么某个 suite 是伪影
- 识别阶段默认 **禁止** 先写 ad-hoc 脚本做大范围分析，除非现成 `perf report / diff / docs/perf` 已不足以回答问题。
- 识别输出必须快速收口：
  - `真实瓶颈`
  - `伪影/门禁噪声`
  - `下一刀`
- 默认从 `docs/perf/07-optimization-backlog-and-routing.md` 消费 still-open 高收益方向，不从证据目录猜任务源。
- 若 `07` 暂时没有 still-open 高收益方向，识别阶段的目标就改为“补出新的 still-open 高收益方向”，而不是停在“当前没有”。
- 如果 2 分钟内还在扩散阅读范围，说明方向错了，应回到 current-head 证据重新裁剪。

## 1.6) 显式 Subagent / Worktree 模式（用户明确要求时强制）

当用户明确要求：
- 用 subagent 推进
- 每条线都在独立 worktree / 分支里实施
- 主会话保持干净，只做协调/审查/合流

则进入以下硬约束：

1. **一条方向 = 一个 worktree + 一个分支 + 一个 subagent owner**。
2. **主会话不直接写实现代码**：主会话只做识别、路由、审查、收口和合流。
3. **只有低冲突方向允许并行**：
   - benchmark / gate / automation 通常可并行。
   - 任何会同时改 `ModuleRuntime.impl.ts` / `ModuleRuntime.txnLanePolicy.ts` / `RuntimeStore.ts` / `TickScheduler.ts` / `RuntimeExternalStore.ts` 的线，默认串行。
4. **每条分支结束时，相对主分支只允许 1 个最终 HEAD 提交**：
   - 成功：实现 + 证据 + docs/perf + 1 个收口提交。
   - 放弃：docs/evidence-only + 1 个收口提交。
5. **失败也必须提交**：失败方向不能只留在聊天里，必须固化为可检索的 docs/evidence-only 结论。
6. **合流方式默认是单提交回主分支**：主会话审查后，只把该 worktree 的最终 1 个提交合回当前主分支，然后该线结束。

这组规则只在用户明确要求 subagent/worktree 隔离时强制；未显式要求时，仍可由主 agent 直连实施。

补充特例：

- 若用户直接说 `实施高收益方向`，在本仓默认视为显式触发 fanout 模式。
- 也就是说，即使用户没再重复写“subagent / worktree”，也按 `subagent + worktree` 模式推进。
- 该特例只适用于本 skill 覆盖的 perf 机制，不外溢到其它普通开发任务。

### 1.6.1) 平台 Subagent 优先与最小任务包

当用户已经明确要求 `subagent`，且平台 `spawn_agent` 可用时，追加以下硬约束：

1. **优先用平台 `spawn_agent`**。
- 不要优先起外部 `codex exec` 或其它 CLI 进程。
- 只有在平台 subagent 明确不可用，或无法稳定落到指定 worktree 时，才允许回退到外部 Codex 进程。

2. **默认 `fork_context=false`**。
- 不把主会话长历史整段 fork 给 worker。
- 子线只拿“最小任务包”。

3. **最小任务包必须至少包含**：
- worktree 绝对路径
- 分支名
- 这刀唯一目标
- 明确禁止重做的失败切口
- write scope / 禁区
- 最小验证命令
- 成功门 / 失败门
- 需要回写的 docs/spec 目标文件

4. **若母线有未提交但必须让子线看见的 docs/evidence/基线代码**，主会话先同步最小文件集到目标 worktree，再派发 worker。
- 不要让 worker基于过时 `HEAD` 推理。

5. **subagent 一旦出现上下文爆炸或线程污染，必须丢弃旧线程，开新 worker**。
- 不要在同一个爆上下文的线程里继续追问。
- 新 worker 继续使用同一个 worktree，但任务包要更短、更硬、更只读事实化。

6. **主会话要显式区分两类回退**：
- `spawn_agent 不可用`：可回退到外部 Codex 进程，但要说明原因。
- `spawn_agent 线程爆上下文`：不开外部旁路，先试“新 worker + 更短任务包”。

## 1.7) 母线分支 + 实验线模式（本次验证后的强约束）

当用户明确采用：
- 一个持续演进的 perf 母线分支
- 后续每一刀都从母线再拉独立 worktree
- 主会话只做指挥、回收和沉淀

则在 `1.6` 的基础上，再追加以下硬约束：

1. **母线只做集成，不做实验实现**
- 例如 `v4-perf` 这类分支只承载：
  - 已接受的实现提交
  - docs/evidence-only 沉淀
  - backlog / status / candidate pool 更新
- 主会话默认不直接在母线写实现代码。
- 母线应尽量保持 clean；若主会话为了 routing/docs/review 产生了临时改动，应先尽快收口并提交，再从新的母线 HEAD 开子 worktree。

2. **识别也尽量外包给 subagent**
- 主会话只保留：
  - 选线
  - 切面裁决
  - 接受 / 拒绝
  - 文档沉淀
- 识别、探索、试错、实施尽量放到 explorer / worker 里完成，避免主会话上下文膨胀。

3. **worker 只能改自己的 worktree**
- worker 不得回头修改母线工作区。
- worker 不得修改其他 worker 的 worktree。
- 主会话验收时只接收 worker 的最终 commit 和最终结论，不跟踪中间过程。

4. **实验结果必须做三分法裁决**
- `accepted_with_evidence`
  - 有贴边、可比、正向收益证据
  - 允许把代码提交合回母线
- `merged_but_provisional`
  - 方向成立，但缺硬收益证据
  - **默认禁止合代码**
  - 只允许把状态页 / docs/evidence-only 结论合回母线
- `discarded_or_pending`
  - 收益不成立、证据太弱、或方案走不通
  - 禁止合代码
  - 必须把失败或待定结论沉淀到 `docs/perf`

5. **代码合流门禁收紧**
- 只有 `accepted_with_evidence` 才允许把代码合回母线。
- 没有硬收益证据，或收益几乎可忽略不计时：
  - 代码留在实验线
  - 母线只回收 docs/evidence-only
- 若已有结构性优化想先保留，也必须明确标成 `provisional`，不能计入正式收益清单。

6. **所有探索都要沉淀**
- 成功探索：写 dated note + status 页
- 失败探索：写 docs/evidence-only note
- 收益待定：写 provisional note / status
- 不允许只在聊天里留下“试过了但没成”的信息

7. **母线应维护一份滚动状态页**
- 至少区分：
  - `accepted_with_evidence`
  - `merged_but_provisional`
  - `discarded_or_pending`
- 后续对外汇报时，只能把 `accepted_with_evidence` 计入正式 perf win。

8. **主会话要维护 subagent 恢复规则**
- worker 若因 context window / thread 污染失败，主会话先把失败线程视为失效，不继续复用。
- 恢复步骤固定为：
  1. 读取该 worker 的 worktree 当前状态
  2. 判断是否已有 docs/evidence-only 足够收口
  3. 若未收口，再开一个 fresh worker，只给最小任务包
- 这条恢复动作本身也应在 docs/perf 里留痕，避免重复踩坑。

9. **开线前先做母线 clean 检查**
- 默认在 `git worktree add` 之前先确认母线 `git status --short` 为空。
- 若母线存在未提交的 routing/docs/evidence 协调改动，优先把这批最小改动收口并提交，再开新线。
- 只有在必须让子线立刻看见这些文件、且收口动作已明确时，才允许先同步最小文件集；但主会话仍应尽快恢复 clean。

10. **`实施高收益方向` 默认走 fanout**
- 若 `07` 中存在多个 still-open 高收益方向，主会话默认尽可能多开 `subagent + worktree` 并行消费。
- 若 `07` 中没有 still-open 高收益方向，主会话默认尽可能多开 docs-only scout 线并行识别。
- “尽可能多”仍受冲突域约束；同一核心文件族只允许 1 条实施线写入。

## 2) 识别阶段：先做四分法，不要盲砍

把每个问题先归入以下四类之一：

1. **真实运行时瓶颈**
   - 内核路径多走了一层/多开了一笔 txn/多做了一次对象构造/多进了一次 Suspense。
2. **证据语义错误**
   - benchmark 把 timer 排队、首次挂载、批量交互总耗时误当成目标指标。
3. **门禁表达错误**
   - `notApplicable` / `decisionMissing` / sub-ms 浮动被门禁错误放大。
4. **已解决但旧证据未更新**
   - 代码已经被后续刀修正，但 broad/full matrix 还停留在旧语义。

只有第 1 类优先做内核刀；第 2/3 类先修证据面，否则继续优化只会追着假问题跑。

## 3) 下一刀怎么排收益

优先级排序时，按下面顺序判断：

1. **是否打在 P1 主线门限上**
   - 例如 `p95<=100ms`、`auto<=full*1.05`、`full/off<=1.25`。
2. **收益面是否横向可复用**
   - 例如同一刀能同时改善多个 suite/多个模式/多个场景。
3. **是否是结构性税，而不是常数抖动**
   - 优先砍“多开事务/多次挂起/重复构造/不必要的通用层”。
4. **是否需要先修语义再谈优化**
   - 如果 suite 在测错对象，先修 suite。

更细的排序细则看：`references/cut-ranking.md`

## 4) 允许的改造边界

本仓是零存量用户模式，可做这些事：

- 内部局部重构
- 重排模块边界
- 统一/删掉历史分支
- 改默认行为
- 缩小或重做表面 API

但有一个硬门：

- **如果需要动表面 API 才能换来明显收益**，先停下来输出 `API 变动提案`，等用户对齐后再实施。

提案格式固定为：

- `问题`
- `当前内补丁为什么不够`
- `建议 API 变化`
- `预期收益`
- `影响面`

## 5) 实施阶段：固定循环
### 实施时的默认收口

- 不把“探索失败”伪装成正式结论。
- 一旦某个试探没有稳定收益，立即回退，不要继续在同一路径上叠更多 tweak。
- 每刀的最终回答默认只交付：
  - 做了什么
  - 证据
  - 验证
  - 提交
  - 还剩什么


每一刀都严格按这个循环：

1. 明确这刀只解决一个问题
2. 先做最小范围代码修改
3. 跑最贴边的测试/类型门
4. 跑 targeted perf 证据
5. 给这刀下结果分类：`accepted_with_evidence / merged_but_provisional / discarded_or_pending`
6. 回写 `docs/perf/YYYY-MM-DD-<id>-<slug>.md`
7. 按需更新母线状态页 / candidate pool / backlog
8. 单独提交

补充规则：
- 若结果不是 `accepted_with_evidence`，默认不合代码，只合 docs/evidence-only。
- 若结果是 `merged_but_provisional`，必须显式写明“已合入但不计入正式收益”或“暂不合入代码”。

探索样本（失败试探、噪声对照）不要混进提交。

更细执行细则看：`references/implementation-loop.md`

## 6) 验证门

最少验证顺序：

- 先跑改动旁边的 targeted tests
- 再跑包级 `typecheck:test`
- 再跑 targeted perf
- 需要时再补 full-matrix / broader tests

如果证据不具可比性：

- 用 `perf diff:triage` 只下趋势结论
- 不下硬结论

## 7) 这类高收益模式优先想到

优先应用这些“已经被证明值钱”的模式：

- `watcher -> action txn fusion`
- `watcher pure state write -> direct draft write`
- `suspend/defer -> sync-first fast-path`
- `near_full auto->full -> slim decision summary`
- `mode axis explicit`（避免隐式 env 默认值）
- `click-anchored / real-interaction-anchored timing`

什么时候用、什么时候别用，见：`references/pattern-catalog.md`

## 8) 反模式

- 追着旧 full-matrix 跑，不先确认 current-head 事实
- 把 `notApplicable` 当成真实性能失败
- benchmark 测错了还继续优化内核
- 一次混多刀，导致收益无法归因
- 把探索样本、失败试探一起塞进提交
- 为了保守兼容拒绝改默认行为/改 API（本仓当前不需要）

## 9) 输出模板

### 识别模式

- `当前瓶颈排行`
- `我认为是伪影/门禁噪声的项`
- `建议下一刀（只给一个）`
- `是否需要 API 变动`

### 实施模式

- `这刀做了什么`
- `证据`
- `验证`
- `提交`
- `结果分类`
- `当前还剩什么`
- 若是显式 subagent/worktree 模式，再补：`所在分支/worktree` 与 `是否已收口成相对主分支仅 1 个 HEAD 提交`

## 10) 深入阅读

- `references/bottleneck-classifier.md`
- `references/cut-ranking.md`
- `references/implementation-loop.md`
- `references/pattern-catalog.md`
