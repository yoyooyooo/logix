# Inventory: Example Inventory

## Goal

把 `examples/logix/src` 现有样例按 `keep / adapt / archive` 先分桶，给 docs 与 verification 找稳定落点。

## Inventory

| Path | Category | Status | Docs Anchor | Notes |
| --- | --- | --- | --- | --- |
| `examples/logix/src/runtime/root.impl.ts` | `runtime` | `keep` | `docs/ssot/runtime/01-public-api-spine.md` | 作为 runtime root 入口示意 |
| `examples/logix/src/runtime/layer.ts` | `runtime` | `keep` | `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md` | 作为 layer / capability 侧入口 |
| `examples/logix/src/patterns/*.ts` | `pattern` | `keep` | `docs/ssot/runtime/07-standardized-scenario-patterns.md` | 现有 patterns 直接服务 scenario 复用 |
| `examples/logix/src/scenarios/trial-run-evidence.ts` | `scenario` | `keep` | `docs/ssot/runtime/09-verification-control-plane.md` | 最接近 verification 主线 |
| `examples/logix/src/scenarios/ir/reflectStaticIr.ts` | `scenario` | `keep` | `docs/ssot/runtime/06-form-field-kernel-boundary.md` | field-kernel expert 最小锚点 |
| `examples/logix/src/scenarios/customer-search-minimal.ts` | `scenario` | `adapt` | `docs/ssot/runtime/08-domain-packages.md` | 可转成 domain/example 双向锚点 |
| `examples/logix/src/features/customer-search/**` | `feature` | `keep` | `docs/ssot/runtime/08-domain-packages.md` | 作为 feature-first / domain 邻接例子 |
| `examples/logix/src/scenarios/*.ts` 其余大多数条目 | `scenario` | `adapt` | `docs/ssot/runtime/07-standardized-scenario-patterns.md` | 后续按标准场景模板继续收紧 |
| `examples/logix/src/verification/**` | `verification` | `keep` | `docs/ssot/runtime/09-verification-control-plane.md` | 新 verification 子树 |

## Keep / Adapt / Archive Rule

- `keep`：已经能直接表达主线语义
- `adapt`：保留现有代码，但要补 docs / verification 锚点
- `archive`：当前 inventory 未发现必须立即 archive 的样例
