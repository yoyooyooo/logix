# 073 notes（工程笔记/可交接，非 SSoT）

## Scope

- 覆盖：073 Phase 3/4/5（TickScheduler + RuntimeStore + React cutover + Module-as-Source/DeclarativeLinkIR）关键结论、入口与下一步。
- 不覆盖：任何需求/契约/质量门裁决（以 `spec.md` / `plan.md` / `tasks.md` 为准）。

## Entry Points

- 入口索引见 `specs/073-logix-external-store-tick/notes/entrypoints.md`

## Current Status

- Phase 2/3：已落地（ExternalStoreTrait + TickScheduler/RuntimeStore + `trace:tick` + tests）
- Phase 4/5：已落地（React cutover + IR + browser 语义门禁）
- Phase 6：perf evidence 已产出（before/after/diff，见 `specs/073-logix-external-store-tick/perf/README.md`）；剩余 tasks.md 回勾 + 最终复验

## Current Hypothesis

- Root cause（tickSeq 不推进）：Env 捕获时机错误 —— module layer 初始化会 fork 长生命周期 fiber（txnQueue/logics），若此时 TickScheduler/RuntimeStore 尚未在 Env 中，这些 fiber 会永久缺失服务（serviceOption 永远 None），导致 `RuntimeStore.hasPending()`/`tickSeq` 永远不动。
- 修复点：AppRuntime 先 build `baseLayer` 得到 `baseEnv`（含 tick services），再在 `baseEnv` 下 build module layers，最终 `Context.merge(baseEnv,moduleEnv)` 作为 runtime Env。

## Next Actions

- 回勾 `specs/073-logix-external-store-tick/tasks.md` 未勾选项（T002/T030–T036/T034/T040–T045/T050–T053）。
- 跑一次 `pnpm typecheck:test` 作为最终交付复验。
- （可选）跑 `$speckit acceptance 073` 做 coded points 的“上帝视角”回归。

## Last Flush

- 2026-01-06
- 意图：补齐 perf evidence（A/B adapter before/after/diff）并回写 `plan.md#Perf Evidence Plan`，推进 tasks.md 收尾
  - 详情：`specs/073-logix-external-store-tick/notes/sessions/2026-01-06.md`
