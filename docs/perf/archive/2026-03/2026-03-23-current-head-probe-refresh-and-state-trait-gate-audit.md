# 2026-03-23 · current-head probe refresh + StateTrait single-field gate audit（docs/evidence-only）

## 结论类型

- `docs/evidence-only`
- `accepted_with_evidence=false`
- 本轮不保留代码改动

## 背景

`2026-03-23 post-fanout re-identify` 与 `SW-N2 gate comparability scout` 已把盘面收缩到一个很窄的问题：

1. current-head 仍没有新的 hard blocker
2. `SW-N2` 唯一阻塞点是 `packages/logix-core test` 里的单个 perf suite
3. 需要补一轮更贴边的 current-head probe refresh 和 isolated replay，确认这扇门当前更像稳定回归还是 full-suite 负载噪声

## 当前证据

### 1. current-head probe refresh

- `python3 fabfile.py probe_next_blocker --json`
- 结果：`status=clear`
- 三条 probe suite 全部通过
- 当前没有 `threshold_anomalies`
- `externalStore.ingest.tickNotify / full/off<=1.25` 本轮也没有新的 soft-watch 触发

工件：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-23-current-head-probe-refresh.probe-next-blocker.json`

### 2. StateTrait single-field isolated replay

- 命令：
  - `pnpm -C packages/logix-core exec vitest run test/internal/StateTrait/StateTrait.ExternalStoreTrait.SingleFieldFastPath.Perf.off.test.ts`
- 独立复跑 5 轮：
  - `5 pass + 0 fail`

关键区间：

- `single-shallow ratio`：`0.673 ~ 0.719`
- `single-deep ratio`：`0.607 ~ 0.939`
- `multi-8 ratio`：`0.968 ~ 1.008`
- `multi-64 ratio`：`0.940 ~ 1.007`

对照历史 accepted 基线：

- `2026-03-19 p1-1.1-fieldpathid`
  - `multi-8 ratio = 1.0039`
- `2026-03-20 p1-1.2-fieldpathid-extended`
  - `multi-8 ratio = 0.9820`

本轮 isolated replay 的 `multi-8` 区间没有再越过 `1.08` 门，且 single-field 正收益继续稳定。

工件：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-23-state-trait-single-field-gate-audit.evidence.json`

## 四分法裁决

### 1. 真实运行时瓶颈

当前没有新的默认 runtime 主线。  
本轮 `probe_next_blocker` 继续是 `clear`，没有新的 hard blocker，也没有新的 current-head 第一失败项。

### 2. 证据语义错误 / benchmark 噪声

`SW-N2` 现在更像 **full-suite 负载敏感的 perf gate 噪声**。  
前一轮 comparability scout 曾出现 isolated `4 pass + 1 fail`，但本轮再做 5 轮 isolated replay 已恢复到 `5 pass + 0 fail`，说明该门当前没有形成稳定、可归因的结构回归形态。

### 3. 门禁 / tooling 注意项

- `StateTrait.ExternalStoreTrait.SingleFieldFastPath.Perf.off`
  - 目前更像临界门，而不是新的实现线触发器
  - 若后续 full-suite 再次失败，应优先复核 `multi-8<=1.08` 的采样稳定性与 full-suite 负载干扰，再决定是否开 gate-only audit
- `SW-N2`
  - 继续保留 watchlist
  - 当前不开实现线

### 4. 已解决 / 已清空项

- `current-head probe refresh` 已再次确认 `status=clear`
- `StateTrait single-field` isolated replay 当前已确认没有稳定越门样本

## 当前瓶颈排行

1. `R-2`
   - 潜在收益仍高
   - 当前仍缺外部 `SLA-R2`
2. `SW-N2`
   - 当前只保留 watchlist
   - 触发条件已收紧为“full-suite 同门再次复发，且 isolated replay 也能稳定复现”
3. `P1-3R`
   - trigger 不成立
4. `P2-1`
   - trigger 不成立

## 建议下一刀

当前没有新的默认实现线。  
本轮之后也不建议继续开 `SW-N2` 实现线。

如果继续，只允许两类后续动作：

1. `R-2` 获得外部 `SLA-R2` 输入后，按既有 proposal 路由进入 API 线
2. `StateTrait.ExternalStoreTrait.SingleFieldFastPath.Perf.off` 在 full-suite 中再次稳定复发后，再开更窄的 `gate-only / sampling audit` 线

## API 变动判断

- 当前不需要新的 API 变动
- `R-2` 继续维持原判
