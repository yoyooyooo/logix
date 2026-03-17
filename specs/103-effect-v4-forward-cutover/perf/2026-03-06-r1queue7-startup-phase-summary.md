# 2026-03-06 · r1queue7 startup phase quick summary

## Verdict

- `R-1` 仍未收口。
- 这次显式 startup-phase 方案在 3/3 quick audit 下比接手时的 candidate baseline 更差。
- 该方案不进入 runtime commit；只保留 evidence。

## Baseline

- `s2.before.local.quick.r1queue6.txn-lanes-startup-cap.targeted.json`
- `default 200/800/2000`: `53.5 / 51.4 / 47.9 ms`
- `off 200`: `54.0 ms`

## After

- `s2.after.local.quick.r1queue7.run1.txn-lanes-startup-phase.targeted.json`
  - `default 200/800/2000`: `72.7 / 54.4 / 59.1 ms`
  - `off 200`: `51.9 ms`
- `s2.after.local.quick.r1queue7.run2.txn-lanes-startup-phase.targeted.json`
  - `default 200/800/2000`: `60.9 / 61.0 / 57.8 ms`
  - `off 200`: `50.4 ms`
- `s2.after.local.quick.r1queue7.run3.txn-lanes-startup-phase.targeted.json`
  - `default 200/800/2000`: `60.8 / 61.3 / 55.9 ms`
  - `off 200`: `51.1 ms`

## Diff

- `s2.diff.local.quick.r1queue7.run1.txn-lanes-startup-phase.strict.targeted.json`
- `s2.diff.local.quick.r1queue7.run2.txn-lanes-startup-phase.strict.targeted.json`
- `s2.diff.local.quick.r1queue7.run3.txn-lanes-startup-phase.strict.targeted.json`

## Takeaway

- startup cap 一旦真的生效，就会把 `default` 三档整体抬高。
- 这说明当前 `R-1` 还不能把 startup-phase 写成正式 policy；下一轮仍应回到 `txnQueue snapshot -> urgent-aware handoff` 的更窄切面。
