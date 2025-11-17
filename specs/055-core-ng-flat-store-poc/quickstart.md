# Quickstart: 055 core-ng Flat Store PoC（怎么启动）

> 当前状态：`frozen`（仅当证据触发条件满足时解冻启动；默认路径不得被 PoC 污染）。

## 1) 我什么时候需要 055？

- 你已经在证据中确认 GC/alloc/长尾是主要瓶颈，且靠 TypedArray/bitset/零分配等 runtime 手段仍无法达标；
- 你希望尝试“flat memory（SoA/arena + handles）”路线，但愿意先从最小 PoC 试点开始，并严格要求可回退、可解释、可证据化。

## 2) 055 的验收方式是什么？

- `$logix-perf-evidence`：Node + Browser before/after/diff（必须 `comparable=true && regressions==0`）。
- 必须关注长尾（p95/p99）与 heap/alloc delta；若收益不足或引入长尾恶化，应停止并回退。

## 3) 下一步做什么？

- 试点已预选（仍保持 `frozen`）：`specs/055-core-ng-flat-store-poc/tasks.md` 的 Phase 2。
- 试点明确后：先把 `specs/046-core-ng-roadmap/spec-registry.json` 中 `055` 从 `frozen` 解冻为 `draft/implementing`，再进入 Phase 3/4，最后用 Phase 5 完成 Node+Browser 证据闭环。
