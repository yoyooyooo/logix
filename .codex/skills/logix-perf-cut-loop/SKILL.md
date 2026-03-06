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
3. 当前 perf 事实源：
   - `docs/perf/03-next-stage-major-cuts.md`
   - `docs/perf/05-forward-only-vnext-plan.md`
   - `docs/perf/README.md`
   - 当前 spec 的 `specs/<id>/perf/*.json`

如果当前 head 没有可信的新证据，先补一份 current-head quick matrix，再决定下一刀。

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

输出必须遵守：

- 一次只做一刀
- 做完必须跑验证
- 回写 `docs/perf`
- 单独提交

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
- 如果 2 分钟内还在扩散阅读范围，说明方向错了，应回到 current-head 证据重新裁剪。

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
5. 回写 `docs/perf/YYYY-MM-DD-<id>-<slug>.md`
6. 更新 `docs/perf/03-next-stage-major-cuts.md` 和 `docs/perf/05-forward-only-vnext-plan.md`
7. 单独提交

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
- `当前还剩什么`

## 10) 深入阅读

- `references/bottleneck-classifier.md`
- `references/cut-ranking.md`
- `references/implementation-loop.md`
- `references/pattern-catalog.md`
