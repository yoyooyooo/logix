---
title: Toolkit Form Meta Derivation
status: superseded
owner: toolkit-form-meta-derived-view
target-candidates:
  - docs/ssot/runtime/10-react-host-projection-boundary.md
  - docs/ssot/runtime/11-toolkit-layer.md
  - docs/ssot/runtime/12-toolkit-candidate-intake.md
  - docs/internal/toolkit-candidate-ledger.md
  - specs/148-toolkit-form-meta-derivation/spec.md
last-updated: 2026-04-18
---

# Toolkit Form Meta Derivation

## superseded status

这份 proposal 记录的是一轮中间判断。

当时的 placement 结论是：

- 把 `form meta derivation` 视为 toolkit 候选

最新 live 口径已经改判为：

- 围绕 `rawFormMeta()` 的轻量、严格、一跳派生优先回 core
- 在 exact surface 尚未开口前，它属于 `core-gap`
- 它不再计入 toolkit first-wave

当前应以这些 live 页面为准：

- [../ssot/runtime/10-react-host-projection-boundary.md](../ssot/runtime/10-react-host-projection-boundary.md)
- [../ssot/runtime/11-toolkit-layer.md](../ssot/runtime/11-toolkit-layer.md)
- [../ssot/runtime/12-toolkit-candidate-intake.md](../ssot/runtime/12-toolkit-candidate-intake.md)
- [../internal/toolkit-candidate-ledger.md](../internal/toolkit-candidate-ledger.md)
- [/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/148-toolkit-form-meta-derivation/spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/148-toolkit-form-meta-derivation/spec.md)

## retained narrowing

placement 虽然已经改判，这份 proposal 仍对应着一组被保留下来的 candidate-local 收窄结果。
这些结果的当前 owner 已经切到：

- [/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/148-toolkit-form-meta-derivation/spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/148-toolkit-form-meta-derivation/spec.md)

本页不再重复持有 derived schema、forbidden set 与 de-sugared mapping 正文。

## 当前一句话结论

这份 proposal 现在只保留为一次中间收敛快照；它留下的有效结果是“如何收窄合法派生”，当前 placement 则统一以 core-gap 口径为准。
