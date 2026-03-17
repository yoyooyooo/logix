# 2026-03-23 · react controlplane full phase-machine nextcut scout（docs/evidence-only）

## 结论类型

- `docs/evidence-only`
- `implementation-ready identification`
- `accepted_with_evidence=false`
- 本轮不保留代码改动

## 背景

`2026-03-23` 当前盘面已经收缩到以下事实：

1. current-head `probe_next_blocker --json` 继续 `status=clear`
2. `SW-N2` 已被进一步收紧为 full-suite perf gate 噪声 watch gate
3. `R-2` 仍缺外部 `SLA-R2` 实值输入
4. react controlplane 方向里，`G5`、`G6`、`P1-6''` 都已 `accepted_with_evidence`

在这个前提下，仓内仍具识别价值的内部方向只剩一个：

- 更大的 `react controlplane phase-machine`

## 当前证据

### 1. current-head 继续 clear

- `specs/103-effect-v4-forward-cutover/perf/2026-03-23-current-head-probe-refresh.probe-next-blocker.json`
- 当前结论：
  - `status=clear`
  - 无新的 `hard blocker`

### 2. 现有微切口已基本吃完

已完成并 `accepted_with_evidence` 的 controlplane 结构切口：

- `docs/perf/2026-03-21-react-controlplane-phase-machine-stage-g5-kernel-v0-evidence.md`
- `docs/perf/2026-03-22-react-controlplane-stage-g6-kernel-v1.md`
- `docs/perf/archive/2026-03/2026-03-23-p1-6pp-owner-resolve-engine-impl.md`

这三条已经把：

- owner ticket 规则
- config snapshot confirm 去重
- 四入口 owner resolve 合同

压到了可测、可解释的最小内核层。

### 3. 更大的 phase-machine 仍停在“开线前 trigger package 不完整”

`docs/perf/2026-03-20-react-controlplane-phase-machine.md` 仍明确保留：

- 完整 controlplane 重建的触发条件
- 进入实施线前必须补齐的入场清单

当前仍缺的不是新的实现微切口，而是以下 trigger package：

1. 最小状态机定义与状态图
2. 针对完整 owner/phase 重建的集成测试锚点
3. 对应 perf anchor bundle
4. 明确的迁移阶段与回滚门

## 四分法裁决

### 1. 真实瓶颈

当前仓内仍有真实的 **controlplane 结构税**，但它已经不再表现为单个 implementation-ready 微切口。

剩余问题更像：

- `Provider` 单飞控制面显式化
- `preload` 与 `ready` 的共享调度
- implicit rule 继续阻塞更大的 owner/phase 收敛

这与 `docs/perf/2026-03-20-react-controlplane-phase-machine.md` 中“启动完整 controlplane 重建的触发条件”一致。

### 2. 证据伪影

`probe_next_blocker` 的默认三套件不锚定 `RuntimeProvider bootresolve` 的完整 owner/phase 状态机问题。  
因此这条线不能靠默认 probe 排序，只能靠 docs-only trigger package 先把入场条件补齐。

### 3. 门禁噪声

- `SW-N2` 当前仍是 watch gate
- `externalStore.ingest.tickNotify / full/off<=1.25` 当前仍在 soft watch

这两类都不应驱动 full phase-machine 重建。

### 4. 已解决 / 已清空项

以下 controlplane 微切口已不再作为下一刀来源：

- `G5 controlplane kernel v0`
- `G6 controlplane kernel v1`
- `P1-6'' owner-aware resolve engine`

## 当前瓶颈排行

1. `react controlplane full phase-machine`
   - 当前仍是唯一值得继续识别的仓内结构方向
   - 但只适合先做 docs-only trigger package
2. `R-2 / R2-U PolicyPlan contract reorder`
   - 潜在收益高
   - 当前卡在外部 `SLA-R2`
3. `SW-N2`
   - 继续只保留 watch gate
4. `P1-3R`
   - trigger 不成立
5. `P2-1`
   - trigger 不成立

## 唯一建议下一刀

唯一建议下一刀为：

- `react controlplane full phase-machine trigger package`

线类型：

- `docs-only scout`

唯一目标：

1. 补齐完整 owner/phase 重建的最小状态机定义与状态图
2. 补齐迁移阶段与回滚门，至少把 Stage A/B 的入场条件写成可验收门
3. 补齐 perf/diagnostics anchor bundle，明确后续实现线的收益归因面
4. 明确与 `R-2` 的边界，保证不把内部控制面重建和 public policy surface 混线

## 为什么现在先做它

1. 它不依赖外部 `SLA-R2`
2. 它不要求继续假装 `SW-N2` 是实现 ready
3. 它正好对应 `2026-03-20-react-controlplane-phase-machine.md` 中尚未补齐的实施前入场清单
4. 若不先补这套 package，后续“大 controlplane 重建”仍会停留在口号层，无法进入下一轮 `implementation-ready` 裁决

## 当前不开实现线的原因

当前还不满足完整重建的 implementation-ready 条件：

1. 缺最小状态机定义与状态图
2. 缺完整迁移阶段门
3. 缺专门面向 full phase-machine 的 perf anchor bundle
4. 默认 probe clear，当前没有新的 hard blocker 可以直接驱动实现线

## API 变动判断

- 当前不需要 API 变动
- 若后续 trigger package 证明必须引入对外 policy surface，再单独转入 `R-2`
