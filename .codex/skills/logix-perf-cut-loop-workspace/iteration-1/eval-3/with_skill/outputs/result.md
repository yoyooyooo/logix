# logix-perf-cut-loop · eval-3 结果

## 结论

按 `logix-perf-cut-loop` 的方法执行后，我不会直接把“下一刀”打在 `watchers`，而是会把**当前最值得继续的一刀**判定为：

- `txnLanes.urgentBacklog` 的 `mode=default` 尾部残差收敛
- 更具体地说，是继续围绕：`mode=default, steps=200/800` 的 `urgent.p95<=50ms` 失败点做一刀
- 当前**不需要 API 变动**；先继续做 runtime 内核刀

但这次评测任务有两个关键阻塞，所以我**没有实际实施代码修改、没有更新 `docs/perf`、也没有提交 commit**：

1. 当前 head 的 full quick matrix 刷新被一个非 perf 功能回归挡住了。
2. `watchers` 对应的 benchmark 文件在工作区里是 dirty 状态，按仓库并行开发约束，这条线的 current-head 证据此刻不能当成可信主依据继续推进。

在这两个约束下，这次评测的有效产出是：

- 按 skill 完成了识别阶段
- 用 current-head targeted evidence 重新做了四分法
- 给出了“下一刀”排序结论
- 明确指出为什么这次**不能**继续按“做完 -> docs/perf -> 单独提交”真的落刀

## 我读取的 skill / references

按要求先读取了：

- `.codex/skills/project-guide/SKILL.md`
- `.codex/skills/logix-perf-cut-loop/SKILL.md`
- `.codex/skills/logix-perf-evidence/SKILL.md`
- `.codex/skills/logix-perf-cut-loop/references/cut-ranking.md`
- `.codex/skills/logix-perf-cut-loop/references/implementation-loop.md`
- `.codex/skills/logix-perf-cut-loop/references/bottleneck-classifier.md`
- `.codex/skills/logix-perf-cut-loop/references/pattern-catalog.md`
- `docs/perf/README.md`
- `docs/perf/03-next-stage-major-cuts.md`
- `docs/perf/05-forward-only-vnext-plan.md`
- 若干最近日期记录（重点看了 `2026-03-06-*`）

## 按 skill 实际执行了什么

### 1. 先补 current-head 证据

因为 `Q-1` 之后没有一份新的 current-head 汇总证据可直接作为“剩余瓶颈”基线，我先按 skill 的要求尝试补一份 current-head quick matrix：

- 命令：

```bash
pnpm perf collect -- --profile quick --out .codex/skills/logix-perf-cut-loop-workspace/iteration-1/eval-3/with_skill/tmp/current-head.quick.json
```

### 2. full quick matrix 刷新失败

full collect 没能完成，失败点不是 perf threshold，而是浏览器功能用例回归：

- 失败文件：`packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`
- 失败用例：`runtime store: multi-instance isolation (same moduleId, different instanceId)`
- 失败位置：输出里指向 `:288`
- 核心断言：`expected 2 to be 1`

这说明：

- 目前 **current-head full matrix 不可直接刷新**
- 这属于**验证阻塞**，不是“下一刀”的候选本身
- 但它会影响“做完一刀后跑 full-matrix 收口”的能力

### 3. 回退到 targeted evidence

为了继续按 skill 的方法做识别，我只跑了三条当前仍在主线里的 targeted perf：

```bash
pnpm perf collect -- --profile quick --files test/browser/perf-boundaries/txn-lanes.test.tsx --out .codex/skills/logix-perf-cut-loop-workspace/iteration-1/eval-3/with_skill/tmp/txn-lanes.quick.json
pnpm perf collect -- --profile quick --files test/browser/watcher-browser-perf.test.tsx --out .codex/skills/logix-perf-cut-loop-workspace/iteration-1/eval-3/with_skill/tmp/watchers.quick.json
pnpm perf collect -- --profile quick --files test/browser/perf-boundaries/converge-steps.test.tsx --out .codex/skills/logix-perf-cut-loop-workspace/iteration-1/eval-3/with_skill/tmp/converge.quick.json
```

然后分别和最近已归档基线做了 triage diff：

