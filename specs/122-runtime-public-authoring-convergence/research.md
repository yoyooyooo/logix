# Research: Runtime Public Authoring Convergence

## Decision 1: 用三账本解释公开收敛

- public surface ledger
- expert surface ledger
- legacy exit ledger

## Decision 2: `01 / 03 / 05` 合并为一个第二波 owner

- 公开主链、canonical authoring、logic composition 在实现上高度耦合
- 分开建 second-wave spec 会重复裁决

## Decision 3: 公开口径必须覆盖 docs、examples、exports、generators

- 只改 docs 不足以收敛作者决策分叉

## Decision 4: 本轮先收 SSoT 与 canonical 内核 examples

- `apps/docs/**` 先不纳入 `122` 的实现阻塞面
- 这一轮先压实内核、canonical examples、公开导出与 SSoT
- 对外用户文档暂记 deferred，等待内核进一步稳定
