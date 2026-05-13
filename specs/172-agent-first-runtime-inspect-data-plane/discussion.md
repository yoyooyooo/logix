# 172 Discussion

本文件只保存 172 仍未决或明确 deferred 的点。已裁决内容必须保存在 `spec.md`、`parity-matrix.md`、`plan.md`、`tasks.md`、`implementation-details/*` 或对应 owner SSoT。

## Deferred Open Questions

### Q172-012 - State path grammar beyond first wave

Status: Deferred future grammar extension.

Current rule:

- 172 first wave 只要求 owner-side 支持 `$root` 与 dot path。
- CLI 不能自己实现 path traversal。

Risk:

- Runtime state 可能包含 list/index/keyed collection、escaped dot、field path 与 value path 的混合语义。
- 如果一次性支持完整 path grammar，容易把 CLI path 语法变成第二套 field/value locator。

Reopen bar:

- 只有当 P0 E2E 证明 dot path 不足以定位真实业务 state 时，才扩展 path grammar；扩展前必须同步 `parity-matrix.md` 与 CLI schema。

### Q172-008 - React host selector/render evidence

Status: Deferred P2.

Current route:

- `logix live summary/events ...` may return `LiveInspectArtifact(section="react-host")` structured gap when the user requests host render/selector evidence.
- No 172 implementation task is allowed to fabricate selector/render truth from React UI state.

Future owner:

- React host evidence owner in `packages/logix-react`, backed by host debug events that can link selector/render identity to `txnSeq / opSeq / linkId`.

Reopen bar:

- Reopen only when React host event law can provide stable selector/render identity, transaction linkage, redaction policy and disabled-overhead proof.

### Q172-011 - Runtime profile summary closure

Status: Deferred P2.

Current route:

- Existing `logix live profile ...` grammar remains governed by 171/15.
- 172 does not require implementing local profile summary to close Runtime inspect data plane.
- If profile route is invoked before owner support exists, it must return bounded structured gap or degraded marker, not fake profile data.

Future owner:

- Local-only runtime profiler owner with explicit budget and disabled-overhead proof.

Reopen bar:

- Reopen only when local profiler summary has bounded collection cost, redaction policy, deterministic artifact shape and no disabled-path overhead regression.
