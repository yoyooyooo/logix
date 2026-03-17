# 2026-03-19 · identify react controlplane / boot resolve（read-only）

## 结论类型

- `docs/evidence-only`
- `future-cut identification`

## 输入边界

- 本文仅基于既有证据做识别，不做实现。
- 重点参考：
  - `docs/perf/2026-03-15-v4-perf-next-cut-candidates.md`
  - `docs/perf/archive/2026-03/2026-03-17-p1-6-boot-config-owner-conflict.md`
  - `docs/perf/archive/2026-03/2026-03-17-v4-perf-next-cut-identification-p1-4-vs-p1-6-vs-p1-7.md`
  - `docs/perf/archive/2026-03/2026-03-15-r2-react-cache-identity-decouple.md`
  - `docs/perf/archive/2026-03/2026-03-15-r3-react-controlplane-neutral-config-singleflight-failed.md`
  - `docs/perf/archive/2026-03/2026-03-18-s1-threshold-modeling.md`
  - `docs/perf/archive/2026-03/2026-03-18-form-threshold-modeling.md`

## 2026-03-20 更新

- `P1-6'` 的最小 sync-ready controlplane gate 已吸收到母线。
- `phase-machine` 的 Stage A/B/C/D/E/F 已吸收到母线。
- Stage G 的 `G1 owner-lane registry adapter` 已完成实施并 `accepted_with_evidence`。
- Stage G 的 `G2 cancel boundary isomorphic merge` 已完成实施并 `accepted_with_evidence`。
- Stage G 的 `G3 owner-lane phase contract normalization` 已形成 implementation-ready 切口，当前保持 docs/evidence-only 待触发。
- 对应实现与验证见：
  - `docs/perf/archive/2026-03/2026-03-19-p1-6-owner-phase-rebuild.md`
  - `docs/perf/archive/2026-03/2026-03-20-react-controlplane-phase-machine-stage-b.md`
  - `docs/perf/archive/2026-03/2026-03-20-react-controlplane-phase-machine-stage-c.md`
  - `docs/perf/archive/2026-03/2026-03-20-react-controlplane-phase-machine-stage-d.md`
  - `docs/perf/archive/2026-03/2026-03-20-react-controlplane-phase-machine-stage-e.md`
  - `docs/perf/archive/2026-03/2026-03-20-react-controlplane-phase-machine-stage-f.md`
  - `docs/perf/archive/2026-03/2026-03-20-react-controlplane-phase-machine-stage-g-design.md`
  - `docs/perf/archive/2026-03/2026-03-20-react-controlplane-phase-machine-stage-g1-owner-lane-registry-adapter.md`
  - `docs/perf/archive/2026-03/2026-03-20-react-controlplane-phase-machine-stage-g2-cancel-boundary-isomorphic.md`
  - `docs/perf/archive/2026-03/2026-03-20-react-controlplane-phase-machine-stage-g3-owner-lane-phase-contract.md`
- 当前顶层总设计包仍为：
  - `docs/perf/2026-03-20-react-controlplane-phase-machine.md`
- 本文保留为“更大控制面升级是否还值得继续”的 active 识别页。

## 这个角度下的 Top2 候选

### Top1 · `P1-6'` boot resolve owner 边界重建（owner-aware resolve engine）

定义：
- 以 owner 语义重建 React resolve control plane 的最小核心，把 `read / readSync / warmSync / preload` 的 owner 判定与 config 刷新统一到同一套状态机。
- 目标是同时满足两条硬约束：
  1. config-bearing async layer 的首个 ready render 正确性
  2. 同一 owner/phase 的 async config load 去重能力

正面收益：
- 直接命中 `P1-6 owner conflict` 已暴露的主冲突点，避免在 `RuntimeProvider effect` 上继续叠条件分支。
- 能把 R3 里“neutral settle 触发重复 async snapshot”与 P1-6 里“首屏 ready 正确性”归到同一 owner 模型里裁决，减少后续补丁型回归。
- 为后续 `P1-7` 的 Provider 单飞提供稳定前提，降低后续 cut 的耦合成本。

反面风险：
- 状态机重排范围较大，容易触发 suspend/defer/preload 的边界回归。
- 若 owner 边界设计过粗，仍可能复现“单飞成立但首屏配置失真”。
- 测试矩阵会扩大，短期交付节奏受影响。

API 变动可能性：
- `中到高`。公开 API 未必必须调整，Provider 配置契约与可观察行为存在变化概率，可能需要 forward-only 迁移说明。

### Top2 · `P1-7'` Provider 单飞控制面显式化（neutral lane 与 config lane 分轨）

定义：
- 在已完成 `cache identity decouple` 基础上，补齐 Provider 单飞控制面。
- 把“config-bearing 变更”和“neutral binding settle”分轨处理，建立 provider-local singleflight owner token，控制何时允许复用 snapshot。

正面收益：
- 对当前 React boot churn 直接有效，落点集中在 `RuntimeProvider + ModuleCache`，改造面小于全面重排 resolve engine。
- 与 R2 的既有收益连续，可减少重复 config snapshot load 与 render/effect 双探测。
- 有机会在不触碰大量 runtime core 代码的前提下拿到一段可见 wall-clock 改善。

反面风险：
- 若 owner token 与 readiness 状态未统一，容易重演 R3 的失败形态。
- 分轨规则增多后，`RuntimeProvider` 维护复杂度继续上升。
- 可能出现“局部指标改善，整体 boot phase 抖动不降”的结果。

API 变动可能性：
- `低到中`。优先走内部重构，若需要稳定暴露 owner/phase 语义，才会触及公开约定。

## 下一线建议（G2 后，含 G3 设计包）

当前不建议回到历史小切口；本轮完成 G2 后先回到 docs/evidence-only 观察。

理由：
1. 最小 sync-ready gate 与 Stage A/B/C/D/E/F/G1 已吸收，当前“小步快修”阶段已收口。
2. `G1/G2` 已把三 lane 的 registry/cancel/readiness 与 cancel boundary 同构到同一 owner 口径，旧式小修没有新增收益面。
3. `G3` 已把“还能继续统一哪一层”收敛到 phase contract 归约层，触发器未满足前维持 docs/evidence-only 更稳妥。

## 为何比继续追 owner-conflict 小切口更值

- 小切口目标定义当前互相挤压，证据已显示“修正首屏 ready 正确性”会推高 boot trace 次数，继续在同一切口内调参难以收口。
- owner 边界先统一后，singleflight 可以在更清晰的 owner/phase 维度上落地，验证口径更稳定，回归风险更可控。
- 这条线可作为 React control plane 的结构性清债，后续 `P1-7` 与 preload 相关 cut 会共享同一裁决基础。

## 最小验证命令

```bash
python3 fabfile.py probe_next_blocker --json
```

## 开线建议

- 当前建议：`不开新的小切口`
- 若后续继续，只建议两种形态：
  1. 以 `docs/evidence-only` 继续观察 Stage E 后的稳定性与噪声边界
  2. 进入 `G3 owner-lane phase contract normalization`（触发器成立后再开，实现范围仍限定 `RuntimeProvider + phase-trace test`）