```bash
pnpm perf diff:triage -- --before specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw120.watchers-direct-writeback.targeted.json --after .codex/skills/logix-perf-cut-loop-workspace/iteration-1/eval-3/with_skill/tmp/watchers.quick.json --out .codex/skills/logix-perf-cut-loop-workspace/iteration-1/eval-3/with_skill/tmp/watchers.vs.o2.triage.json
pnpm perf diff:triage -- --before specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw116.txn-lanes-click-anchored.targeted.json --after .codex/skills/logix-perf-cut-loop-workspace/iteration-1/eval-3/with_skill/tmp/txn-lanes.quick.json --out .codex/skills/logix-perf-cut-loop-workspace/iteration-1/eval-3/with_skill/tmp/txn-lanes.vs.p1.triage.json
pnpm perf diff:triage -- --before specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw119.converge-nearfull-slim-with-decision.targeted.json --after .codex/skills/logix-perf-cut-loop-workspace/iteration-1/eval-3/with_skill/tmp/converge.quick.json --out .codex/skills/logix-perf-cut-loop-workspace/iteration-1/eval-3/with_skill/tmp/converge.vs.q1.triage.json
```

### 4. 检查工作区污染情况

按只读方式检查了工作区状态：

```bash
git status --short
git diff --name-only -- packages/logix-core packages/logix-react docs/perf specs/103-effect-v4-forward-cutover/perf
```

发现一个与 perf 结论**直接相关**的 dirty 文件：

- `packages/logix-react/test/browser/watcher-browser-perf.test.tsx`

这会直接污染 `watchers` 线 current-head 证据的可信度。

## 四分法分类

### A. 真实运行时瓶颈

#### `txnLanes.urgentBacklog`

这是当前最干净、最值得继续打的一刀。

current-head targeted quick：

- `mode=default, steps=200`: `p95 = 57.9ms`
- `mode=default, steps=800`: `p95 = 53.3ms`
- `mode=default, steps=2000`: `p95 = 49.5ms`
- `mode=off, steps=200`: `p95 = 57.3ms`
- `mode=off, steps=800`: `p95 = 47.6ms`
- `mode=off, steps=2000`: `p95 = 52.0ms`

结论：

- `urgent.p95<=100ms` 已经全过
- `catchUp.p95<=200ms` / `<=500ms` 已经全过
- 真正剩余的是 `50ms` 档位的尾部残差
- 这和 `docs/perf/2026-03-06-p1-txn-lanes-click-anchored.md` 留下的判断一致：
  - 不是测量伪影了
  - 是真实 runtime 调度尾部还要继续压

这是标准的 skill 第 1 类：**真实运行时瓶颈**。

### B. 门禁表达错误 / 证据语义问题

#### `converge.txnCommit`

current-head targeted quick 表明：

- `commit.p95<=50ms` 全线没问题
- `auto<=full*1.05` 这条在 `Q-1` 后已回到门内
- 仍然有大量 `decision.p95<=0.5ms` 条目出现 `notApplicable`

这和 `docs/perf/2026-03-06-q1-converge-nearfull-slim-decision.md` 的结论一致：

- 当前 `converge` 剩余问题主要是 **gate / threshold 语义**
- 不是再打一刀 runtime 内核就能换来高收益

这是 skill 四分法里的第 3 类：**门禁表达错误**。

### C. 证据当前不可信，不能当下一刀主依据

#### `watchers.clickToPaint`

current-head targeted quick 乍看上去很吓人：

- `reactStrictMode=false` 下 `p95<=50ms` 从 `watchers=1` 就失败
- `reactStrictMode=true` 下也从 `watchers=1` 就失败
- 例如：
  - `strict=false, watchers=512: 60.7ms`
  - `strict=true, watchers=512: 65.6ms`

而归档的 `O-2` 基线里：

- `strict=true, watchers=512: 36.6ms`
- `strict=true` 的 `p95<=50ms` 当时是打穿到 `512` 的

这看起来像严重回退，但我**不会**直接把它判成“下一刀”。原因不是收益不大，而是：

- `packages/logix-react/test/browser/watcher-browser-perf.test.tsx` 当前是 dirty 文件
- 这条线的 benchmark 自身已处于未提交变更状态
- 按仓库并行开发安全约束，这属于需要先停下确认的情况

所以这条线目前只能归类为：

- **证据受污染 / 当前不可信**
- 在未确认 dirty 改动的语义前，不能把它当下一刀主依据

### D. 已知验证阻塞

#### `runtimeStore.noTearing` 功能回归

这不是“下一刀”本身，但它是后续实施必定会撞上的验证门：

- current-head full quick matrix 无法一次性刷新
- 后续就算真落一刀，也得先决定：
  - 是先修这个功能回归
  - 还是在 targeted evidence 路径里继续做 perf 迭代

## 下一刀排序

### 1. 第一名：继续打 `txnLanes`

理由完全符合 skill 的 cut ranking：

