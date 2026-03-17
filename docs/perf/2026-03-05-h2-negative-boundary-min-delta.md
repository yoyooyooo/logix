# 2026-03-05 · H-2：negativeBoundaries.dirtyPattern 加 minDeltaMs（让 sub-ms 相对预算可执行）

问题：`negativeBoundaries.dirtyPattern` 的 `auto<=full*1.05` 在子毫秒场景里经常被 `0.1ms` 级计时量化/抖动放大，表现为 `maxLevel` 在 `8/64/512/4096` 档位之间“断崖式跳变”，导致：

- 证据不可复测（同机同 profile 多跑结果离散）。
- agent 无法判断是“真实回归”还是“计时噪声”。

对照：同类预算 `converge.txnCommit auto<=full*1.05` 已经配置了 `minDeltaMs: 0.1`（相对预算的绝对地板），避免在 sub-ms 下被噪声支配。

## 结论（可复现证据）

- 新矩阵口径下（`minDeltaMs=0.1`）两次 `profile=soak` 复测均稳定通过到 `uniquePatternPoolSize=4096`（所有 patternKind 的 `maxLevel=4096`）：
  - `specs/103-effect-v4-forward-cutover/perf/s2.after.local.soak.ulw87.h2-negative-boundary-minDelta.neg-only.clean.json`
  - `specs/103-effect-v4-forward-cutover/perf/s2.after.local.soak.ulw88.h2-negative-boundary-minDelta.neg-only.clean.json`

结论：这个 gate 现在是“可执行的硬门”（仍会在 delta 显著超过 0.1ms 时失败），不会再被 `0.1ms` 档位抖动主导。

## 改了什么（裁决）

文件：`.codex/skills/logix-perf-evidence/assets/matrix.json`

- `negativeBoundaries.dirtyPattern` 的预算 `auto<=full*1.05` 增加：
  - `minDeltaMs: 0.1`
- 语义（见 `packages/logix-react/test/browser/perf-boundaries/harness.ts` 的 relative budget 判定）：
  - 当 `ratio > maxRatio` 但 `deltaMs <= minDeltaMs` 时，视为“不可行动的差异”，不触发失败。

## 为什么这不是“降标准”

这里的标准从来都不是“5%”，而是“可行动的回归”。在 sub-ms 场景下：

- `5%` 对 `0.3ms` 只有 `0.015ms`，远低于浏览器/系统噪声与采样量化的稳定分辨率；
- 没有 absolute floor 就会把噪声当回归，导致 gate 不可用。

`minDeltaMs=0.1` 与 `converge.txnCommit` 对齐，是把 gate 从“仪器噪声报警器”修正为“真实回归报警器”。

