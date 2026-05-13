# Inventory: Anchor Map

## Docs -> Example -> Verification

| Docs Path | Example Path | Verification Path | Notes |
| --- | --- | --- | --- |
| `docs/ssot/runtime/07-standardized-scenario-patterns.md` | `examples/logix/src/scenarios/expert-process-app-scope.ts` | `examples/logix/src/verification/index.ts` | 标准场景的统一 verification 入口 |
| `docs/ssot/runtime/07-standardized-scenario-patterns.md` | `examples/logix/src/patterns/notification.ts` | `examples/logix/src/verification/index.ts` | pattern 与 scenario 共用 verification 模板 |
| `docs/ssot/runtime/09-verification-control-plane.md` | `examples/logix/src/scenarios/trial-run-evidence.ts` | `examples/logix/src/verification/README.md` | verification 主线样例 |
| `docs/ssot/runtime/06-form-field-kernel-boundary.md` | `examples/logix/src/scenarios/ir/reflectStaticIr.ts` | `examples/logix/src/verification/README.md` | field-kernel expert -> verification 输入协议 |
| `docs/ssot/runtime/08-domain-packages.md` | `examples/logix/src/features/customer-search/index.ts` | `examples/logix/src/verification/index.ts` | domain / scenario-owned 邻接映射 |

## Current Rule

- docs 页面必须先落到一个主线 example
- verification 不直接替代 example，只承接可验证入口
