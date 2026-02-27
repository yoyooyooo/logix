# Contract: Policy Cache Semantics (O-024)

## Core Semantics

- capture 阶段必须预计算并缓存 `ResolvedTxnLanePolicy`（单一缓存来源）。
- deferred flush 热路径只读 capture 缓存，不允许再次执行多层 merge。
- override 仅在 capture/re-capture 生效；运行中临时注入不会即时覆盖当前执行中的缓存策略。

## Invariants

- `captureSeq` 必须单调递增（初次 capture=1，后续 re-capture 递增）。
- 缓存来源链必须可追踪（builtin/runtime_default/runtime_module/provider）。
- 缓存失效仅由 re-capture 触发，且必须可诊断。