1. 它还在打 `P1` 主线门限。
2. 这不是 `notApplicable` / gate 噪声。
3. `click-anchored` 之后已经把测量伪影剥离掉了。
4. 失败集中在 runtime 调度真实路径，而不是 suite 自己测错对象。
5. 当前证据没有被 dirty benchmark 文件污染。

所以如果真按“一刀一提交”继续做，下一刀应该是：

- 只打 `txnLanes.urgentBacklog`
- 只瞄准 `mode=default, steps=200/800` 的 `urgent.p95<=50ms`
- 不要回头纠缠 `mode=off`
- 不要再碰 click timing 语义

### 2. 第二名：修 `converge` 的 gate 语义

但这不是 runtime 刀，更像证据/门禁刀：

- 把 `decision.p95<=0.5ms` 对 `full/dirty` 的 `notApplicable` 从“假失败”改成可解释状态
- 这会提升 matrix 可读性和 gate 可信度
- 但它不该排在 `txnLanes` 前面

### 3. 暂不进入：`watchers`

不是因为它不重要，而是因为：

- 当前 benchmark 文件 dirty
- 这条线现在的 current-head 数据不够干净
- 在没确认 dirty 改动归属前，继续沿它落刀不符合 skill 的“先分清真瓶颈还是证据伪影/污染”原则

## 是否需要 API 变动

当前结论：**不需要**。

理由：

- `txnLanes` 剩余问题仍像是 runtime 调度策略的尾部常数/切片税
- 还没到“必须动表面 API 才能换来明显收益”的阶段
- `converge` 当前剩余问题是 gate 语义，不是 API 受限
- `watchers` 线当前先要解决证据可信度

所以这次不应输出 API 变动提案。

## 如果这是一次真实实施轮，下一步应该怎么做

按 skill 的实施循环，正确顺序应该是：

1. 先确认 `watcher-browser-perf.test.tsx` 的 dirty 改动是否属于本轮基线。
2. 先决定 `runtimeStore.noTearing` 的功能回归是否要先修，否则 full-matrix 刷新会一直被挡住。
3. 真正落刀时，只打一刀：`txnLanes mode=default 200/800`。
4. 跑最贴边回归：
   - `pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts`
5. 跑 targeted perf：
   - `pnpm perf collect -- --profile quick --files test/browser/perf-boundaries/txn-lanes.test.tsx --out specs/103-effect-v4-forward-cutover/perf/<new-file>.json`
6. 回写：
   - `docs/perf/YYYY-MM-DD-<id>-<slug>.md`
   - `docs/perf/03-next-stage-major-cuts.md`
   - `docs/perf/05-forward-only-vnext-plan.md`
7. 单独提交。

但在本次评测约束下：

- 禁止改源码
- 禁止把探索/失败试探混进 commit
- 只能写评测工作区结果文件

所以我没有执行上述实施步骤。

## 这次评测对 skill 本身的判断

这次 `logix-perf-cut-loop` 的方法论是有效的，主要体现在三点：

1. 它强迫先补 current-head 证据，而不是继续吃旧文档结论。
2. 它让“真实 runtime 瓶颈 / gate 语义问题 / 验证阻塞 / 证据污染”被明确拆开，没有混着判断。
3. 它成功避免了一个很容易犯的错：
   - 看到 `watchers` current-head 数据很差，就直接冲进去继续打 `watchers`
   - 但实际这条线当前 benchmark 文件就是 dirty，直接落刀风险很高

所以在这次评测里，skill 带来的最有价值行为不是“直接找到一个最性感的瓶颈”，而是：

- **先把不可信的瓶颈排除掉**
- **把真正还能信的 P1 runtime 残差留出来**

## 本次产物

生成在评测工作区下的证据文件：

- `.codex/skills/logix-perf-cut-loop-workspace/iteration-1/eval-3/with_skill/tmp/txn-lanes.quick.json`
- `.codex/skills/logix-perf-cut-loop-workspace/iteration-1/eval-3/with_skill/tmp/watchers.quick.json`
- `.codex/skills/logix-perf-cut-loop-workspace/iteration-1/eval-3/with_skill/tmp/converge.quick.json`
- `.codex/skills/logix-perf-cut-loop-workspace/iteration-1/eval-3/with_skill/tmp/watchers.vs.o2.triage.json`
- `.codex/skills/logix-perf-cut-loop-workspace/iteration-1/eval-3/with_skill/tmp/txn-lanes.vs.p1.triage.json`
- `.codex/skills/logix-perf-cut-loop-workspace/iteration-1/eval-3/with_skill/tmp/converge.vs.q1.triage.json`

当前评测结论文件：

- `.codex/skills/logix-perf-cut-loop-workspace/iteration-1/eval-3/with_skill/outputs/result.md`
