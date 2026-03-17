# 2026-03-23 · post-fanout re-identify（docs/evidence-only）

## 结论类型

- `docs/evidence-only`
- `accepted_with_evidence=false`
- 本轮不保留代码改动

## 背景

截至本轮开始，已知的 implementation-ready 高收益方向已全部在独立 worktree 中完成收口：

- `P1-6''`
- `P1-4F`
- `SW-N3 evidence closeout`
- `N-3`

因此本轮按 perf 机制切回识别模式，目标是判断：

1. 当前是否还存在新的 ready 实施线
2. 剩余 watchlist 是否有哪条已经满足重开条件
3. 哪些属于真实瓶颈，哪些只是 gate / 测量噪声

## 当前证据

- current-head `probe_next_blocker --json`：`status=clear`
- 仍保留 soft watch：
  - `externalStore.ingest.tickNotify / full-off<=1.25 / first_fail_level=128`
- `pnpm -C packages/logix-core test`：仍非全绿
  - 当前唯一失败：`test/internal/StateTrait/StateTrait.ExternalStoreTrait.SingleFieldFastPath.Perf.off.test.ts`
- 同一 failing suite 的独立单跑：
  - `pnpm -C packages/logix-core exec vitest run test/internal/StateTrait/StateTrait.ExternalStoreTrait.SingleFieldFastPath.Perf.off.test.ts`
  - 单独运行通过，`single-shallow ratio=0.713`、`single-deep ratio=0.912`

证据工件：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-23-post-fanout-identify.probe-next-blocker.json`

## 四分法裁决

### 1. 真实运行时瓶颈

当前没有新的默认 runtime 主线。  
`probe_next_blocker` 继续是 `clear`，没有新的 hard blocker。

### 2. 证据语义错误 / benchmark 噪声

`SW-N2` 当前被 `packages/logix-core test` 的单个 perf 用例挡住，但该用例在独立单跑时通过。  
因此更像 **full-suite 负载下的测量噪声或门禁口径问题**，当前不足以直接推出新的 runtime 实现线。

### 3. 门禁 / tooling 注意项

- `SW-N2`
  - 硬门仍是 `packages/logix-core test` 全绿
  - 当前这扇门没有打开
  - 但最新失败样本没有直接证明 `SW-N2` 本身存在稳定性能回归
- `P1-3R`
  - trigger 仍不成立
- `P2-1`
  - trigger 仍不成立
- `R-2`
  - 仍缺外部 `SLA-R2` 输入

### 4. 已解决 / 已清空项

- `P1-6''`
- `P1-4F`
- `SW-N3`
- `N-3`

上述四条已从“ready to consume”盘面移出。

## 当前瓶颈排行

1. `SW-N2`
   - 当前不是实现 ready，阻塞在 correctness gate
   - 最新失败样本更像 full-suite perf gate 噪声
2. `R-2`
   - 仍有潜在高收益
   - 当前外部 trigger 缺失，不能实施
3. `P1-3R`
   - 触发门未成立
4. `P2-1`
   - 触发门未成立

## 建议下一刀

当前没有新的默认实现线。  
如果继续，只建议开 **docs-only scout**，唯一合理方向是：

- `SW-N2 gate comparability scout`
  - 目标：把 `packages/logix-core test` 中 `StateTrait.ExternalStoreTrait.SingleFieldFastPath.Perf.off` 的 full-suite 失败，判清是稳定回归还是套件负载噪声
  - 在没有这个结论前，不应直接重开 `SW-N2` 实施线

## API 变动判断

- 当前不需要 API 变动
- `R-2` 仍维持原判：只有外部 `SLA-R2` 到位后才进入 API 线
