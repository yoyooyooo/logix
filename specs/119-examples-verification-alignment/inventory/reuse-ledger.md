# Inventory: Reuse Ledger

## Reuse Candidates

| Path | Reason | Reuse Mode |
| --- | --- | --- |
| `examples/logix/src/patterns/notification.ts` | 已是标准 pattern，容易映射到 verification | `keep` |
| `examples/logix/src/patterns/optimistic-toggle.ts` | 可直接服务场景与 verification | `keep` |
| `examples/logix/src/patterns/fields-reuse.ts` | 可作为 pattern reuse 审计输入 | `keep` |
| `examples/logix/src/scenarios/trial-run-evidence.ts` | 已最接近 `runtime.trial` 主线语义 | `keep` |
| `examples/logix/src/scenarios/expert-process-app-scope.ts` | 可映射到 subtree process 场景 | `adapt` |
| `examples/logix/src/scenarios/customer-search-minimal.ts` | 可映射到 domain / scenario-owned docs | `adapt` |
| `examples/logix/src/features/customer-search/**` | 现有 feature-first 结构可直接保留 | `keep` |

## Rule

- `keep` 的样例直接作为 anchor 或 verification 输入
- `adapt` 的样例保留代码，但要补 docs / verification 映射
